import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

let initFailed = false;

function parseJsonCredential(raw: string): admin.ServiceAccount | null {
  try {
    return JSON.parse(raw) as admin.ServiceAccount;
  } catch (e) {
    console.error('[FCM] JSON credential parse failed:', e);
    return null;
  }
}

function loadServiceAccountCredential(): admin.ServiceAccount | null {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (filePath) {
    try {
      const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const raw = fs.readFileSync(resolved, 'utf8');
      return parseJsonCredential(raw);
    } catch (e) {
      console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_PATH not readable (e.g. on Render), trying env JSON/B64:', filePath);
    }
  }
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64?.trim();
  if (b64) {
    try {
      const raw = Buffer.from(b64, 'base64').toString('utf8');
      return parseJsonCredential(raw);
    } catch (e) {
      console.error('[FCM] FIREBASE_SERVICE_ACCOUNT_B64 decode failed:', e);
    }
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }
  return parseJsonCredential(raw);
}

function tryInit(): admin.messaging.Messaging | null {
  if (initFailed) return null;
  if (admin.apps.length > 0) {
    return admin.messaging();
  }
  const cred = loadServiceAccountCredential();
  if (!cred) {
    return null;
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(cred),
    });
    return admin.messaging();
  } catch (e) {
    initFailed = true;
    console.error('[FCM] Firebase Admin init failed:', e);
    return null;
  }
}

export function isFcmReady(): boolean {
  return tryInit() != null;
}

/** Match admin panel `target_tier` values to `profiles.subscription_tier`. */
export function tierMatchesSubscription(subscriptionTier: string | null, targetTier: string): boolean {
  const t = (subscriptionTier || 'free').trim();
  switch (targetTier) {
    case 'all':
      return true;
    case 'free':
      return t === 'free';
    case 'premium':
      return t !== 'free' && t.startsWith('premium');
    case 'premium_mon':
      return t === 'premium_mon';
    case 'premium_yr':
      return t === 'premium_yr';
    case 'premium_life':
      return t === 'premium_life';
    default:
      return false;
  }
}

export async function sendMulticastNotification(opts: {
  tokens: string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}): Promise<{ successCount: number; failureCount: number }> {
  const messaging = tryInit();
  const unique = [...new Set(opts.tokens.filter(Boolean))];
  if (!messaging || unique.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;
  const data: Record<string, string> = {};
  if (opts.data) {
    for (const [k, v] of Object.entries(opts.data)) {
      data[k] = v == null ? '' : String(v);
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const batch = unique.slice(i, i + chunkSize);
    const message: admin.messaging.MulticastMessage = {
      tokens: batch,
      notification: {
        title: opts.title,
        body: opts.body,
        ...(opts.imageUrl ? { imageUrl: opts.imageUrl } : {}),
      },
      data: Object.keys(data).length ? data : undefined,
      android: {
        priority: 'high',
        notification: {
          ...(opts.imageUrl ? { imageUrl: opts.imageUrl } : {}),
          channelId: 'default',
        },
      },
      apns: opts.imageUrl
        ? {
            fcmOptions: { imageUrl: opts.imageUrl },
          }
        : undefined,
    };

    const resp = await messaging.sendEachForMulticast(message);
    successCount += resp.successCount;
    failureCount += resp.failureCount;
    if (resp.failureCount > 0) {
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          console.warn('[FCM] token failed:', batch[idx]?.slice(0, 24), r.error?.code, r.error?.message);
        }
      });
    }
  }

  return { successCount, failureCount };
}
