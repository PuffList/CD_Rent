const User = require("../models/User");

const checkAuth = async (req, res, next) => {
  console.log("Checking auth:", {
    path: req.path,
    session: req.session,
    user: req.session.user,
  });

  if (!req.session.user) {
    console.log("No user in session, redirecting to login");
    // Проверяем, является ли запрос API-запросом
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    // Для веб-маршрутов перенаправляем на страницу входа
    return res.redirect("/login");
  }

  // Проверяем, не заблокирован ли пользователь
  if (req.session.user.role === "Клиент") {
    try {
      const isBanned = await User.checkBanned(req.session.user.id);
      if (isBanned) {
        console.log("User is banned:", req.session.user.id);
        req.session.destroy();
        if (req.path.startsWith("/api/")) {
          return res
            .status(403)
            .json({
              error: "Ваш аккаунт заблокирован. Обратитесь к администратору.",
            });
        }
        return res.redirect("/login?error=banned");
      }
    } catch (error) {
      console.error("Error checking ban status:", error);
      req.session.destroy();
      if (req.path.startsWith("/api/")) {
        return res.status(401).json({ error: "Ошибка авторизации" });
      }
      return res.redirect("/login?error=auth");
    }
  }

  next();
};

const checkRole = (allowedRoles) => {
  // Убедимся, что allowedRoles - это массив
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    console.log("Checking role:", {
      path: req.path,
      userRole: req.session.user?.role,
      allowedRoles: roles,
    });

    if (!req.session.user) {
      console.log("No user in session during role check");
      if (req.path.startsWith("/api/")) {
        return res.status(401).json({ error: "Требуется авторизация" });
      }
      return res.redirect("/login");
    }

    // Проверяем роль пользователя
    const userRole = req.session.user.role;
    if (!roles.includes(userRole)) {
      console.log("Access denied:", {
        path: req.path,
        userRole,
        allowedRoles: roles,
      });
      if (req.path.startsWith("/api/")) {
        return res.status(403).json({ error: "Недостаточно прав" });
      }
      return res.redirect("/?error=access");
    }

    console.log("Role check passed:", {
      path: req.path,
      userRole,
      allowedRoles: roles,
    });
    next();
  };
};

module.exports = {
  checkAuth,
  checkRole,
};
