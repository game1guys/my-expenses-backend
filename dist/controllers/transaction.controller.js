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
exports.getSummary = exports.getTransactions = exports.addTransaction = void 0;
const supabase_1 = require("../database/supabase");
const addTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { amount, category_id, type, note, transaction_date, receipt_url, party_id, party_name } = req.body;
    if (!amount || !type || !category_id) {
        return res.status(400).json({ error: 'Amount, type, and category_id are mathematically required.' });
    }
    // Intelligent Udhar Node Resolution
    let resolvedPartyId = party_id;
    if (!resolvedPartyId && party_name) {
        const { data: newParty, error: pError } = yield supabase_1.supabase
            .from('parties')
            .insert([{ user_id: userId, name: party_name }])
            .select()
            .single();
        if (!pError && newParty) {
            resolvedPartyId = newParty.id;
        }
    }
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .insert([{
            user_id: userId,
            amount,
            category_id,
            party_id: resolvedPartyId || null,
            type,
            note,
            transaction_date: transaction_date || new Date().toISOString(),
            receipt_url
        }])
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({ transaction: data });
});
exports.addTransaction = addTransaction;
const getTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { data, error, count } = yield supabase_1.supabase
        .from('transactions')
        .select('*, categories(*), parties(*)', { count: 'exact' })
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({
        transactions: data,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page
    });
});
exports.getTransactions = getTransactions;
const getSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .select('amount, type, category_id, transaction_date, categories(name, color, type)')
        .eq('user_id', userId);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    let totalIncome = 0;
    let totalExpense = 0;
    const categorySplit = {};
    if (data) {
        data.forEach((trx) => {
            var _a, _b;
            const amt = Number(trx.amount);
            if (trx.type === 'income') {
                totalIncome += amt;
            }
            else if (trx.type === 'expense') {
                totalExpense += amt;
                const catName = ((_a = trx.categories) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized';
                const color = ((_b = trx.categories) === null || _b === void 0 ? void 0 : _b.color) || '#cccccc';
                if (!categorySplit[catName]) {
                    categorySplit[catName] = { name: catName, color, total: 0 };
                }
                categorySplit[catName].total += amt;
            }
        });
    }
    const totalSavings = totalIncome - totalExpense;
    return res.status(200).json({
        summary: {
            totalIncome,
            totalExpense,
            totalSavings,
            categorySplit: Object.values(categorySplit)
        }
    });
});
exports.getSummary = getSummary;
