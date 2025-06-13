const express = require("express");
const router = express.Router();
const RentalController = require("../controllers/rentalController");
const { checkAuth, checkRole } = require("../middleware/auth");

// Debug middleware
router.use((req, res, next) => {
  console.log("Rental route accessed:", {
    path: req.path,
    method: req.method,
    session: req.session,
    user: req.session.user,
  });
  next();
});

// Получение списка аренд
router.get(
  "/history",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  RentalController.getAllRentals
);

// Создание новой аренды
router.post(
  "/",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  RentalController.createRental
);

// Возврат носителя
router.post(
  "/:id/return",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  RentalController.returnMedia
);

module.exports = router;
