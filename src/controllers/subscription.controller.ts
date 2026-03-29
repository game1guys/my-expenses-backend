import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabase } from '../database/supabase';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: 'rzp_test_SWfo8B11r0U8fL',
  key_secret: 'ze5jwCnB5g7sNHucPTTpoYeF',
});

export const createOrder = async (req: Request, res: Response) => {
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
        userId: (req as any).user.id,
      },
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;
    const userId = (req as any).user.id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', 'ze5jwCnB5g7sNHucPTTpoYeF')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is verified, update user subscription
      let endDate: Date | null = new Date();
      if (planType === 'premium_mon') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (planType === 'premium_yr') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (planType === 'premium_life') {
        endDate = null; // No expiry
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

      res.json({ status: 'success', message: 'Payment verified and subscription updated' });
    } else {
      res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
};
