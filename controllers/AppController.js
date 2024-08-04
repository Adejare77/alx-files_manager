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
    // let retry = 0;
    // const repeatFunc = async () => {
    //   retry += 1;
    //   const result = await connect();
    //   if (result) {
    //     res.status = 200;
    //     return res.status(200).send(JSON.stringify({ redis: true, db: true }));
    //   } if (retry <= 10) {
    //     return repeatFunc(); // Await the recursive call
    //   }
    //   return res.status(500).json({
    //     redis: redisClient.isAlive(),
    //     db: dbClient.isAlive(),
    //   });
    // };
    // return repeatFunc();
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
