const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

async function connect() {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (redisClient.isAlive() && dbClient.isAlive()) {
        resolve(true);
      } else {
        resolve(false);
      }
    }, 1000);
  });
}

class AppController {
  static getStatus(req, res) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      res.status = 200;
      return JSON.stringify({ redis: true, db: true });
    }
    let retry = 0;
    const repeatFunc = async () => {
      retry += 1;
      const result = await connect();
      if (result) {
        res.status = 200;
        return JSON.stringify({ redis: true, db: true });
      } if (retry <= 10) {
        return repeatFunc(); // Await the recursive call
      }
      res.status = 500;
      return JSON.stringify({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
    };
    return repeatFunc();
  }

  static getStats() {
    return {
      users: dbClient.nbUsers(),
      files: dbClient.nbFiles(),
    };
  }
}

module.exports = AppController;
