const { Client } = require("pg");
const config = require("./config/database");

async function fixRentals() {
  const client = new Client(config);

  try {
    // Подключаемся к базе данных
    await client.connect();
    console.log("🔌 Подключение к базе данных...");

    // Проверяем, существует ли колонка rental_cost в таблице rentals
    console.log("🔍 Проверка структуры таблицы rentals...");
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rentals' AND column_name = 'rental_cost'
    `);

    if (result.rows.length === 0) {
      console.log("📝 Добавление колонки rental_cost в таблицу rentals...");
      
      // Добавляем колонку rental_cost
      await client.query(`
        ALTER TABLE rentals 
        ADD COLUMN rental_cost DECIMAL(10,2) NULL
      `);
      console.log("✅ Колонка rental_cost успешно добавлена!");
      
      // Заполняем колонку rental_cost для существующих записей
      console.log("📝 Обновление существующих записей аренды...");
      await client.query(`
        UPDATE rentals r
        SET rental_cost = m.rental_cost
        FROM media m
        WHERE r.media_id = m.id AND r.rental_cost IS NULL
      `);
      console.log("✅ Существующие записи успешно обновлены!");
    } else {
      console.log("✅ Колонка rental_cost уже существует в таблице rentals.");
    }
    
    console.log("🎉 База данных успешно обновлена!");
  } catch (error) {
    console.error("❌ Ошибка при обновлении базы данных:", error);
  } finally {
    await client.end();
  }
}

fixRentals(); 