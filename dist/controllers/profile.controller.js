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
/**
 * Current user profile + subscription (Mobile “Me” screen).
 */
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const meta = user.user_metadata || {};
    const { data: profile, error } = yield supabase_1.supabase
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
            email: (_a = user.email) !== null && _a !== void 0 ? _a : null,
            full_name: (_c = (_b = profile === null || profile === void 0 ? void 0 : profile.full_name) !== null && _b !== void 0 ? _b : meta.full_name) !== null && _c !== void 0 ? _c : 'User',
            phone: (_e = (_d = profile === null || profile === void 0 ? void 0 : profile.phone) !== null && _d !== void 0 ? _d : meta.phone) !== null && _e !== void 0 ? _e : null,
        },
        subscription: {
            tier: (_f = profile === null || profile === void 0 ? void 0 : profile.subscription_tier) !== null && _f !== void 0 ? _f : 'free',
            end_date: (_g = profile === null || profile === void 0 ? void 0 : profile.subscription_end_date) !== null && _g !== void 0 ? _g : null,
        },
        member_since: (_j = (_h = profile === null || profile === void 0 ? void 0 : profile.created_at) !== null && _h !== void 0 ? _h : user.created_at) !== null && _j !== void 0 ? _j : null,
    });
});
exports.getMe = getMe;
/**
 * Update user profile (Name and Phone only).
 */
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { full_name, phone } = req.body;
    if (!full_name && !phone) {
        return res.status(400).json({ error: 'At least one field (full_name or phone) must be provided' });
    }
    const updateData = {};
    if (full_name !== undefined)
        updateData.full_name = full_name;
    if (phone !== undefined)
        updateData.phone = phone;
    const { data, error } = yield supabase_1.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    // Also update auth metadata for consistency
    yield supabase_1.supabase.auth.admin.updateUserById(user.id, {
        user_metadata: Object.assign(Object.assign({}, user.user_metadata), updateData),
    });
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
