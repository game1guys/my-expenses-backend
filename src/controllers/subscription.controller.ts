import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabase } from '../database/supabase';
import dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { recordPromoRedemption, resolvePromoForUser } from '../services/promo.service';

dotenv.config();

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'ze5jwCnB5g7sNHucPTTpoYeF';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SWfo8B11r0U8fL';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export const previewSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planType, promoCode } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const resolved = await resolvePromoForUser(planType, promoCode, userId);
    if (!resolved.ok) {
      return res.status(400).json({ error: resolved.error });
    }
    return res.json({
      amountPaise: resolved.amountPaise,
      originalPaise: resolved.originalPaise,
      percentOff: resolved.percentOff,
      currency: 'INR',
    });
  } catch (error: any) {
    console.error('Preview subscription error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planType, promoCode } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resolved = await resolvePromoForUser(planType, promoCode, userId);
    if (!resolved.ok) {
      return res.status(400).json({ error: resolved.error });
    }

    const notes: Record<string, string> = {
      planType: String(planType),
      userId: String(userId),
    };
    if (resolved.promoId) {
      notes.promoId = String(resolved.promoId);
    }

    const options = {
      amount: resolved.amountPaise,
      currency: 'INR' as const,
      receipt: `receipt_${Date.now()}`,
      notes,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = (order.notes || {}) as Record<string, string>;
    if (notes.userId && notes.userId !== String(userId)) {
      return res.status(400).json({ error: 'Order does not belong to this user' });
    }
    if (notes.planType && notes.planType !== planType) {
      return res.status(400).json({ error: 'Plan mismatch' });
    }

    let endDate: Date | null = new Date();
    if (planType === 'premium_mon') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (planType === 'premium_yr') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (planType === 'premium_life') {
      endDate = null;
    }

    const { error } = await supabase
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
      const red = await recordPromoRedemption({
        promoId,
        userId: userId!,
        planType,
        razorpayPaymentId: razorpay_payment_id,
      });
      if (!red.ok) {
        console.error('Promo redemption note:', red.error);
      }
    }

    res.json({ status: 'success', message: 'Payment verified and subscription updated' });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
};
