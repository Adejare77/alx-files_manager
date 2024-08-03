const crypto = require('crypto');
const dbClient = require('../utils/db');

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

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      const newUser = { email, password: hashedPassword };

      const result = await usersCollection.insertOne(newUser);
      const userId = result.insertedId;

      res.status(201).json({ id: userId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;
