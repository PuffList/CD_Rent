const bcrypt = require('bcrypt');

const password = 'admin'; // Выберите пароль для администратора
const saltRounds = 10;

const hashedPassword = bcrypt.hashSync(password, saltRounds);
console.log('Хешированный пароль:', hashedPassword);