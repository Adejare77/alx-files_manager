const { ObjectId } = require('mongodb');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('x-token'); // express format;
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

    if (type === 'folder') {
      // Create and save the folder document in the DB
      const newFolder = ({
        userId: user._id, // Associate file to the owner who created it
        name,
        type,
        parentId,
        isPublic,
      });
      try {
        const result = await files.insertOne(newFolder);
        // Destructure to exclude '_id' automatically inserted after inserted by MongoDB
        const { _id, ...newFolderWithoutId } = newFolder;
        return res.status(201).json({
          id: result.insertedId, // the file _id given in the file collection
          ...newFolderWithoutId,
        });
      } catch (err) {
        console.log(err);
      }
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fileName = uuid.v4();
    const filePath = path.join(folderPath, fileName);

    // Decode Data written in base64 and write the file to disk
    // const fileData = base64.decode(data);

    const fileData = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, fileData);

    // Create and save the file document in the DB
    const newFile = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
      localPath: filePath,
    };
    const file = await files.insertOne(newFile);

    // Destructure to exclude the localPath property before spreading
    // remove _id because it is automatically added by mongoDB
    const { localPath, _id, ...newFileWithoutLoclaPath } = newFile;
    return res.status(201).json({
      id: file.insertedId, // The id of the file just inserted
      ...newFileWithoutLoclaPath,
    });
  }
}

module.exports = FilesController;
