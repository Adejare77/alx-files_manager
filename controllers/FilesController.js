const { ObjectId } = require('mongodb');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const tokenKey = `auth_${token}`;
    const userId = redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || (type !== 'folder' && type !== 'file' && type !== 'image')) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && (type !== 'folder')) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // find all files
    const files = dbClient.db.collection('files');

    if (parentId) {
      const file = await files.findOne({ _id: new ObjectId(parentId), userId: user._id });
      if (!file) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {

    }
  }
}

module.export = FilesController;
