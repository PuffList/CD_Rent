const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/mediaController');
const { checkAuth, checkRole } = require('../middleware/auth');

// Маршруты для сотрудников и администраторов
router.get('/', MediaController.getAllMedia);
router.post('/', checkAuth, checkRole(['Администратор', 'Сотрудник']), MediaController.createMedia);
router.put('/:id', checkAuth, checkRole(['Администратор', 'Сотрудник']), MediaController.updateMedia);
router.delete('/:id', checkAuth, checkRole(['Администратор', 'Сотрудник']), MediaController.deleteMedia);

module.exports = router; 