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
exports.isFcmReady = isFcmReady;
exports.tierMatchesSubscription = tierMatchesSubscription;
exports.sendMulticastNotification = sendMulticastNotification;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let initFailed = false;
function parseJsonCredential(raw) {
    try {
        return JSON.parse(raw);
    }
    catch (e) {
        console.error('[FCM] JSON credential parse failed:', e);
        return null;
    }
}
function loadServiceAccountCredential() {
    var _a, _b, _c;
    const filePath = (_a = process.env.FIREBASE_SERVICE_ACCOUNT_PATH) === null || _a === void 0 ? void 0 : _a.trim();
    if (filePath) {
        try {
            const resolved = path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(process.cwd(), filePath);
            const raw = fs_1.default.readFileSync(resolved, 'utf8');
            return parseJsonCredential(raw);
        }
        catch (e) {
            console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_PATH not readable (e.g. on Render), trying env JSON/B64:', filePath);
        }
    }
    const b64 = (_b = process.env.FIREBASE_SERVICE_ACCOUNT_B64) === null || _b === void 0 ? void 0 : _b.trim();
    if (b64) {
        try {
            const raw = Buffer.from(b64, 'base64').toString('utf8');
            return parseJsonCredential(raw);
        }
        catch (e) {
            console.error('[FCM] FIREBASE_SERVICE_ACCOUNT_B64 decode failed:', e);
        }
    }
    const raw = (_c = process.env.FIREBASE_SERVICE_ACCOUNT_JSON) === null || _c === void 0 ? void 0 : _c.trim();
    if (!raw) {
        return null;
    }
    return parseJsonCredential(raw);
}
function tryInit() {
    if (initFailed)
        return null;
    if (firebase_admin_1.default.apps.length > 0) {
        return firebase_admin_1.default.messaging();
    }
    const cred = loadServiceAccountCredential();
    if (!cred) {
        return null;
    }
    try {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(cred),
        });
        return firebase_admin_1.default.messaging();
    }
    catch (e) {
        initFailed = true;
        console.error('[FCM] Firebase Admin init failed:', e);
        return null;
    }
}
function isFcmReady() {
    return tryInit() != null;
}
/** Match admin panel `target_tier` values to `profiles.subscription_tier`. */
function tierMatchesSubscription(subscriptionTier, targetTier) {
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
function sendMulticastNotification(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const messaging = tryInit();
        const unique = [...new Set(opts.tokens.filter(Boolean))];
        if (!messaging || unique.length === 0) {
            return { successCount: 0, failureCount: 0 };
        }
        let successCount = 0;
        let failureCount = 0;
        const data = {};
        if (opts.data) {
            for (const [k, v] of Object.entries(opts.data)) {
                data[k] = v == null ? '' : String(v);
            }
        }
        const chunkSize = 500;
        for (let i = 0; i < unique.length; i += chunkSize) {
            const batch = unique.slice(i, i + chunkSize);
            const message = {
                tokens: batch,
                notification: Object.assign({ title: opts.title, body: opts.body }, (opts.imageUrl ? { imageUrl: opts.imageUrl } : {})),
                data: Object.keys(data).length ? data : undefined,
                android: {
                    priority: 'high',
                    notification: Object.assign(Object.assign({}, (opts.imageUrl ? { imageUrl: opts.imageUrl } : {})), { channelId: 'default' }),
                },
                apns: opts.imageUrl
                    ? {
                        fcmOptions: { imageUrl: opts.imageUrl },
                    }
                    : undefined,
            };
            const resp = yield messaging.sendEachForMulticast(message);
            successCount += resp.successCount;
            failureCount += resp.failureCount;
            if (resp.failureCount > 0) {
                resp.responses.forEach((r, idx) => {
                    var _a, _b, _c;
                    if (!r.success) {
                        console.warn('[FCM] token failed:', (_a = batch[idx]) === null || _a === void 0 ? void 0 : _a.slice(0, 24), (_b = r.error) === null || _b === void 0 ? void 0 : _b.code, (_c = r.error) === null || _c === void 0 ? void 0 : _c.message);
                    }
                });
            }
        }
        return { successCount, failureCount };
    });
}
