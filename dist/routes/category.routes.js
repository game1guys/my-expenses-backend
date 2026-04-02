"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, category_controller_1.getCategories);
router.post('/custom', auth_middleware_1.requireAuth, upload_middleware_1.upload.single('image'), category_controller_1.createCustomCategory);
router.put('/:id/budget', auth_middleware_1.requireAuth, category_controller_1.updateCategoryBudget);
// Alias (some clients use POST for budget updates)
router.post('/:id/budget', auth_middleware_1.requireAuth, category_controller_1.updateCategoryBudget);
router.post('/set-monthly-budget', auth_middleware_1.requireAuth, category_controller_1.setMonthlyBudget);
router.post('/update-budget', auth_middleware_1.requireAuth, category_controller_1.setMonthlyBudget);
router.put('/update-budget', auth_middleware_1.requireAuth, category_controller_1.setMonthlyBudget); // Add PUT as well
router.post('/update', auth_middleware_1.requireAuth, category_controller_1.setMonthlyBudget); // Even shorter route just in case
exports.default = router;
