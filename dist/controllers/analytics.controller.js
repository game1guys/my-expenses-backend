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
exports.getCategoryDistribution = exports.compareDates = exports.getWeeklyTrends = exports.getMonthlyBarGraph = void 0;
const supabase_1 = require("../database/supabase");
/**
 * UTILITY: Get All User Transactions
 */
const fetchUserTransactions = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .select('amount, type, category_id, transaction_date, categories(name, color)')
        .eq('user_id', userId);
    return { data: data || [], error };
});
/**
 * API 1: Monthly Bar Graph Data
 * Groups transactions by DAY (1st to 30th/31st) for the CURRENT month.
 */
const getMonthlyBarGraph = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield fetchUserTransactions(req.user.id);
    if (error)
        return res.status(500).json({ error: error.message });
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    // Initialize days map for current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = {};
    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        dailyData[dayStr] = { date: dayStr, income: 0, expense: 0, savings: 0 };
    }
    data.forEach((trx) => {
        const trxDate = new Date(trx.transaction_date);
        if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
            const dateKey = trx.transaction_date.split('T')[0];
            if (dailyData[dateKey]) {
                const amt = Number(trx.amount);
                if (trx.type === 'income')
                    dailyData[dateKey].income += amt;
                if (trx.type === 'expense')
                    dailyData[dateKey].expense += amt;
                dailyData[dateKey].savings = dailyData[dateKey].income - dailyData[dateKey].expense;
            }
        }
    });
    return res.status(200).json({ chartData: Object.values(dailyData) });
});
exports.getMonthlyBarGraph = getMonthlyBarGraph;
/**
 * API 2: Weekly Trends
 * Return Week 1, 2, 3, 4 grouping for current month.
 */
const getWeeklyTrends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield fetchUserTransactions(req.user.id);
    if (error)
        return res.status(500).json({ error: error.message });
    const currentMonth = new Date().getMonth();
    const weeklyData = [
        { week: 'Week 1', expense: 0, savings: 0, income: 0 },
        { week: 'Week 2', expense: 0, savings: 0, income: 0 },
        { week: 'Week 3', expense: 0, savings: 0, income: 0 },
        { week: 'Week 4', expense: 0, savings: 0, income: 0 }
    ];
    data.forEach((trx) => {
        const trxDate = new Date(trx.transaction_date);
        if (trxDate.getMonth() === currentMonth) {
            const day = trxDate.getDate();
            let weekIndex = 0;
            if (day > 7 && day <= 14)
                weekIndex = 1;
            else if (day > 14 && day <= 21)
                weekIndex = 2;
            else if (day > 21)
                weekIndex = 3;
            const amt = Number(trx.amount);
            if (trx.type === 'income')
                weeklyData[weekIndex].income += amt;
            if (trx.type === 'expense')
                weeklyData[weekIndex].expense += amt;
            weeklyData[weekIndex].savings = weeklyData[weekIndex].income - weeklyData[weekIndex].expense;
        }
    });
    return res.status(200).json({ weeklyTrends: weeklyData });
});
exports.getWeeklyTrends = getWeeklyTrends;
/**
 * API 3: Compare Two specific Dates
 * GET /api/analytics/compare?date1=2026-03-25&date2=2026-03-26
 */
const compareDates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const date1 = req.query.date1;
    const date2 = req.query.date2;
    if (!date1 || !date2)
        return res.status(400).json({ error: "Missing date1 or date2 query parameters." });
    const { data, error } = yield fetchUserTransactions(req.user.id);
    if (error)
        return res.status(500).json({ error: error.message });
    const metrics = {
        [date1]: { income: 0, expense: 0, savings: 0 },
        [date2]: { income: 0, expense: 0, savings: 0 }
    };
    data.forEach((trx) => {
        const d = trx.transaction_date.split('T')[0];
        if (d === date1 || d === date2) {
            const amt = Number(trx.amount);
            if (trx.type === 'income')
                metrics[d].income += amt;
            if (trx.type === 'expense')
                metrics[d].expense += amt;
            metrics[d].savings = metrics[d].income - metrics[d].expense;
        }
    });
    return res.status(200).json({ comparison: metrics });
});
exports.compareDates = compareDates;
/**
 * API 4: Category Wise Distribution Pipeline for Pie Charts
 */
const getCategoryDistribution = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield fetchUserTransactions(req.user.id);
    if (error)
        return res.status(500).json({ error: error.message });
    const distribution = {};
    data.forEach((trx) => {
        var _a, _b;
        if (trx.type === 'expense') {
            const catName = ((_a = trx.categories) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized';
            const color = ((_b = trx.categories) === null || _b === void 0 ? void 0 : _b.color) || '#cbd5e1';
            const amt = Number(trx.amount);
            if (!distribution[catName]) {
                distribution[catName] = { value: 0, color };
            }
            distribution[catName].value += amt;
        }
    });
    // Format array for recharts/victory chart libraries
    const chartArray = Object.keys(distribution).map(key => ({
        name: key,
        value: distribution[key].value,
        color: distribution[key].color
    })).sort((a, b) => b.value - a.value);
    return res.status(200).json({ categoryChart: chartArray });
});
exports.getCategoryDistribution = getCategoryDistribution;
