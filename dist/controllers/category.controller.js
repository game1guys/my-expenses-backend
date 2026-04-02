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
exports.setMonthlyBudget = exports.updateCategoryBudget = exports.createCustomCategory = exports.getCategories = void 0;
const supabase_1 = require("../database/supabase");
const storage_service_1 = require("../services/storage.service");
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    // Fetch global base categories (user_id IS NULL) and user-specific custom categories
    const { data: cats, error: catError } = yield supabase_1.supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${userId}`);
    if (catError) {
        return res.status(400).json({ error: catError.message });
    }
    // If month_year is provided, fetch budgets and spent amounts for that month
    const { month_year } = req.query;
    let budgets = [];
    let spentMap = {};
    if (month_year && typeof month_year === 'string') {
        // Fetch budgets
        const { data: budgetData } = yield supabase_1.supabase
            .from('category_budgets')
            .select('category_id, amount')
            .eq('user_id', userId)
            .eq('month_year', month_year);
        budgets = budgetData || [];
        // Fetch spent amount per category for this month
        // month_year is "YYYY-MM"
        const startOfMonth = `${month_year}-01`;
        const [year, month] = month_year.split('-').map(Number);
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
        const { data: spentData } = yield supabase_1.supabase
            .from('transactions')
            .select('category_id, amount')
            .eq('user_id', userId)
            .eq('type', 'expense')
            .gte('transaction_date', startOfMonth)
            .lte('transaction_date', endOfMonth);
        spentMap = (spentData || []).reduce((acc, t) => {
            acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
            return acc;
        }, {});
    }
    // Merge budgets and spent amounts into categories
    const categories = cats.map(c => {
        const b = budgets.find(b => b.category_id === c.id);
        return Object.assign(Object.assign({}, c), { monthly_budget: b ? b.amount : null, spent_amount: spentMap[c.id] || 0 });
    });
    return res.status(200).json({ categories });
});
exports.getCategories = getCategories;
const createCustomCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { name, type, icon, color, monthly_budget } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        let icon_url = null;
        if (req.file) {
            try {
                icon_url = yield storage_service_1.StorageService.uploadFile('category-icons', String(userId), req.file);
            }
            catch (err) {
                console.error('Category icon upload failed:', err);
                return res.status(400).json({ error: `Image upload failed: ${err.message}` });
            }
        }
        const { data, error } = yield supabase_1.supabase
            .from('categories')
            .insert([{
                user_id: userId,
                name,
                type,
                icon: icon || 'Circle',
                color: color || '#aaaaaa',
                icon_url,
                monthly_budget: monthly_budget ? Number(monthly_budget) : null
            }])
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(201).json({ category: data });
    }
    catch (err) {
        console.error('Create Category Error:', err);
        return res.status(500).json({ error: err.message || 'Server side error' });
    }
});
exports.createCustomCategory = createCustomCategory;
const updateCategoryBudget = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    const { monthly_budget, month_year } = req.body;
    if (monthly_budget === undefined || !month_year) {
        return res.status(400).json({ error: 'monthly_budget and month_year are required' });
    }
    // month_year format: "YYYY-MM"
    const { data, error } = yield supabase_1.supabase
        .from('category_budgets')
        .upsert({
        user_id: userId,
        category_id: id,
        month_year,
        amount: Number(monthly_budget)
    }, { onConflict: 'user_id,category_id,month_year' })
        .select()
        .single();
    if (error) {
        console.error('Update Category Budget DB Error:', error);
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ budget: data });
});
exports.updateCategoryBudget = updateCategoryBudget;
const setMonthlyBudget = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { category_id, monthly_budget, month_year } = req.body;
    if (!category_id || monthly_budget === undefined || !month_year) {
        return res.status(400).json({ error: 'category_id, monthly_budget and month_year are required' });
    }
    // month_year format: "YYYY-MM"
    const { data, error } = yield supabase_1.supabase
        .from('category_budgets')
        .upsert({
        user_id: userId,
        category_id,
        month_year,
        amount: Number(monthly_budget)
    }, { onConflict: 'user_id,category_id,month_year' })
        .select()
        .single();
    if (error) {
        console.error('Set Monthly Budget DB Error:', error);
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ budget: data });
});
exports.setMonthlyBudget = setMonthlyBudget;
