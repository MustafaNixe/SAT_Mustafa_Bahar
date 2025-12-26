const express = require('express');
const router = express.Router();
const { register, login, getUsers } = require('../controllers/authController');

router.get('/users', getUsers);

router.post('/users', register);

router.post('/register', register);

router.post('/login', login);

module.exports = router;
