const Queue = require('bull');
const { ObjectId } = require('mongodb');
const thumbnail = require('image-thumbnail');
const fs = require('fs');
const dbClient = require('./utils/db');

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

fileQueue.process(async (job, done) => {
  try {
    console.log('Processing...');
    const { fileId, userId } = job.data;
    if (!fileId) {
      throw new Error('Missing fileId');
    }
    if (!userId) {
      throw new Error('Missing userId');
    }

    console.log(fileId, userId);
    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!file) {
      throw new Error('File not found');
    }

    const filePath = file.localPath;
    const widths = [500, 250, 100];

    await Promise.all(widths.map(async (width) => {
      const options = { width };
      const thumbnailBuffer = await thumbnail(filePath, options);
      const imageName = `${filePath}_${width}`;

      fs.writeFileSync(imageName, thumbnailBuffer);
    }));

    done();
  } catch (error) {
    done(error);
  }

  userQueue.process(async (job, done) => {
    console.log('Processing User');
    try {
      const { userId } = job.data;
      if (!userId) {
        throw new Error('Missing userId');
      }
      const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) {
        throw new Error('User not found');
      }
      done(`Welcome ${user.email}`);
    } catch (err) {
      done(err);
    }
  });
});
