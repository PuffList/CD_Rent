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
    next();
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
        if (err || results.length === 0) return res.status(400).send('Неверные данные');
        const user = results[0];
        if (bcrypt.compareSync(password, user.password)) {
            req.session.user = { id: user.id, name: user.name, role: user.role };
            res.redirect('/');
        } else {
            res.status(400).send('Неверные данные');
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

// Маршрут для статистики
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

// Маршрут для отчетов
app.get('/admin', checkAuth, checkRole('Администратор'), (req, res) => {
      db.query('SELECT * FROM users', (err, users) => {
          if (err) throw err;
          db.query('SELECT COUNT(*) as total FROM rentals', (err, totalResult) => {
              res.render('admin', {
                  users,
                  totalRentals: totalResult[0].total,
                  totalRevenue: 1000 // Пример, замените на реальную логику
              });
          });
      });
  });

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
