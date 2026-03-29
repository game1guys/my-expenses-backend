"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/me', auth_middleware_1.requireAuth, profile_controller_1.getMe);
router.put('/me', auth_middleware_1.requireAuth, profile_controller_1.updateProfile);
exports.default = router;
