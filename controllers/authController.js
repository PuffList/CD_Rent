const User = require('../models/User');
const bcrypt = require('bcrypt');

class AuthController {
    static async register(req, res) {
        try {
            const { name, email, password } = req.body;
            
            // Проверяем, не существует ли уже такой email
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
            
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Создаем пользователя
            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'Клиент'
            });

            res.status(201).json({ 
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Ошибка при регистрации' });
        }
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;
            console.log('Login attempt:', { email });

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Неверный email или пароль' });
            }

            if (user.is_banned) {
                return res.status(403).json({ error: 'Ваш аккаунт заблокирован' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Неверный email или пароль' });
            }

            // Сохраняем пользователя в сессии
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            console.log('User logged in:', {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            });

            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Ошибка при входе' });
        }
    }

    static async logout(req, res) {
        console.log('Logout attempt:', req.session.user);
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Ошибка при выходе' });
            }
            res.json({ success: true });
        });
    }
}

module.exports = AuthController; 