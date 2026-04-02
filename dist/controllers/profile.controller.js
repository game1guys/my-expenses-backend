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
exports.updateProfile = exports.getMe = void 0;
const supabase_1 = require("../database/supabase");
const supabaseUserClient_1 = require("../database/supabaseUserClient");
/**
 * Current user profile + subscription (Mobile “Me” screen).
 */
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const accessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!accessToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const meta = user.user_metadata || {};
    const sb = (0, supabaseUserClient_1.createSupabaseForUser)(accessToken);
    const { data: profile, error } = yield sb
        .from('profiles')
        .select('full_name, phone, subscription_tier, subscription_end_date, created_at')
        .eq('id', user.id)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({
        user: {
            id: user.id,
            email: (_b = user.email) !== null && _b !== void 0 ? _b : null,
            full_name: (_d = (_c = profile === null || profile === void 0 ? void 0 : profile.full_name) !== null && _c !== void 0 ? _c : meta.full_name) !== null && _d !== void 0 ? _d : 'User',
            phone: (_f = (_e = profile === null || profile === void 0 ? void 0 : profile.phone) !== null && _e !== void 0 ? _e : meta.phone) !== null && _f !== void 0 ? _f : null,
        },
        subscription: {
            tier: (_g = profile === null || profile === void 0 ? void 0 : profile.subscription_tier) !== null && _g !== void 0 ? _g : 'free',
            end_date: (_h = profile === null || profile === void 0 ? void 0 : profile.subscription_end_date) !== null && _h !== void 0 ? _h : null,
        },
        member_since: (_k = (_j = profile === null || profile === void 0 ? void 0 : profile.created_at) !== null && _j !== void 0 ? _j : user.created_at) !== null && _k !== void 0 ? _k : null,
    });
});
exports.getMe = getMe;
/**
 * Update user profile (Name and Phone only).
 */
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { full_name, phone, fcm_token } = req.body;
    const updateData = {};
    if (full_name !== undefined)
        updateData.full_name = full_name;
    if (phone !== undefined)
        updateData.phone = phone;
    if (fcm_token !== undefined)
        updateData.fcm_token = fcm_token;
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'At least one field (full_name, phone, or fcm_token) must be provided' });
    }
    const accessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!accessToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const sb = (0, supabaseUserClient_1.createSupabaseForUser)(accessToken);
    const { data, error } = yield sb
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
    if (error) {
        console.error('Update Profile DB Error:', error);
        return res.status(400).json({ error: error.message });
    }
    // Sync name/phone to auth metadata (needs service role — optional)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const meta = Object.assign({}, user.user_metadata);
            if (full_name !== undefined)
                meta.full_name = full_name;
            if (phone !== undefined)
                meta.phone = phone;
            yield supabase_1.supabase.auth.admin.updateUserById(user.id, {
                user_metadata: meta,
            });
        }
        catch (authErr) {
            console.warn('Auth metadata sync skipped:', authErr);
        }
    }
    return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
            id: user.id,
            email: user.email,
            full_name: data.full_name,
            phone: data.phone,
        },
    });
});
exports.updateProfile = updateProfile;
