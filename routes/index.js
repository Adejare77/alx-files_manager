import { Router } from 'express';

// const FilesController = require('../controllers/FilesController');
const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');
const UsersController = require('../controllers/UsersController');

const router = Router();

router.get('/status', AppController.getStatus);

router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);

router.get('/connect', AuthController.getConnect);

router.get('/disconnect', AuthController.getDisconnect);

router.get('/users/me', UsersController.getMe);

// router.post('/files', FilesController.postUpload);

module.exports = router;
