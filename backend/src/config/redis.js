import { Redis } from 'ioredis';

let redisClient;
let redisDisabled = false;

export const getRedisClient = () => {
  if (redisDisabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // required for BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      // Avoid endless reconnect/error spam when Redis is not available.
      retryStrategy: () => null,
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', () => {
      // Keep logs clean in local/dev when Redis isn't running.
    });
  }
  return redisClient;
};

export const disableRedis = () => {
  redisDisabled = true;
};

export default getRedisClient;
