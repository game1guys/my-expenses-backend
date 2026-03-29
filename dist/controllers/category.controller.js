"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomCategory = exports.getCategories = void 0;
const supabase_1 = require("../database/supabase");
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    // Fetch global base categories (user_id IS NULL) and user-specific custom categories
    const { data, error } = yield supabase_1.supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${userId}`);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ categories: data });
});
exports.getCategories = getCategories;
const createCustomCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { name, type, icon, color } = req.body;
    if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
    }
    const { data, error } = yield supabase_1.supabase
        .from('categories')
        .insert([{
            user_id: userId,
            name,
            type,
            icon: icon || 'Circle',
            color: color || '#aaaaaa'
        }])
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({ category: data });
});
exports.createCustomCategory = createCustomCategory;
