const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { checkAuth, checkRole } = require('../middleware/auth');

// Маршруты для администраторов
router.get('/', checkAuth, checkRole('Администратор'), UserController.getAllUsers);
router.post('/employees', checkAuth, checkRole('Администратор'), UserController.createEmployee);
router.delete('/:id', checkAuth, checkRole('Администратор'), UserController.deleteUser);
router.post('/:id/ban', checkAuth, checkRole('Администратор'), UserController.banUser);
router.post('/:id/unban', checkAuth, checkRole('Администратор'), UserController.unbanUser);

module.exports = router; 