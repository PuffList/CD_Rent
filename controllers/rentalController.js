const Rental = require('../models/Rental');
const Media = require('../models/Media');

class RentalController {
    static async getUserHistory(req, res) {
        try {
            const rentals = await Rental.getUserRentals(req.session.user.id);
            res.render('history', { rentals });
        } catch (error) {
            res.status(500).send('Ошибка при загрузке истории аренды');
        }
    }

    static async getAllRentals(req, res) {
        try {
            const rentals = await Rental.findAll();
            res.json(rentals);
        } catch (error) {
            console.error('Error getting rentals:', error);
            res.status(500).json({ error: 'Ошибка при получении списка аренд' });
        }
    }

    static async createRental(req, res) {
        try {
            // Получаем mediaId из запроса
            const { mediaId } = req.body;
            
            // Берем userId либо из запроса, либо из сессии
            const userId = req.body.userId || req.session.user.id;
            
            if (!userId) {
                return res.status(400).json({ error: 'ID пользователя не указан' });
            }
            
            if (!mediaId) {
                return res.status(400).json({ error: 'ID медиа не указан' });
            }
            
            console.log('Creating rental for user:', userId, 'media:', mediaId);

            // Проверяем доступность носителя
            const media = await Media.findById(mediaId);
            if (!media) {
                return res.status(404).json({ error: 'Носитель не найден' });
            }
            
            if (media.status !== 'Available') {
                return res.status(400).json({ error: 'Носитель недоступен для аренды' });
            }

            // Создаем аренду - исправленный вызов с объектом
            const rental = await Rental.create({
                user_id: userId,
                media_id: mediaId
            });
            
            // Обновляем статус носителя
            await Media.update(mediaId, { ...media, status: 'Rented' });

            res.status(201).json(rental);
        } catch (error) {
            console.error('Error creating rental:', error);
            res.status(500).json({ error: 'Ошибка при создании аренды' });
        }
    }

    static async returnMedia(req, res) {
        try {
            const mediaId = req.params.id;
            
            // Проверяем существование носителя
            const media = await Media.findById(mediaId);
            if (!media) {
                return res.status(404).json({ error: 'Носитель не найден' });
            }

            // Находим активную аренду для этого носителя
            const rental = await Rental.findActiveByMediaId(mediaId);
            if (!rental) {
                return res.status(400).json({ error: 'Активная аренда не найдена' });
            }

            // Обновляем статус аренды
            await Rental.return(rental.id);
            
            // Обновляем статус носителя
            await Media.update(mediaId, { ...media, status: 'Available' });

            res.json({ message: 'Носитель успешно возвращен' });
        } catch (error) {
            console.error('Error returning media:', error);
            res.status(500).json({ error: 'Ошибка при возврате носителя' });
        }
    }
}

module.exports = RentalController; 