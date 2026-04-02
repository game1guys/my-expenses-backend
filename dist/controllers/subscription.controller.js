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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.createOrder = exports.previewSubscription = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../database/supabase");
const dotenv_1 = __importDefault(require("dotenv"));
const promo_service_1 = require("../services/promo.service");
dotenv_1.default.config();
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'ze5jwCnB5g7sNHucPTTpoYeF';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SWfo8B11r0U8fL';
const razorpay = new razorpay_1.default({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});
const previewSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { planType, promoCode } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const resolved = yield (0, promo_service_1.resolvePromoForUser)(planType, promoCode, userId);
        if (!resolved.ok) {
            return res.status(400).json({ error: resolved.error });
        }
        return res.json({
            amountPaise: resolved.amountPaise,
            originalPaise: resolved.originalPaise,
            percentOff: resolved.percentOff,
            currency: 'INR',
        });
    }
    catch (error) {
        console.error('Preview subscription error:', error);
        return res.status(500).json({ error: error.message });
    }
});
exports.previewSubscription = previewSubscription;
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { planType, promoCode } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const resolved = yield (0, promo_service_1.resolvePromoForUser)(planType, promoCode, userId);
        if (!resolved.ok) {
            return res.status(400).json({ error: resolved.error });
        }
        const notes = {
            planType: String(planType),
            userId: String(userId),
        };
        if (resolved.promoId) {
            notes.promoId = String(resolved.promoId);
        }
        const options = {
            amount: resolved.amountPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes,
        };
        const order = yield razorpay.orders.create(options);
        res.json(order);
    }
    catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createOrder = createOrder;
const verifyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ status: 'failure', message: 'Invalid signature' });
        }
        const order = yield razorpay.orders.fetch(razorpay_order_id);
        const notes = (order.notes || {});
        if (notes.userId && notes.userId !== String(userId)) {
            return res.status(400).json({ error: 'Order does not belong to this user' });
        }
        if (notes.planType && notes.planType !== planType) {
            return res.status(400).json({ error: 'Plan mismatch' });
        }
        let endDate = new Date();
        if (planType === 'premium_mon') {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        else if (planType === 'premium_yr') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        else if (planType === 'premium_life') {
            endDate = null;
        }
        const { error } = yield supabase_1.supabase
            .from('profiles')
            .update({
            subscription_tier: planType,
            subscription_end_date: endDate ? endDate.toISOString() : null,
        })
            .eq('id', userId);
        if (error) {
            console.error('Update profile error:', error);
            return res.status(500).json({ error: 'Failed to update subscription' });
        }
        const promoId = notes.promoId;
        if (promoId) {
            const red = yield (0, promo_service_1.recordPromoRedemption)({
                promoId,
                userId: userId,
                planType,
                razorpayPaymentId: razorpay_payment_id,
            });
            if (!red.ok) {
                console.error('Promo redemption note:', red.error);
            }
        }
        res.json({ status: 'success', message: 'Payment verified and subscription updated' });
    }
    catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.verifyPayment = verifyPayment;
