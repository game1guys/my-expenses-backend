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
exports.deleteTransaction = exports.updateTransaction = exports.getTransactionById = exports.getSummary = exports.getTransactions = exports.addTransaction = void 0;
const supabase_1 = require("../database/supabase");
const storage_service_1 = require("../services/storage.service");
const addTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { amount, category_id, type, note, transaction_date, party_id, party_name, udhar_type } = req.body;
        if (!amount || !type || !category_id) {
            return res.status(400).json({ error: 'Amount, type, and category_id are mathematically required.' });
        }
        // Upload Invoice if present
        let receipt_url = req.body.receipt_url;
        if (req.file) {
            try {
                receipt_url = yield storage_service_1.StorageService.uploadFile('invoices', String(userId), req.file);
            }
            catch (err) {
                console.error('Invoice upload failed:', err);
            }
        }
        // Validate Category and Type
        const { data: category, error: catError } = yield supabase_1.supabase
            .from('categories')
            .select('type')
            .eq('id', category_id)
            .single();
        if (catError || !category) {
            return res.status(400).json({ error: 'Invalid category selected.' });
        }
        if (category.type !== type) {
            return res.status(400).json({ error: `Category type (${category.type}) does not match transaction type (${type}).` });
        }
        // Check Free Plan Limits (100 tx/month, 3 parties)
        const { data: profile } = yield supabase_1.supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();
        if ((profile === null || profile === void 0 ? void 0 : profile.subscription_tier) === 'free') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const { count: txCount } = yield supabase_1.supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('transaction_date', startOfMonth.toISOString());
            if (txCount && txCount >= 100) {
                return res.status(403).json({ error: 'Monthly transaction limit (100) reached for Free Plan. Please upgrade to Premium.' });
            }
            if (!party_id && party_name) {
                const { count: partyCount } = yield supabase_1.supabase
                    .from('parties')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId);
                if (partyCount && partyCount >= 3) {
                    return res.status(403).json({ error: 'Party limit (3) reached for Free Plan. Please upgrade to Premium.' });
                }
            }
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
                amount: Number(amount), // Ensure number
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
        // Handle Udhar Transaction if needed
        if (udhar_type && resolvedPartyId) {
            yield supabase_1.supabase.from('parties').update({
                reminders_sent_today: 0, // Reset for new debt
            }).eq('id', resolvedPartyId);
        }
        return res.status(201).json({ transaction: data });
    }
    catch (err) {
        console.error('Add Transaction Error:', err);
        return res.status(500).json({ error: err.message || 'Server side error' });
    }
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
const getTransactionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    const { data, error } = yield supabase_1.supabase
        .from('transactions')
        .select('*, categories(*), parties(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (error || !data) {
        return res.status(404).json({ error: 'Transaction not found.' });
    }
    return res.status(200).json({ transaction: data });
});
exports.getTransactionById = getTransactionById;
const updateTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        const { amount, category_id, type, note, transaction_date, party_id, party_name } = req.body;
        if (!amount || !type || !category_id) {
            return res.status(400).json({ error: 'Amount, type, and category_id are mathematically required.' });
        }
        // Upload Invoice if present
        let receipt_url = req.body.receipt_url;
        if (req.file) {
            try {
                receipt_url = yield storage_service_1.StorageService.uploadFile('invoices', String(userId), req.file);
            }
            catch (err) {
                console.error('Invoice upload failed:', err);
            }
        }
        // Validate Category and Type
        const { data: category, error: catError } = yield supabase_1.supabase
            .from('categories')
            .select('type')
            .eq('id', category_id)
            .single();
        if (catError || !category) {
            return res.status(400).json({ error: 'Invalid category selected.' });
        }
        if (category.type !== type) {
            return res.status(400).json({ error: `Category type (${category.type}) does not match transaction type (${type}).` });
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
            .update({
            amount: Number(amount),
            category_id,
            party_id: resolvedPartyId || null,
            type,
            note,
            transaction_date,
            receipt_url
        })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json({ transaction: data });
    }
    catch (err) {
        console.error('Update Transaction Error:', err);
        return res.status(500).json({ error: err.message || 'Server side error' });
    }
});
exports.updateTransaction = updateTransaction;
const deleteTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    const { error } = yield supabase_1.supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ message: 'Transaction deleted successfully.' });
});
exports.deleteTransaction = deleteTransaction;
