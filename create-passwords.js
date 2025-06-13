const bcrypt = require("bcrypt");
const { Client } = require("pg");
const config = require("./config/database");

async function createPasswords() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log("🔌 Подключение к базе данных...");

    // Создаем хеши паролей
    const adminPassword = "admin123";
    const employeePassword = "employee123";
    const clientPassword = "client123";

    console.log("🔐 Генерация хешей паролей...");
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const employeeHash = await bcrypt.hash(employeePassword, 10);
    const clientHash = await bcrypt.hash(clientPassword, 10);

    // Обновляем пароли в базе данных
    console.log("📝 Обновление паролей в базе данных...");

    await client.query("UPDATE users SET password = $1 WHERE email = $2", [
      adminHash,
      "admin@example.com",
    ]);

    await client.query("UPDATE users SET password = $1 WHERE email = $2", [
      employeeHash,
      "employee1@example.com",
    ]);

    await client.query("UPDATE users SET password = $1 WHERE email = $2", [
      clientHash,
      "client1@example.com",
    ]);

    console.log("✅ Пароли успешно обновлены!");
    console.log("");
    console.log("🔑 ДАННЫЕ ДЛЯ ВХОДА:");
    console.log("");
    console.log("👑 АДМИНИСТРАТОР:");
    console.log("   Email: admin@example.com");
    console.log("   Пароль: admin123");
    console.log("");
    console.log("👨‍💼 СОТРУДНИК:");
    console.log("   Email: employee1@example.com");
    console.log("   Пароль: employee123");
    console.log("");
    console.log("👤 КЛИЕНТ:");
    console.log("   Email: client1@example.com");
    console.log("   Пароль: client123");
    console.log("");

    await client.end();
  } catch (error) {
    console.error("❌ Ошибка:", error);
  }
}

createPasswords();
