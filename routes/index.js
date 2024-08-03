const express = require('express');
const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');
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

app.get('/connect', (req, res) => {
  AuthController.getConnect(req, res);
});

app.get('/disconnect', (req, res) => {
  AuthController.getDisconnect(req, res);
});

app.get('/users/me', (req, res) => {
  UsersController.getMe(req, res);
});

module.exports = app;
