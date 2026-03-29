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
exports.addUdharTransaction = exports.triggerManualReminder = exports.deleteParty = exports.updateParty = exports.createParty = exports.getParties = void 0;
const supabase_1 = require("../database/supabase");
const email_service_1 = require("../services/email.service");
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
    const { name, phone, email, reminder_frequency, reminder_start_date } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Party name is required' });
    }
    const { data, error } = yield supabase_1.supabase
        .from('parties')
        .insert([{
            user_id: userId,
            name,
            phone,
            email,
            reminder_frequency: reminder_frequency || 0,
            reminder_start_date: reminder_start_date || null
        }])
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({ party: data });
});
exports.createParty = createParty;
const updateParty = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    const { name, phone, email, reminder_frequency, reminder_start_date } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('parties')
        .update({
        name,
        phone,
        email,
        reminder_frequency,
        reminder_start_date
    })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ party: data });
});
exports.updateParty = updateParty;
const deleteParty = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    const { error } = yield supabase_1.supabase
        .from('parties')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ message: 'Party deleted successfully' });
});
exports.deleteParty = deleteParty;
const triggerManualReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { partyId } = req.body;
    try {
        // 1. Get party and their current balance
        const { data: party, error: pError } = yield supabase_1.supabase
            .from('parties')
            .select('*, udhar_transactions(*)')
            .eq('id', partyId)
            .eq('user_id', userId)
            .single();
        if (pError || !party) {
            return res.status(404).json({ error: 'Party not found' });
        }
        if (!party.email) {
            return res.status(400).json({ error: 'Party email is missing' });
        }
        // Calculate balance
        let balance = 0;
        party.udhar_transactions.forEach((tx) => {
            if (tx.type === 'given')
                balance += Number(tx.amount);
            else
                balance -= Number(tx.amount);
        });
        if (balance <= 0) {
            return res.status(400).json({ error: 'No outstanding balance found' });
        }
        // Get user full name
        const { data: profile } = yield supabase_1.supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
        const senderName = (profile === null || profile === void 0 ? void 0 : profile.full_name) || 'Daily-KHATA User';
        // 2. Send email
        yield (0, email_service_1.sendReminderEmail)(party.email, party.name, balance, senderName);
        // 3. Update party last reminder sent
        yield supabase_1.supabase
            .from('parties')
            .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminders_sent_today: (party.reminders_sent_today || 0) + 1
        })
            .eq('id', partyId);
        return res.status(200).json({ message: 'Reminder email sent successfully' });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.triggerManualReminder = triggerManualReminder;
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
