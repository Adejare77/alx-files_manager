const { ObjectId } = require('mongodb');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Queue = require('bull');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const fileQueue = new Queue('fileQueue', 'redis://124');

class FilesController {
  static async tokenForUser(token) {
    let user;
    try {
      const tokenKey = `auth_${token}`;
      const userId = await redisClient.get(tokenKey);
      user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      return user;
    } catch (err) {
      return null;
    }
  }

  static async postUpload(req, res) {
    const token = req.header('x-token'); // express format;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await FilesController.tokenForUser(token);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      type,
      isPublic = false,
      parentId = 0,
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
      isPublic,
      parentId,
    });

    if (type === 'folder') {
      // Create and save the folder document in the DB
      try {
        const result = await files.insertOne(newFile);
        // Destructure to exclude '_id' which was automatically inserted by insertOne
        const { _id, ...newFileWithoutObjectId } = newFile;
        return res.status(201).json({
          id: result.insertedId, // the file _id given in the file collection
          ...newFileWithoutObjectId, // using spread operator
        });
      } catch (err) {
        return res.status(500).json({ error: 'Error inserting file' });
      }
    } else {
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

      if (type === 'image') {
        fileQueue.add({
          userId: user._id,
          fileId: file.insertedId,
        });
      }
      // remove _id because it is automatically added by mongoDB insertOne
      const { _id, localPath, ...newFileWithoutLocalPath } = newFile;
      return res.status(201).json({
        id: file.insertedId, // The id of the file just inserted
        ...newFileWithoutLocalPath,
      });
    }
  }

  static async getShow(req, res) {
    const token = req.header('x-token');
    const user = await FilesController.tokenForUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id) });
    if (!file || file.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }
    // file.id = file._id; // Inorder to use 'id' instead of '_id'
    // delete file._id; // Delete '_id'
    // delete file.localPath; // We don't want the localPath displayed

    // Using destructuring to rename _id, remove localPath and keep others
    const { _id: id, localPath, ...fields } = file;
    const modifiedFile = { id, ...fields };
    return res.status(200).send(modifiedFile);
  }

  static async getIndex(req, res) {
    const token = req.header('x-token');
    const user = await FilesController.tokenForUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const filesCollection = dbClient.db.collection('files');
    const { parentId, page } = req.query;

    const pageNumber = page ? parseInt(page, 10) : 0;
    const startIndex = pageNumber * 20;
    const matchCriterial = { userId: user._id };
    if (parentId) {
      matchCriterial.parentId = parentId;
    }
    const aggregatedFiles = await filesCollection.aggregate([
      { $match: matchCriterial },
      { $skip: startIndex },
      { $limit: 20 },
      { $addFields: { id: '$_id' } },
      { $project: { _id: 0, localPath: 0 } },
    ]).toArray();

    return res.status(200).send(aggregatedFiles);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token'); // express is case insensitive
    const user = await FilesController.tokenForUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id) });
    if (!file || file.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(req.params.id) }, // filter
      { $set: { isPublic: true } }, // updated field
    );
    // Using destructuring to rename _id, remove localPath and keep others
    const { _id: id, localPath, ...fields } = file;
    // update the isPublic field using destructuring
    const modifiedFile = { id, ...fields, isPublic: true };
    return res.status(200).send(modifiedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.header('x-token');
    const user = await FilesController.tokenForUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id) });
    if (!file || file.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(req.params.id) }, // filter
      { $set: { isPublic: false } }, // updated field
    );
    const { _id: id, localPath, ...fields } = file;
    const modifiedFile = { id, ...fields, isPublic: false };
    return res.status(200).send(modifiedFile);
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    const token = req.header('x-token');
    const user = await FilesController.tokenForUser(token);
    if (!file.isPublic && !(user && user._id.toString() === file.userId.toString())) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }
    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const { size } = req.params;
      let fileName = file.localPath;

      if (size) {
        fileName = `${fileName}_${size}`;
      }

      const mimeType = mime.contentType(file.name);
      const fileContent = fs.readFileSync(fileName, 'utf8');
      res.set('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

module.exports = FilesController;
