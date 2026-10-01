import Redis from 'ioredis';

// Redis connection string. We use the same for BullMQ and our counters.
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

export default connection;
