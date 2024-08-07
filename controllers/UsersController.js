const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const Queue = require('bull');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

function hashPassword(password) {
  const sha1 = crypto.createHash('sha1').update(password);

  return sha1.digest('hex');
}

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    const usersCollection = dbClient.db.collection('users');

    try {
      const user = await usersCollection.findOne({ email });
      if (user) {
        res.status(400).json({ error: 'Already exist' });
        return;
      }

      const hashedPassword = hashPassword(password);
      const newUser = { email, password: hashedPassword };

      const result = await usersCollection.insertOne(newUser);
      const userId = result.insertedId;

      // Add new userId to the Queue
      userQueue.add({
        userId,
      });

      res.status(201).json({ id: userId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const token = req.header('x-token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
