-- Создание базы данных video_rental для PostgreSQL
-- Запустить команду: psql -U postgres -c "CREATE DATABASE video_rental;"

-- Подключиться к базе данных: \c video_rental

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Клиент',
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица медиа (видеоносители)
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    genre VARCHAR(100),
    rental_cost DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица аренды
CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    rent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_media_id ON rentals(media_id);
CREATE INDEX IF NOT EXISTS idx_rentals_return_date ON rentals(return_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);

-- Вставка тестовых данных
INSERT INTO users (name, email, password, role) VALUES 
('Администратор', 'admin@example.com', '$2b$10$hash_here', 'Администратор'),
('Сотрудник 1', 'employee1@example.com', '$2b$10$hash_here', 'Сотрудник'),
('Клиент 1', 'client1@example.com', '$2b$10$hash_here', 'Клиент');

INSERT INTO media (title, type, genre, rental_cost, status) VALUES 
('Матрица', 'DVD', 'Фантастика', 150.00, 'Available'),
('Властелин колец', 'Blu-ray', 'Фэнтези', 200.00, 'Available'),
('Терминатор 2', 'DVD', 'Боевик', 120.00, 'Available'),
('Титаник', 'Blu-ray', 'Драма', 180.00, 'Available'),
('Звездные войны', 'DVD', 'Фантастика', 160.00, 'Available');



-- Обновляем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 