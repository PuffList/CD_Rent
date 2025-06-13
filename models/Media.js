const db = require("./database");

class Media {
  static async findAll() {
    try {
      const result = await db.query("SELECT * FROM media ORDER BY id ASC");
      return result.rows;
    } catch (error) {
      console.error("Error finding all media:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query("SELECT * FROM media WHERE id = $1", [id]);
      return result.rows[0];
    } catch (error) {
      console.error("Error finding media by id:", error);
      throw error;
    }
  }

  static async create(mediaData) {
    try {
      const result = await db.query(
        "INSERT INTO media (title, type, rental_cost, genre, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [
          mediaData.title,
          mediaData.type,
          mediaData.rental_cost,
          mediaData.genre,
          mediaData.status || "Available",
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating media:", error);
      throw error;
    }
  }

  static async update(id, mediaData) {
    try {
      // Получаем текущие данные носителя
      const currentMedia = await this.findById(id);
      if (!currentMedia) {
        throw new Error("Media not found");
      }

      // Сохраняем текущий статус, если он не был явно изменен
      const status = mediaData.status || currentMedia.status;

      const result = await db.query(
        "UPDATE media SET title = $1, type = $2, rental_cost = $3, genre = $4, status = $5 WHERE id = $6 RETURNING *",
        [
          mediaData.title,
          mediaData.type,
          mediaData.rental_cost,
          mediaData.genre,
          status,
          id,
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error updating media:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query("DELETE FROM media WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error deleting media:", error);
      throw error;
    }
  }
}

module.exports = Media;
