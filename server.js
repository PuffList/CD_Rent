const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Добавьте для хеширования паролей
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'pug');
app.set('views', './views');

// Настройка MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'video_rental'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL подключён');
});

// Middleware для проверки авторизации
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    // Проверяем, не заблокирован ли пользователь
    if (req.session.user.role === 'Клиент') {
        db.query('SELECT is_banned FROM users WHERE id = ?', [req.session.user.id], (err, results) => {
            if (err || results.length === 0) {
                req.session.destroy();
                return res.redirect('/login');
            }
            
            if (results[0].is_banned) {
                req.session.destroy();
                return res.status(403).send('Ваш аккаунт заблокирован. Обратитесь к администратору.');
            }
            
            next();
        });
    } else {
        next();
    }
};

// Middleware для проверки роли
const checkRole = (role) => (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
        return res.status(403).send('Доступ запрещён');
    }
    next();
};

// Страница регистрации
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role], (err) => {
        if (err) return res.status(500).send('Ошибка регистрации');
        res.redirect('/login');
    });
});

// Страница входа
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.render('login', { error: 'Произошла ошибка при входе' });
        }
        
        if (results.length === 0) {
            return res.render('login', { error: 'Неверный email или пароль' });
        }

        const user = results[0];

        // Проверяем, не заблокирован ли пользователь
        if (user.is_banned) {
            return res.render('login', { banned: true });
        }

        // Проверяем пароль
        if (bcrypt.compareSync(password, user.password)) {
            req.session.user = { 
                id: user.id, 
                name: user.name, 
                role: user.role 
            };
            res.redirect('/');
        } else {
            res.render('login', { error: 'Неверный email или пароль' });
        }
    });
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Главная страница (каталог)
app.get('/', (req, res) => {
    db.query('SELECT * FROM media', (err, mediaList) => {
        if (err) throw err;
        res.render('index', { mediaList, user: req.session.user });
    });
});

// Страница истории проката (для клиента)
app.get('/history', checkAuth, checkRole('Клиент'), (req, res) => {
    db.query('SELECT rentals.*, media.title, media.type FROM rentals JOIN media ON rentals.media_id = media.id WHERE rentals.user_id = ?', [req.session.user.id], (err, rentals) => {
        if (err) throw err;
        res.render('history', { rentals });
    });
});

// Страница управления инвентарём (для сотрудника)
app.get('/manage', checkAuth, checkRole('Сотрудник'), (req, res) => {
    db.query('SELECT * FROM media', (err, mediaList) => {
        if (err) throw err;
        db.query('SELECT COUNT(*) as active FROM rentals WHERE return_date IS NULL', (err, activeResult) => {
            db.query('SELECT COUNT(*) as returned FROM rentals WHERE return_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)', (err, returnedResult) => {
                res.render('manage', {
                    mediaList,
                    activeRentals: activeResult[0].active,
                    returnedThisWeek: returnedResult[0].returned
                });
            });
        });
    });
});

// Панель администратора
app.get('/admin', checkAuth, checkRole('Администратор'), (req, res) => {
    // Получаем список пользователей
    db.query('SELECT * FROM users', (err, users) => {
        if (err) throw err;

        // Получаем общее количество аренд
        db.query('SELECT COUNT(*) as total FROM rentals', (err, totalResult) => {
            if (err) throw err;

            // Получаем общую сумму дохода
            db.query(`
                SELECT COALESCE(SUM(m.rental_cost), 0) as total_revenue 
                FROM rentals r 
                JOIN media m ON r.media_id = m.id 
                WHERE r.return_date IS NOT NULL
            `, (err, revenueResult) => {
                if (err) throw err;

                res.render('admin', {
                    users,
                    totalRentals: totalResult[0].total,
                    totalRevenue: parseFloat(revenueResult[0].total_revenue),
                    currentUser: req.session.user
                });
            });
        });
    });
});

// API для аренды носителя
app.post('/api/rentals', checkAuth, checkRole('Клиент'), (req, res) => {
    const { mediaId } = req.body;
    const userId = req.session.user.id;
    const rentDate = new Date();
    const dueDate = new Date(rentDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    db.query('UPDATE media SET status = "Rented" WHERE id = ? AND status = "Available"', [mediaId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Носитель недоступен' });

        db.query('INSERT INTO rentals (user_id, media_id, rent_date, due_date) VALUES (?, ?, ?, ?)', [userId, mediaId, rentDate, dueDate], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
            res.json({ message: 'Аренда успешна' });
        });
    });
});

// API для возврата носителя
app.post('/api/returns', checkAuth, checkRole('Сотрудник'), (req, res) => {
    const { mediaId } = req.body;
    const returnDate = new Date();

    // Начинаем транзакцию для обеспечения целостности данных
    db.beginTransaction(err => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        // Проверяем, что носитель действительно арендован
        db.query('SELECT status FROM media WHERE id = ?', [mediaId], (err, mediaResults) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json({ error: 'Ошибка базы данных' });
                });
            }

            if (mediaResults.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ error: 'Носитель не найден' });
                });
            }

            if (mediaResults[0].status !== 'Rented') {
                return db.rollback(() => {
                    res.status(400).json({ error: 'Носитель не находится в аренде' });
                });
            }

            // Обновляем статус носителя
            db.query('UPDATE media SET status = "Available" WHERE id = ?', [mediaId], (err) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Ошибка при обновлении статуса носителя' });
                    });
                }

                // Обновляем запись об аренде
                db.query(
                    'UPDATE rentals SET return_date = ? WHERE media_id = ? AND return_date IS NULL',
                    [returnDate, mediaId],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Ошибка при обновлении записи об аренде' });
                            });
                        }

                        // Завершаем транзакцию
                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ error: 'Ошибка при сохранении изменений' });
                                });
                            }
                            res.json({ message: 'Возврат успешно оформлен' });
                        });
                    }
                );
            });
        });
    });
});

