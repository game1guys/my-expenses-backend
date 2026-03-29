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
exports.googleLoginUser = exports.loginUser = exports.registerUser = void 0;
const supabase_1 = require("../database/supabase");
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const { data, error } = yield supabase_1.supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name,
                phone,
            },
        },
    });
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({ message: 'User registered successfully', data });
});
exports.registerUser = registerUser;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
    }
    const { data, error } = yield supabase_1.supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        return res.status(401).json({ error: error.message });
    }
    // Inject Profile metadata (specifically the subscription tier) for the User Client
    const { data: profileData } = yield supabase_1.supabase
        .from('profiles')
        .select('full_name, phone, subscription_tier, subscription_end_date')
        .eq('id', (_a = data.session) === null || _a === void 0 ? void 0 : _a.user.id)
        .single();
    return res.status(200).json({
        message: 'Login successful',
        session: data.session,
        profile: profileData || { subscription_tier: 'free' }
    });
});
exports.loginUser = loginUser;
const googleLoginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id_token } = req.body;
    if (!id_token) {
        return res.status(400).json({ error: 'Missing native Google id_token from device payload' });
    }
    const { data, error } = yield supabase_1.supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
    });
    if (error) {
        return res.status(401).json({ error: error.message });
    }
    // Inject Profile metadata (specifically the subscription tier) for the User Client
    const { data: profileData } = yield supabase_1.supabase
        .from('profiles')
        .select('full_name, phone, subscription_tier, subscription_end_date')
        .eq('id', (_a = data.session) === null || _a === void 0 ? void 0 : _a.user.id)
        .single();
    return res.status(200).json({
        message: 'Google login successful',
        session: data.session,
        profile: profileData || { subscription_tier: 'free' }
    });
});
exports.googleLoginUser = googleLoginUser;
