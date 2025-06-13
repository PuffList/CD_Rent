const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Введите пароль для хеширования: ', async (password) => {
  try {
    // Генерируем хеш пароля с помощью bcrypt (сложность 10)
    const hash = await bcrypt.hash(password, 10);
    
    console.log('\n=== Результат ===');
    console.log('Пароль:', password);
    console.log('Хеш:', hash);
    console.log('\nВы можете использовать этот хеш в SQL-запросе:');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@example.com';`);
    
  } catch (error) {
    console.error("Ошибка при хешировании пароля:", error);
  } finally {
    rl.close();
  }
}); 