// API для удаления пользователя
app.delete('/api/users/:id', checkAuth, checkRole('Администратор'), (req, res) => {
    const userId = req.params.id;
    const adminId = req.session.user.id;

    // Проверяем, не пытается ли админ удалить сам себя
    if (userId === adminId) {
        return res.status(400).json({ error: 'Нельзя удалить свой собственный аккаунт' });
    }

    // Проверяем наличие активных аренд
    db.query(
        'SELECT COUNT(*) as active_rentals FROM rentals WHERE user_id = ? AND return_date IS NULL',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
            
            if (results[0].active_rentals > 0) {
                return res.status(400).json({ 
                    error: 'Нельзя удалить пользователя с активными арендами' 
                });
            }

            // Удаляем пользователя
            db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
                if (err) return res.status(500).json({ error: 'Ошибка при удалении пользователя' });
                res.json({ message: 'Пользователь удалён' });
            });
        }
    );
});

// API для добавления нового носителя
app.post('/api/media', checkAuth, checkRole('Сотрудник'), (req, res) => {
    const { title, type, genre, rental_cost } = req.body;
    
    if (!title || !type || !genre || !rental_cost) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    db.query(
        'INSERT INTO media (title, type, genre, rental_cost, status) VALUES (?, ?, ?, ?, "Available")',
        [title, type, genre, rental_cost],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Ошибка при добавлении носителя' });
            res.json({ message: 'Носитель успешно добавлен', id: result.insertId });
        }
    );
});

// API для обновления информации о носителе
app.put('/api/media/:id', checkAuth, checkRole('Сотрудник'), (req, res) => {
    const { id } = req.params;
    const { title, type, genre, rental_cost } = req.body;

    // Проверяем, не арендован ли носитель
    db.query('SELECT status FROM media WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (results.length === 0) return res.status(404).json({ error: 'Носитель не найден' });
        if (results[0].status === 'Rented') {
            return res.status(400).json({ error: 'Нельзя редактировать арендованный носитель' });
        }

        // Обновляем информацию
        db.query(
            'UPDATE media SET title = ?, type = ?, genre = ?, rental_cost = ? WHERE id = ?',
            [title, type, genre, rental_cost, id],
            (err) => {
                if (err) return res.status(500).json({ error: 'Ошибка при обновлении носителя' });
                res.json({ message: 'Носитель успешно обновлен' });
            }
        );
    });
});

// API для удаления носителя
app.delete('/api/media/:id', checkAuth, checkRole('Сотрудник'), (req, res) => {
    const { id } = req.params;

    // Проверяем статус носителя перед удалением
    db.query('SELECT status FROM media WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (results.length === 0) return res.status(404).json({ error: 'Носитель не найден' });
        if (results[0].status === 'Rented') {
            return res.status(400).json({ error: 'Нельзя удалить арендованный носитель' });
        }

        // Удаляем носитель
        db.query('DELETE FROM media WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка при удалении носителя' });
            res.json({ message: 'Носитель успешно удален' });
        });
    });
});

// Функция для генерации случайного пароля
function generatePassword(length = 10) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

// Функция для генерации email на основе имени
function generateEmail(name) {
    // Транслитерация русских букв в латиницу
    const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    const transliterated = name.toLowerCase()
        .split('')
        .map(char => translitMap[char] || char)
        .join('')
        .replace(/[^a-z0-9]/g, '');

    return `${transliterated}@cdrent.com`;
}

// API для создания сотрудника (только для администратора)
app.post('/api/employees', checkAuth, checkRole('Администратор'), (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Имя сотрудника обязательно' });
    }

    const email = generateEmail(name);
    const password = generatePassword();
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Проверяем, не существует ли уже такой email
    db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Создаем нового сотрудника
        db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'Сотрудник'],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка при создании сотрудника' });
                }

                // Возвращаем сгенерированные данные
                res.json({
                    message: 'Сотрудник успешно создан',
                    email: email,
                    password: password // Отправляем пароль только один раз при создании
                });
            }
        );
    });
});

// Добавляем поле is_banned в таблицу users, если его еще нет
db.query("SHOW COLUMNS FROM users LIKE 'is_banned'", (err, results) => {
    if (err) {
        console.error('Ошибка при проверке колонки is_banned:', err);
        return;
    }
    
    if (results.length === 0) {
        db.query(`
            ALTER TABLE users 
            ADD COLUMN is_banned BOOLEAN DEFAULT FALSE
        `, (err) => {
            if (err) {
                console.error('Ошибка при добавлении колонки is_banned:', err);
            } else {
                console.log('Колонка is_banned успешно добавлена');
            }
        });
    }
});

// API для блокировки пользователя
app.post('/api/users/:id/ban', checkAuth, checkRole('Администратор'), (req, res) => {
    const userId = req.params.id;

    // Проверяем, что пользователь существует и является клиентом
    db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (results.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        if (results[0].role !== 'Клиент') {
            return res.status(400).json({ error: 'Можно блокировать только клиентов' });
        }

        // Блокируем пользователя
        db.query('UPDATE users SET is_banned = TRUE WHERE id = ?', [userId], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка при блокировке пользователя' });
            res.json({ message: 'Пользователь заблокирован' });
        });
    });
});

// API для разблокировки пользователя
app.post('/api/users/:id/unban', checkAuth, checkRole('Администратор'), (req, res) => {
    const userId = req.params.id;

    db.query('UPDATE users SET is_banned = FALSE WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка при разблокировке пользователя' });
        res.json({ message: 'Пользователь разблокирован' });
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
