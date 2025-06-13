const Media = require('../models/Media');
const Rental = require('../models/Rental');

class MediaController {
    static async getCatalog(req, res) {
        try {
            const mediaList = await Media.getAll();
            res.render('index', { mediaList, user: req.session.user });
        } catch (error) {
            res.status(500).send('Ошибка при загрузке каталога');
        }
    }

    static async getManagePage(req, res) {
        try {
            const mediaList = await Media.getAll();
            const activeRentals = await Rental.getActiveCount();
            const returnedThisWeek = await Rental.getRecentReturns();

            res.render('manage', {
                mediaList,
                activeRentals,
                returnedThisWeek
            });
        } catch (error) {
            res.status(500).send('Ошибка при загрузке страницы управления');
        }
    }

    static async getAllMedia(req, res) {
        try {
            const media = await Media.findAll();
            res.json(media);
        } catch (error) {
            console.error('Error getting media:', error);
            res.status(500).json({ error: 'Ошибка при получении списка медиа' });
        }
    }

    static async createMedia(req, res) {
        try {
            const mediaData = req.body;
            const media = await Media.create(mediaData);
            res.status(201).json(media);
        } catch (error) {
            console.error('Error creating media:', error);
            res.status(500).json({ error: 'Ошибка при создании медиа' });
        }
    }

    static async updateMedia(req, res) {
        try {
            const { id } = req.params;
            const mediaData = req.body;
            const media = await Media.update(id, mediaData);
            res.json(media);
        } catch (error) {
            console.error('Error updating media:', error);
            res.status(500).json({ error: 'Ошибка при обновлении медиа' });
        }
    }

    static async deleteMedia(req, res) {
        try {
            const { id } = req.params;
            await Media.delete(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting media:', error);
            res.status(500).json({ error: 'Ошибка при удалении медиа' });
        }
    }
}

module.exports = MediaController; 