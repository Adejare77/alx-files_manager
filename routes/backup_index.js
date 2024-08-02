const express = require('express');
const AppController = require('../controllers/AppController');

const app = express();

app.get('/status', async (req, res) => {
  await AppController.getStatus(req, res);
});

app.get('/stats', (req, res) => {
  res.send(AppController.getStats());
});

module.exports = app;
