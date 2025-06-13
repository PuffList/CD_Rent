const { Pool } = require("pg");
const config = require("../config/database");

const pool = new Pool({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database,
  port: config.port,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
