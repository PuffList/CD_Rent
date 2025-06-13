const db = require("./database");
const bcrypt = require("bcrypt");

class User {
  static async findByEmail(email) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      return result.rows[0];
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
      return result.rows[0];
    } catch (error) {
      console.error("Error finding user by id:", error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const result = await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
        [userData.name, userData.email, userData.password, userData.role]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const result = await db.query(
        "SELECT id, name, email, role, is_banned FROM users"
      );
      return result.rows;
    } catch (error) {
      console.error("Error finding all users:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query("DELETE FROM users WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  static async ban(id) {
    try {
      await db.query("UPDATE users SET is_banned = true WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error banning user:", error);
      throw error;
    }
  }

  static async unban(id) {
    try {
      await db.query("UPDATE users SET is_banned = false WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error unbanning user:", error);
      throw error;
    }
  }

  static async checkBanned(id) {
    try {
      const result = await db.query(
        "SELECT is_banned FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0]?.is_banned || false;
    } catch (error) {
      console.error("Error checking banned status:", error);
      throw error;
    }
  }
}

module.exports = User;
