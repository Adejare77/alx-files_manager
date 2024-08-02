const express = require('express');
const AppController = require('../controllers/AppController');

const app = express();

app.get('/status', (req, res) => {
  res.send(AppController.getStatus(req, res));
});

app.get('/stats', (req, res) => {
  res.send(AppController.getStats());
});

module.exports = app;
