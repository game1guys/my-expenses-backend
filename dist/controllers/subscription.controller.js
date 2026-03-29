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
exports.verifyPayment = exports.createOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../database/supabase");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const razorpay = new razorpay_1.default({
    key_id: 'rzp_test_SWfo8B11r0U8fL',
    key_secret: 'ze5jwCnB5g7sNHucPTTpoYeF',
});
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { planType } = req.body;
        let amount = 0;
        let currency = 'INR';
        switch (planType) {
            case 'premium_mon':
                amount = 29 * 100; // in paise
                break;
            case 'premium_yr':
                amount = 199 * 100;
                break;
            case 'premium_life':
                amount = 399 * 100;
                break;
            default:
                return res.status(400).json({ error: 'Invalid plan type' });
        }
        const options = {
            amount,
            currency,
            receipt: `receipt_${Date.now()}`,
            notes: {
                planType,
                userId: req.user.id,
            },
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
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;
        const userId = req.user.id;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', 'ze5jwCnB5g7sNHucPTTpoYeF')
            .update(body.toString())
            .digest('hex');
        if (expectedSignature === razorpay_signature) {
            // Payment is verified, update user subscription
            let endDate = new Date();
            if (planType === 'premium_mon') {
                endDate.setMonth(endDate.getMonth() + 1);
            }
            else if (planType === 'premium_yr') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            else if (planType === 'premium_life') {
                endDate = null; // No expiry
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
            res.json({ status: 'success', message: 'Payment verified and subscription updated' });
        }
        else {
            res.status(400).json({ status: 'failure', message: 'Invalid signature' });
        }
    }
    catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.verifyPayment = verifyPayment;
