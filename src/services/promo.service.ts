import { supabase } from '../database/supabase';

const PLAN_AMOUNTS_PAISE: Record<string, number> = {
  premium_mon: 29 * 100,
  premium_yr: 199 * 100,
  premium_life: 699 * 100,
};

export function baseAmountPaise(planType: string): number | null {
  return PLAN_AMOUNTS_PAISE[planType] ?? null;
}

export type PromoResolve =
  | { ok: true; amountPaise: number; originalPaise: number; percentOff: number; promoId: string | null }
  | { ok: false; error: string };

export async function resolvePromoForUser(
  planType: string,
  promoCode: string | undefined,
  userId: string
): Promise<PromoResolve> {
  const originalPaise = baseAmountPaise(planType);
  if (originalPaise == null) {
    return { ok: false, error: 'Invalid plan type' };
  }

  const trimmed = promoCode?.trim();
  if (!trimmed) {
    return { ok: true, amountPaise: originalPaise, originalPaise, percentOff: 0, promoId: null };
  }

  const normalized = trimmed.toUpperCase();
  const { data: promo, error } = await supabase
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

  const { count: prior } = await supabase
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
    promoId: promo.id as string,
  };
}

export async function recordPromoRedemption(params: {
  promoId: string;
  userId: string;
  planType: string;
  razorpayPaymentId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { promoId, userId, planType, razorpayPaymentId } = params;

  const { data: existing } = await supabase
    .from('promo_redemptions')
    .select('id')
    .eq('razorpay_payment_id', razorpayPaymentId)
    .maybeSingle();
  if (existing) {
    return { ok: true };
  }

  const { error: insErr } = await supabase.from('promo_redemptions').insert({
    promo_id: promoId,
    user_id: userId,
    plan_type: planType,
    razorpay_payment_id: razorpayPaymentId,
  });

  if (insErr) {
    const dup =
      insErr.code === '23505' ||
      (insErr as { code?: string }).code === '23505' ||
      String(insErr.message || '').toLowerCase().includes('duplicate');
    if (dup) {
      return { ok: true };
    }
    return { ok: false, error: insErr.message };
  }

  const { data: row } = await supabase.from('promo_codes').select('used_count').eq('id', promoId).single();
  const next = (row?.used_count ?? 0) + 1;
  await supabase.from('promo_codes').update({ used_count: next }).eq('id', promoId);

  return { ok: true };
}
