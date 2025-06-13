const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Логирование всех запросов к маршрутам авторизации
router.use((req, res, next) => {
    console.log('Auth route accessed:', {
        path: req.path,
        method: req.method,
        session: req.session
    });
    next();
});

// Маршруты авторизации
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

module.exports = router; 