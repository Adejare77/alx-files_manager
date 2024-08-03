const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');

const app = express();
app.use(express.json()); // parse JSON bodies

app.get('/status', (req, res) => {
  res.send(AppController.getStatus(req, res));
});

app.get('/stats', (req, res) => {
  res.send(AppController.getStats());
});

app.post('/users', (req, res) => {
  UsersController.postNew(req, res);
});

module.exports = app;
