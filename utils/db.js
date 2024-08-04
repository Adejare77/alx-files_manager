const { MongoClient } = require('mongodb');
// const { get } = require('request');

class DBClient {
  constructor() {
    const HOST = process.env.DB_HOST || 'localhost';
    const PORT = process.env.DB_PORT || 27017;
    const DATABASE = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${HOST}:${PORT}/${DATABASE}`, { useUnifiedTopology: true });

    this.client.connect()
      .then(() => {
        this.db = this.client.db(DATABASE);
      }).catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
      });
  }

  isAlive() {
    // Check if MongoDB is running and connected
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    const usersCount = this.db.collection('users');
    const docsInUsers = await usersCount.countDocuments();
    return docsInUsers;
  }

  async nbFiles() {
    const docsInFiles = await this.db.collection('files').countDocuments();
    return docsInFiles;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
