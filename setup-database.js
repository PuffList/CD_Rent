const { Client } = require("pg");
const config = require("./config/database");

async function setupDatabase() {
  // Подключаемся к PostgreSQL без указания конкретной базы данных
  const adminClient = new Client({
    host: config.host,
    user: config.user,
    password: config.password,
    port: config.port,
    database: "postgres", // подключаемся к системной базе postgres
  });

  try {
    console.log("🔌 Подключение к PostgreSQL...");
    await adminClient.connect();

    // Проверяем, существует ли база данных
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${config.database}'`;
    const dbExists = await adminClient.query(checkDbQuery);

    if (dbExists.rows.length === 0) {
      console.log("📦 Создание базы данных video_rental...");
      await adminClient.query(`CREATE DATABASE ${config.database}`);
      console.log("✅ База данных video_rental создана");
    } else {
      console.log("✅ База данных video_rental уже существует");
    }

    await adminClient.end();
  } catch (error) {
    console.error("❌ Ошибка при создании базы данных:", error.message);
    return false;
  }

  // Подключаемся к созданной базе данных для создания таблиц
  const client = new Client(config);

  try {
    console.log("🔌 Подключение к базе данных video_rental...");
    await client.connect();

    // Создание таблицы пользователей
    console.log("👥 Создание таблицы users...");
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'Клиент',
                is_banned BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Создание таблицы медиа
    console.log("📺 Создание таблицы media...");
    await client.query(`
            CREATE TABLE IF NOT EXISTS media (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                genre VARCHAR(100),
                rental_cost DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Создание таблицы аренды
    console.log("📋 Создание таблицы rentals...");
    await client.query(`
            CREATE TABLE IF NOT EXISTS rentals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
                rent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                due_date TIMESTAMP NOT NULL,
                return_date TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Создание индексов
    console.log("🚀 Создание индексов...");
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_rentals_media_id ON rentals(media_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_rentals_return_date ON rentals(return_date)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_media_status ON media(status)"
    );

    // Создание функции для автоматического обновления updated_at
    console.log("⚙️ Создание функций и триггеров...");
    await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

    // Создание триггеров
    await client.query(
      "DROP TRIGGER IF EXISTS update_users_updated_at ON users"
    );
    await client.query(
      "DROP TRIGGER IF EXISTS update_media_updated_at ON media"
    );
    await client.query(
      "DROP TRIGGER IF EXISTS update_rentals_updated_at ON rentals"
    );

    await client.query(`
            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
    await client.query(`
            CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
    await client.query(`
            CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

    // Добавление тестовых данных (только если таблицы пустые)
    const userCount = await client.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log("📝 Добавление тестовых пользователей...");
      await client.query(`
                INSERT INTO users (name, email, password, role) VALUES 
                ('Администратор', 'admin@example.com', '$2b$10$k1234567890abcdefghijk', 'Администратор'),
                ('Сотрудник 1', 'employee1@example.com', '$2b$10$k1234567890abcdefghijk', 'Сотрудник'),
                ('Клиент 1', 'client1@example.com', '$2b$10$k1234567890abcdefghijk', 'Клиент')
            `);
    }

    const mediaCount = await client.query("SELECT COUNT(*) FROM media");
    if (parseInt(mediaCount.rows[0].count) === 0) {
      console.log("🎬 Добавление тестовых видеоносителей...");
      await client.query(`
                INSERT INTO media (title, type, genre, rental_cost, status) VALUES 
                ('Матрица', 'DVD', 'Фантастика', 150.00, 'Available'),
                ('Властелин колец', 'Blu-ray', 'Фэнтези', 200.00, 'Available'),
                ('Терминатор 2', 'DVD', 'Боевик', 120.00, 'Available'),
                ('Титаник', 'Blu-ray', 'Драма', 180.00, 'Available'),
                ('Звездные войны', 'DVD', 'Фантастика', 160.00, 'Available')
            `);
    }

    console.log("🎉 База данных успешно настроена!");
    console.log("");
    console.log("📊 Информация о таблицах:");

    const tablesInfo = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

    for (const table of tablesInfo.rows) {
      const countResult = await client.query(
        `SELECT COUNT(*) FROM ${table.table_name}`
      );
      console.log(
        `   📋 ${table.table_name}: ${countResult.rows[0].count} записей`
      );
    }

    await client.end();
    return true;
  } catch (error) {
    console.error("❌ Ошибка при настройке таблиц:", error.message);
    console.error("Детали:", error);
    return false;
  }
}

// Запуск настройки
setupDatabase()
  .then((success) => {
    if (success) {
      console.log("");
      console.log(
        "✅ Настройка завершена! Теперь можно запустить приложение командой: npm start"
      );
      process.exit(0);
    } else {
      console.log("");
      console.log(
        "❌ Настройка не удалась. Проверьте подключение к PostgreSQL."
      );
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Критическая ошибка:", error);
    process.exit(1);
  });
