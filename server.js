const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
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

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
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
    next();
};

// Middleware для проверки роли
const checkRole = (role) => (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
        return res.status(403).send('Доступ запрещён');
    }
    next();
};

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
        res.render('manage', { mediaList });
    });
});

// Панель администратора
app.get('/admin', checkAuth, checkRole('Администратор'), (req, res) => {
    db.query('SELECT * FROM users', (err, users) => {
        if (err) throw err;
        res.render('admin', { users });
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

    db.query('UPDATE media SET status = "Available" WHERE id = ?', [mediaId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });

        db.query('UPDATE rentals SET return_date = ? WHERE media_id = ? AND return_date IS NULL', [returnDate, mediaId], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
            res.json({ message: 'Возврат успешен' });
        });
    });
});

// API для удаления пользователя
app.delete('/api/users/:id', checkAuth, checkRole('Администратор'), (req, res) => {
    const userId = req.params.id;
    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        res.json({ message: 'Пользователь удалён' });
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});