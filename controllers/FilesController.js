const { ObjectId } = require('mongodb');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async tokenForUser(token) {
    let user;
    try {
      const tokenKey = `auth_${token}`;
      const userId = await redisClient.get(tokenKey);
      user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    } catch (err) {
      // eslint-disable-next-line no-empty
    }
    return user;
  }

  static async postUpload(req, res) {
    const token = req.header('x-token'); // express format;
    const user = await FilesController.tokenForUser(token);

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
    // if type is folder, then data wouldn't be given
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // find all files
    const files = dbClient.db.collection('files');

    if (parentId) {
      const file = await files.findOne({ _id: new ObjectId(parentId) });
      if (!file) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = ({
      userId: user._id, // Associate file to the owner who created it
      name,
      type,
      parentId,
      isPublic,
    });

    if (type === 'folder') {
      // Create and save the folder document in the DB
      try {
        const result = await files.insertOne(newFile);
        // Destructure to exclude '_id' which was automatically inserted by insertOne
        const { _id, ...newFileWithoutId } = newFile;
        return res.status(201).json({
          id: result.insertedId, // the file _id given in the file collection
          ...newFileWithoutId, // using spread operator
        });
      } catch (err) {
        return res.status(500).json({ error: 'Error inserting file' });
      }
    }

    // Create a file in given or /tmp/files_manager path
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fileName = uuid.v4();
    const filePath = path.join(folderPath, fileName);

    // Decode Data (file or image) written in base64 and write to filePath
    // const fileData = base64.decode(data);
    const fileData = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, fileData);

    // Now, add localPath to newFile and write to the file DB itself
    newFile.localPath = filePath;
    const file = await files.insertOne(newFile);

    // remove _id because it is automatically added by mongoDB insertOne
    const { _id, localPath, ...newFileWithoutLocalPath } = newFile;
    return res.status(201).json({
      id: file.insertedId, // The id of the file just inserted
      ...newFileWithoutLocalPath,
    });
  }
}

module.exports = FilesController;
