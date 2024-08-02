const redis = require('redis');
const util = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => console.error(err));

    // Promisifying methods
    this.getAsync = util.promisify(this.client.get).bind(this.client);
    this.setAsync = util.promisify(this.client.set).bind(this.client);
    this.delAsync = util.promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const redisGet = await this.getAsync(key);
    return redisGet;
  }

  async set(key, value, duration) {
    this.client.on('connect', () => {
      this.client.connected = true;
    });
    await this.setAsync(key, value, 'EX', duration);
  }

  async del(key) {
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
