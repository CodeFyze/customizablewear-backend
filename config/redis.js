import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Promisify client methods
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.setExAsync = promisify(this.client.setEx).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async get(key) {
    try {
      await this.connect();
      return await this.getAsync(key);
    } catch (err) {
      console.error('Redis GET error:', err);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      await this.connect();
      if (ttl) {
        return await this.setExAsync(key, ttl, value);
      }
      return await this.setAsync(key, value);
    } catch (err) {
      console.error('Redis SET error:', err);
      return false;
    }
  }

  async del(key) {
    try {
      await this.connect();
      return await this.delAsync(key);
    } catch (err) {
      console.error('Redis DEL error:', err);
      return false;
    }
  }

  async flush() {
    try {
      await this.connect();
      return await this.client.flushDb();
    } catch (err) {
      console.error('Redis FLUSH error:', err);
      return false;
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

// Add cache helper to Mongoose
const { mongoose } = await import('mongoose');

mongoose.Query.prototype.cache = function(options = { key: null, ttl: 3600 }) {
  this.useCache = true;
  this.cacheKey = options.key;
  this.cacheTtl = options.ttl;
  return this;
};

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) {
    return this.exec.apply(this, arguments);
  }

  const key = JSON.stringify({
    ...this.getQuery(),
    collection: this.mongooseCollection.name
  });

  // See if we have cached value
  const cacheValue = await redisClient.get(key);
  if (cacheValue) {
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  // Otherwise issue query and cache result
  const result = await this.exec.apply(this, arguments);
  await redisClient.set(key, JSON.stringify(result), this.cacheTtl);
  return result;
};

export default redisClient;