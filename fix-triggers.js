const { Client } = require("pg");
const config = require("./config/database");

async function fixTriggers() {
  const client = new Client(config);

  try {
    // Подключаемся к базе данных
    await client.connect();
    console.log("🔌 Подключение к базе данных...");

    console.log("🔍 Проверка наличия колонок updated_at во всех таблицах...");
    
    // Проверяем и добавляем колонку updated_at, если её нет
    const tablesQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
    const tables = await client.query(tablesQuery);
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      if (tableName === 'session') continue; // Пропускаем таблицу сессий
      
      // Проверяем наличие updated_at
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND column_name = 'updated_at'
      `;
      const columnResult = await client.query(columnsQuery);
      
      if (columnResult.rows.length === 0) {
        console.log(`📝 Добавление колонки updated_at в таблицу ${tableName}...`);
        await client.query(`
          ALTER TABLE ${tableName} 
          ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log(`✅ Колонка updated_at добавлена в таблицу ${tableName}`);
      }
    }

    console.log("🔧 Удаление существующих триггеров...");
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP TRIGGER IF EXISTS update_media_updated_at ON media;
      DROP TRIGGER IF EXISTS update_rentals_updated_at ON rentals;
    `);
    console.log("✅ Старые триггеры удалены");

    console.log("🔧 Пересоздание функции обновления updated_at...");
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE 'plpgsql';
    `);
    console.log("✅ Функция обновления updated_at создана");

    console.log("🔧 Создание новых триггеров...");
    await client.query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_media_updated_at 
      BEFORE UPDATE ON media
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_rentals_updated_at 
      BEFORE UPDATE ON rentals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log("✅ Новые триггеры созданы");

    console.log("🔧 Проверка наличия колонки is_banned в таблице users...");
    const isBannedQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_banned'
    `;
    const isBannedResult = await client.query(isBannedQuery);
    
    if (isBannedResult.rows.length === 0) {
      console.log("📝 Добавление колонки is_banned в таблицу users...");
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN is_banned BOOLEAN DEFAULT FALSE
      `);
      console.log("✅ Колонка is_banned добавлена в таблицу users");
    } else {
      console.log("✅ Колонка is_banned уже существует в таблице users");
    }

    console.log("🎉 База данных успешно исправлена!");
  } catch (error) {
    console.error("❌ Ошибка при исправлении базы данных:", error);
  } finally {
    await client.end();
  }
}

fixTriggers(); 