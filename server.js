const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const path = require("path");
const config = require("./config/database");
const { checkAuth, checkRole } = require("./middleware/auth");

// Импорт моделей
const Media = require("./models/Media");
const Rental = require("./models/Rental");
const User = require("./models/User");

// Импорт контроллеров
const AuthController = require("./controllers/authController");
const MediaController = require("./controllers/mediaController");
const RentalController = require("./controllers/rentalController");
const UserController = require("./controllers/userController");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionStore = new pgSession({
  conString: `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
  tableName: "session",
  createTableIfMissing: true,
});

app.use(
  session({
    secret: "your-secret-key-here",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Debug middleware
app.use((req, res, next) => {
  console.log("Request:", {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID,
    user: req.session.user,
  });
  next();
});

// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// AUTH ROUTES
app.post("/auth/register", AuthController.register);
app.post("/auth/login", AuthController.login);
app.post("/auth/logout", AuthController.logout);

// USER API ROUTES
app.get(
  "/api/users",
  checkAuth,
  checkRole("Администратор"),
  UserController.getAllUsers
);
app.post(
  "/api/users/employees",
  checkAuth,
  checkRole("Администратор"),
  UserController.createEmployee
);
app.delete(
  "/api/users/:id",
  checkAuth,
  checkRole("Администратор"),
  UserController.deleteUser
);
app.post(
  "/api/users/:id/ban",
  checkAuth,
  checkRole("Администратор"),
  UserController.banUser
);
app.post(
  "/api/users/:id/unban",
  checkAuth,
  checkRole("Администратор"),
  UserController.unbanUser
);

// MEDIA API ROUTES
app.get("/api/media", MediaController.getAllMedia);
app.post(
  "/api/media",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  MediaController.createMedia
);
app.put(
  "/api/media/:id",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  MediaController.updateMedia
);
app.delete(
  "/api/media/:id",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  MediaController.deleteMedia
);

// RENTAL API ROUTES
app.get(
  "/api/rentals/history",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  RentalController.getAllRentals
);
app.post(
  "/api/rentals",
  checkAuth,
  checkRole(["Администратор", "Сотрудник", "Клиент"]),
  RentalController.createRental
);
app.post(
  "/api/rentals/:id/return",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  RentalController.returnMedia
);

// WEB ROUTES (страницы)
// Главная страница с каталогом
app.get("/", async (req, res) => {
  try {
    const mediaList = await Media.findAll();
    res.render("index", {
      user: req.session.user,
      mediaList: mediaList || [],
    });
  } catch (error) {
    console.error("Error getting media list:", error);
    res.render("index", {
      user: req.session.user,
      mediaList: [],
    });
  }
});

// Страница входа
app.get("/login", (req, res) => {
  res.render("login");
});

// Страница регистрации
app.get("/register", (req, res) => {
  res.render("register");
});

// История проката (только для клиентов)
app.get("/history", checkAuth, checkRole(["Клиент"]), async (req, res) => {
  console.log("=== ACCESSING HISTORY ROUTE ===");
  console.log("Session user:", req.session.user);

  try {
    console.log("Fetching rentals for user ID:", req.session.user.id);
    const rentals = await Rental.getUserRentals(req.session.user.id);
    console.log("Retrieved rentals:", rentals);

    res.render("history", {
      user: req.session.user,
      rentals: rentals || [],
    });
  } catch (error) {
    console.error("Error in history route:", error);
    res.render("history", {
      user: req.session.user,
      rentals: [],
    });
  }
});

// Управление инвентарём (для сотрудников и администраторов)
app.get(
  "/manage",
  checkAuth,
  checkRole(["Администратор", "Сотрудник"]),
  async (req, res) => {
    try {
      const mediaList = await Media.findAll();
      const activeRentals = await Rental.getActiveCount();
      const returnedThisWeek = await Rental.getRecentReturns();

      res.render("manage", {
        user: req.session.user,
        mediaList: mediaList || [],
        activeRentals: activeRentals || 0,
        returnedThisWeek: returnedThisWeek || 0,
      });
    } catch (error) {
      console.error("Error getting media list:", error);
      res.render("manage", {
        user: req.session.user,
        mediaList: [],
        activeRentals: 0,
        returnedThisWeek: 0,
      });
    }
  }
);

// Панель администратора (только для администраторов)
app.get("/admin", checkAuth, checkRole("Администратор"), async (req, res) => {
  try {
    const users = await User.findAll();
    const rentals = await Rental.findAll();
    const totalRentals = rentals.length;
    const totalRevenue = await Rental.getTotalRevenue();

    res.render("admin", {
      user: req.session.user,
      currentUser: req.session.user,
      users: users || [],
      totalRentals,
      totalRevenue: totalRevenue || 0,
    });
  } catch (error) {
    console.error("Error getting admin data:", error);
    res.render("admin", {
      user: req.session.user,
      currentUser: req.session.user,
      users: [],
      totalRentals: 0,
      totalRevenue: 0,
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Application Error:", err.stack);
  if (req.path.startsWith("/api/")) {
    res.status(500).json({ error: "Что-то пошло не так!" });
  } else {
    res.status(500).send("Что-то пошло не так!");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
