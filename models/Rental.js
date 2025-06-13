const db = require("./database");

class Rental {
  static async findAll() {
    try {
      const result = await db.query(`
                SELECT r.*, u.name as user_name, m.title as media_title 
                FROM rentals r 
                JOIN users u ON r.user_id = u.id 
                JOIN media m ON r.media_id = m.id
            `);
      return result.rows;
    } catch (error) {
      console.error("Error finding all rentals:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query(
        `
                SELECT r.*, u.name as user_name, m.title as media_title 
                FROM rentals r 
                JOIN users u ON r.user_id = u.id 
                JOIN media m ON r.media_id = m.id 
                WHERE r.id = $1
            `,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error finding rental by id:", error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const result = await db.query(
        `
                SELECT r.*, m.title as media_title 
                FROM rentals r 
                JOIN media m ON r.media_id = m.id 
                WHERE r.user_id = $1
            `,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error("Error finding rentals by user id:", error);
      throw error;
    }
  }

  static async findActiveByMediaId(mediaId) {
    try {
      const result = await db.query(
        `
                SELECT r.*, u.name as user_name 
                FROM rentals r 
                JOIN users u ON r.user_id = u.id 
                WHERE r.media_id = $1 AND r.return_date IS NULL
            `,
        [mediaId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error finding active rental by media id:", error);
      throw error;
    }
  }

  static async create(rentalData) {
    try {
      // Получаем текущую стоимость носителя
      const mediaResult = await db.query(
        "SELECT rental_cost FROM media WHERE id = $1",
        [rentalData.media_id]
      );
      
      if (mediaResult.rows.length === 0) {
        throw new Error("Media not found");
      }
      
      const rentalCost = mediaResult.rows[0].rental_cost;
      
      // Сохраняем аренду вместе со стоимостью на момент аренды
      const result = await db.query(
        "INSERT INTO rentals (user_id, media_id, rent_date, due_date, rental_cost) VALUES ($1, $2, NOW(), NOW() + INTERVAL '7 days', $3) RETURNING *",
        [rentalData.user_id, rentalData.media_id, rentalCost]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating rental:", error);
      throw error;
    }
  }

  static async return(id) {
    try {
      const result = await db.query(
        "UPDATE rentals SET return_date = NOW() WHERE id = $1 RETURNING *",
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error returning rental:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query("DELETE FROM rentals WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error deleting rental:", error);
      throw error;
    }
  }

  static async getActiveRentals() {
    try {
      const result = await db.query(
        "SELECT * FROM rentals WHERE return_date IS NULL"
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting active rentals:", error);
      return [];
    }
  }

  static async getRentalsByUserId(userId) {
    try {
      const result = await db.query(
        "SELECT * FROM rentals WHERE user_id = $1",
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting rentals by user id:", error);
      return [];
    }
  }

  static async getUserRentals(userId) {
    try {
      const result = await db.query(
        `
                SELECT r.*, m.title, m.type 
                FROM rentals r 
                JOIN media m ON r.media_id = m.id 
                WHERE r.user_id = $1
                ORDER BY r.rent_date DESC
            `,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting user rentals:", error);
      throw error;
    }
  }

  static async getActiveCount() {
    try {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM rentals WHERE return_date IS NULL"
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting active rentals count:", error);
      return 0;
    }
  }

  static async getRecentReturns() {
    try {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM rentals WHERE return_date >= NOW() - INTERVAL '7 days'"
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting recent returns count:", error);
      return 0;
    }
  }

  static async getTotalRevenue() {
    try {
      const result = await db.query(`
                SELECT COALESCE(SUM(r.rental_cost), 0) as total_revenue 
                FROM rentals r 
      `);
      return parseFloat(result.rows[0].total_revenue) || 0;
    } catch (error) {
      console.error("Error getting total revenue:", error);
      return 0;
    }
  }
}

module.exports = Rental;
