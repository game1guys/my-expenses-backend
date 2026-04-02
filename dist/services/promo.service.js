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
exports.baseAmountPaise = baseAmountPaise;
exports.resolvePromoForUser = resolvePromoForUser;
exports.recordPromoRedemption = recordPromoRedemption;
const supabase_1 = require("../database/supabase");
const PLAN_AMOUNTS_PAISE = {
    premium_mon: 29 * 100,
    premium_yr: 199 * 100,
    premium_life: 699 * 100,
};
function baseAmountPaise(planType) {
    var _a;
    return (_a = PLAN_AMOUNTS_PAISE[planType]) !== null && _a !== void 0 ? _a : null;
}
function resolvePromoForUser(planType, promoCode, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const originalPaise = baseAmountPaise(planType);
        if (originalPaise == null) {
            return { ok: false, error: 'Invalid plan type' };
        }
        const trimmed = promoCode === null || promoCode === void 0 ? void 0 : promoCode.trim();
        if (!trimmed) {
            return { ok: true, amountPaise: originalPaise, originalPaise, percentOff: 0, promoId: null };
        }
        const normalized = trimmed.toUpperCase();
        const { data: promo, error } = yield supabase_1.supabase
            .from('promo_codes')
            .select('id, percent_off, max_uses, used_count, expires_at, is_active')
            .eq('code', normalized)
            .maybeSingle();
        if (error || !promo) {
            return { ok: false, error: 'Invalid promo code' };
        }
        if (!promo.is_active) {
            return { ok: false, error: 'This promo code is inactive' };
        }
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return { ok: false, error: 'This promo code has expired' };
        }
        if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
            return { ok: false, error: 'This promo code is no longer available' };
        }
        const { count: prior } = yield supabase_1.supabase
            .from('promo_redemptions')
            .select('*', { count: 'exact', head: true })
            .eq('promo_id', promo.id)
            .eq('user_id', userId);
        if (prior && prior > 0) {
            return { ok: false, error: 'You have already used this promo code' };
        }
        const percentOff = Number(promo.percent_off);
        const discounted = Math.round((originalPaise * (100 - percentOff)) / 100);
        const amountPaise = Math.max(100, discounted);
        return {
            ok: true,
            amountPaise,
            originalPaise,
            percentOff,
            promoId: promo.id,
        };
    });
}
function recordPromoRedemption(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { promoId, userId, planType, razorpayPaymentId } = params;
        const { data: existing } = yield supabase_1.supabase
            .from('promo_redemptions')
            .select('id')
            .eq('razorpay_payment_id', razorpayPaymentId)
            .maybeSingle();
        if (existing) {
            return { ok: true };
        }
        const { error: insErr } = yield supabase_1.supabase.from('promo_redemptions').insert({
            promo_id: promoId,
            user_id: userId,
            plan_type: planType,
            razorpay_payment_id: razorpayPaymentId,
        });
        if (insErr) {
            const dup = insErr.code === '23505' ||
                insErr.code === '23505' ||
                String(insErr.message || '').toLowerCase().includes('duplicate');
            if (dup) {
                return { ok: true };
            }
            return { ok: false, error: insErr.message };
        }
        const { data: row } = yield supabase_1.supabase.from('promo_codes').select('used_count').eq('id', promoId).single();
        const next = ((_a = row === null || row === void 0 ? void 0 : row.used_count) !== null && _a !== void 0 ? _a : 0) + 1;
        yield supabase_1.supabase.from('promo_codes').update({ used_count: next }).eq('id', promoId);
        return { ok: true };
    });
}
