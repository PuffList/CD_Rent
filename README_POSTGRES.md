# Переход на PostgreSQL

## Инструкции по установке и настройке

### 1. Установка PostgreSQL

**Windows:**

1. Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/
2. Установите PostgreSQL с настройками по умолчанию
3. Запомните пароль для пользователя `postgres`

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql
```

### 2. Создание базы данных

```bash
# Подключение к PostgreSQL
psql -U postgres

# Создание базы данных
CREATE DATABASE video_rental;

# Выход из psql
\q
```

### 3. Настройка приложения

**3.1. Обновите зависимости:**

```bash
npm install
```

**3.2. Настройте конфигурацию базы данных в `config/database.js`:**

```javascript
const config = {
  host: "localhost",
  user: "postgres",
  password: "ваш_пароль_postgres", // Замените на ваш пароль
  database: "video_rental",
  port: 5432,
};
```

**3.3. Создайте таблицы и данные:**

```bash
psql -U postgres -d video_rental -f database_setup.sql
```

### 4. Запуск приложения

```bash
npm start
```

## Основные изменения при переходе с MySQL на PostgreSQL

### Изменения в синтаксисе SQL:

- `?` → `$1, $2, $3...` (параметры запросов)
- `AUTO_INCREMENT` → `SERIAL`
- `DATE_ADD(NOW(), INTERVAL 7 DAY)` → `NOW() + INTERVAL '7 days'`
- `DATE_SUB(NOW(), INTERVAL 7 DAY)` → `NOW() - INTERVAL '7 days'`
- `LIMIT` синтаксис остался тот же

### Изменения в драйверах:

- `mysql2` → `pg`
- `express-mysql-session` → `connect-pg-simple`

### Изменения в структуре результатов:

- MySQL: `const [rows] = await db.query()` → PostgreSQL: `const result = await db.query()`, данные в `result.rows`
- MySQL: `result.insertId` → PostgreSQL: `RETURNING *` в запросе

## Тестовые данные

После выполнения скрипта `database_setup.sql` будут созданы:

**Пользователи:**

- admin@example.com (Администратор)
- employee1@example.com (Сотрудник)
- client1@example.com (Клиент)

**Видеоносители:**

- Матрица (DVD, Фантастика, 150 руб.)
- Властелин колец (Blu-ray, Фэнтези, 200 руб.)
- Терминатор 2 (DVD, Боевик, 120 руб.)
- Титаник (Blu-ray, Драма, 180 руб.)
- Звездные войны (DVD, Фантастика, 160 руб.)

## Проверка подключения

Для проверки подключения можно использовать:

```bash
psql -U postgres -d video_rental -c "SELECT version();"
```

## Полезные команды PostgreSQL

```bash
# Подключение к базе данных
psql -U postgres -d video_rental

# Просмотр всех таблиц
\dt

# Просмотр структуры таблицы
\d table_name

# Просмотр всех пользователей PostgreSQL
\du

# Выход
\q
```
