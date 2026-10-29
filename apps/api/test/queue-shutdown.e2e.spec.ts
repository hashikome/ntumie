import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { connect, createServer, type Socket } from "node:net";
import Redis from "ioredis";
import { type EmailDelivery, startEmailQueue } from "../src/email/delivery";
import {
  type LinkMetadataLookup,
  startLinkMetadataQueue,
} from "../src/modules/resources/link-metadata-lookup";

const factories = {
  email: (url: string, prefix: string, onRedisOutage?: () => void) =>
    startEmailQueue(
      {
        maintain: async () => {},
        prisma: { emailOutbox: { findMany: async () => [] } },
      } as unknown as EmailDelivery,
      url,
      prefix,
      { onRedisOutage },
    ),
  metadata: (url: string, prefix: string, onRedisOutage?: () => void) =>
    startLinkMetadataQueue(
      { prisma: { linkMetadata: { findMany: async () => [] } } } as unknown as LinkMetadataLookup,
      url,
      prefix,
      { onRedisOutage },
    ),
};

// No unbounded retries: a Redis that stays unreachable past the limit ends the
// worker (the handler stops it with exit 1) instead of reconnecting forever.
for (const [name, start] of Object.entries(factories)) {
  it(`${name} reports a sustained Redis outage once`, async () => {
    const configured = process.env.REDIS_OUTAGE_LIMIT_MS;
    process.env.REDIS_OUTAGE_LIMIT_MS = "300";
    // Nothing listens here: every connection attempt is refused.
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const address = closed.address();
    if (!address || typeof address === "string") throw new Error("Missing fixture port");
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    let outages = 0;
    const runtime = start(
      `redis://127.0.0.1:${address.port}`,
      `test-outage-${randomUUID()}`,
      () => {
        outages++;
      },
    );
    try {
      for (let i = 0; i < 60 && !outages; i++) await Bun.sleep(100);
      expect(outages).toBe(1);
      await Bun.sleep(1500);
      expect(outages).toBe(1);
    } finally {
      if (configured === undefined) delete process.env.REDIS_OUTAGE_LIMIT_MS;
      else process.env.REDIS_OUTAGE_LIMIT_MS = configured;
      await runtime.close();
    }
  }, 15000);
}

for (const [name, start] of Object.entries(factories)) {
  for (const initiallyOffline of [false, true]) {
    it(`${name} closes while Redis ${initiallyOffline ? "has never connected" : "is reconnecting"}`, async () => {
      const upstream = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6383");
      const sockets = new Set<Socket>();
      let offline = initiallyOffline;
      const proxy = createServer((socket) => {
        socket.on("error", () => {});
        if (offline) return socket.destroy();
        const remote = connect(Number(upstream.port || 6379), upstream.hostname);
        remote.on("error", () => socket.destroy());
        sockets.add(socket);
        sockets.add(remote);
        socket.pipe(remote).pipe(socket);
        socket.on("close", () => {
          remote.destroy();
          sockets.delete(socket);
          sockets.delete(remote);
        });
      });
      await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
      const address = proxy.address();
      if (!address || typeof address === "string") throw new Error("Missing fixture port");
      const url = new URL(upstream);
      url.hostname = "127.0.0.1";
      url.port = String(address.port);
      const prefix = `test-shutdown-${randomUUID()}`;
      const runtime = start(url.toString(), prefix);
      try {
        if (!initiallyOffline) {
          await runtime.queue.waitUntilReady();
          const client = await runtime.queue.getBackend().client;
          await runtime.worker.waitUntilReady();
          offline = true;
          for (const socket of sockets) socket.destroy();
          // Observe the actual reconnect interval, not a timing guess.
          for (let i = 0; i < 200 && client.status !== "reconnecting"; i++) await Bun.sleep(5);
          expect(client.status).toBe("reconnecting");
        }
        const started = performance.now();
        await runtime.close();
        expect(performance.now() - started).toBeLessThan(2000);
        expect(runtime.worker.closing).toBeDefined();
        expect(runtime.queue.closing).toBeDefined();
      } finally {
        await runtime.close();
        for (const socket of sockets) socket.destroy();
        await new Promise<void>((resolve) => proxy.close(() => resolve()));
        // Remove only this fixture's opaque queue keys on the test Redis.
        const cleanup = new Redis(upstream.toString());
        try {
          const keys = await cleanup.keys(`${prefix}:*`);
          if (keys.length) await cleanup.del(...keys);
        } finally {
          cleanup.disconnect();
        }
      }
    }, 10000);
  }
}
