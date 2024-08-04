const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static async getStatus(req, res) {
    const redisIsAlive = await redisClient.isAlive();
    const dbIsAlive = await dbClient.isAlive();
    if (redisIsAlive && dbIsAlive) {
      return res.status(200).json({ redis: true, db: true });
    }
    return res.status(500).json({
      redis: redisIsAlive,
      db: dbIsAlive,
    });
  }

  static async getStats(req, res) {
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();
    return res.status(200).json({
      users: usersCount,
      files: filesCount,
    });
  }
}

module.exports = AppController;
