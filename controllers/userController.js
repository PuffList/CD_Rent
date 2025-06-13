const User = require('../models/User');
const Rental = require('../models/Rental');
const bcrypt = require('bcrypt');

class UserController {
    static async getAdminPanel(req, res) {
        try {
            const users = await User.getAll();
            const totalRentals = await Rental.getActiveCount();
            const totalRevenue = parseFloat(await Rental.getTotalRevenue()) || 0;

            res.render('admin', {
                users,
                totalRentals,
                totalRevenue,
                currentUser: req.session.user
            });
        } catch (error) {
            res.status(500).send('Ошибка при загрузке панели администратора');
        }
    }

    static async getAllUsers(req, res) {
        try {
            const users = await User.findAll();
            res.json(users);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
        }
    }

    static async createEmployee(req, res) {
        try {
            const { name } = req.body;
            
            // Генерируем email и пароль
            const email = `${name.toLowerCase().replace(/\s+/g, '')}@company.com`;
            const password = Math.random().toString(36).slice(-8);
            
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Создаем пользователя
            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'Сотрудник'
            });

            res.status(201).json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                password // Отправляем пароль только при создании
            });
        } catch (error) {
            console.error('Error creating employee:', error);
            res.status(500).json({ error: 'Ошибка при создании сотрудника' });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await User.delete(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Ошибка при удалении пользователя' });
        }
    }

    static async banUser(req, res) {
        try {
            const { id } = req.params;
            await User.ban(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error banning user:', error);
            res.status(500).json({ error: 'Ошибка при блокировке пользователя' });
        }
    }

    static async unbanUser(req, res) {
        try {
            const { id } = req.params;
            await User.unban(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error unbanning user:', error);
            res.status(500).json({ error: 'Ошибка при разблокировке пользователя' });
        }
    }
}

module.exports = UserController; 