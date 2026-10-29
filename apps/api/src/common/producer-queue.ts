import { Queue } from "bullmq";

/** Worker-owned producer: disconnect without waiting for Redis readiness/end. */
export class ProducerQueue extends Queue {
  override async disconnect() {
    // BullMQ's normal disconnect awaits initial readiness and then an `end`
    // event. During ioredis reconnect backoff that event may never arrive.
    // Forced closure also cancels an unfinished initial connection.
    await this.getBackend().close(true);
  }
}

// How long Redis may stay unreachable before the worker gives up. A sustained
// outage ends the process (exit 1) instead of reconnecting forever; the stack's
// capped restart policy decides whether to try again.
export function redisOutageLimitMs(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number(env.REDIS_OUTAGE_LIMIT_MS);
  return Number.isInteger(configured) && configured > 0 ? configured : 300_000;
}

// Follows a producer queue's Redis connection: `ready()` says whether jobs can
// be published now; `onOutage` runs once when Redis has been unreachable (or
// never came up) for longer than the limit. Connection events alone are not
// enough: a connection can hang (a partition, a stalled proxy) without ever
// closing, so a bounded probe (one read every few seconds, on this producer
// connection, which fails fast while disconnected) decides as well. The
// worker's own connection is untouched and keeps commands waiting.
export function watchRedis(
  queue: ProducerQueue,
  onOutage: () => void,
  limitMs = redisOutageLimitMs(),
  probeMs = Math.min(5_000, Math.max(250, Math.floor(limitMs / 3))),
) {
  let ready = false;
  let downSince = Date.now();
  let reported = false;
  let probing = false;
  let stopped = false;
  const backend = queue.getBackend();
  const up = () => {
    ready = true;
  };
  const down = () => {
    if (ready) downSince = Date.now();
    ready = false;
  };
  backend.on("ready", up);
  backend.on("close", down);
  queue.waitUntilReady().then(up, () => {});
  const probe = async () => {
    if (probing || stopped) return;
    probing = true;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const client = await backend.client;
      await Promise.race([
        // A read of an unused key under this queue's prefix: cheap and harmless.
        client.get(`${queue.qualifiedName}:probe`),
        new Promise((_, reject) => {
          deadline = setTimeout(() => reject(new Error("Redis probe timed out")), 2_000);
        }),
      ]);
      up();
    } catch {
      down();
    } finally {
      clearTimeout(deadline);
      probing = false;
    }
  };
  const probes = setInterval(() => void probe(), probeMs);
  const timer = setInterval(() => {
    if (ready || reported || Date.now() - downSince < limitMs) return;
    reported = true;
    onOutage();
  }, 250);
  probes.unref?.();
  timer.unref?.();
  return {
    ready: () => ready,
    stop: () => {
      stopped = true;
      clearInterval(probes);
      clearInterval(timer);
    },
  };
}
