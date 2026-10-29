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
// be published now; `onOutage` runs once when the connection has been down
// (or never came up) for longer than the limit.
export function watchRedis(
  queue: ProducerQueue,
  onOutage: () => void,
  limitMs = redisOutageLimitMs(),
) {
  let ready = false;
  let downSince = Date.now();
  let reported = false;
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
  const timer = setInterval(() => {
    if (ready || reported || Date.now() - downSince < limitMs) return;
    reported = true;
    onOutage();
  }, 1_000);
  timer.unref?.();
  return {
    ready: () => ready,
    stop: () => clearInterval(timer),
  };
}
