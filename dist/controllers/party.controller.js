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
exports.addUdharTransaction = exports.createParty = exports.getParties = void 0;
const supabase_1 = require("../database/supabase");
const getParties = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { data, error } = yield supabase_1.supabase
        .from('parties')
        .select('*, udhar_transactions(*)')
        .eq('user_id', userId);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ parties: data });
});
exports.getParties = getParties;
const createParty = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { name, phone } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Party name is required' });
    }
    // Check premium status if enforcing limits
    // (e.g. Free users max 3 parties)
    const { data, error } = yield supabase_1.supabase
        .from('parties')
        .insert([{ user_id: userId, name, phone }])
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({ party: data });
});
exports.createParty = createParty;
const addUdharTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { party_id, amount, type, note, transaction_date } = req.body;
    if (!party_id || !amount || !type) {
        return res.status(400).json({ error: 'Party ID, amount, and type are required' });
    }
    const { data, error } = yield supabase_1.supabase
        .from('udhar_transactions')
        .insert([{
            party_id,
            user_id: userId,
            amount,
            type,
            note,
            transaction_date: transaction_date || new Date().toISOString()
        }])
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({ udhar_transaction: data });
});
exports.addUdharTransaction = addUdharTransaction;
