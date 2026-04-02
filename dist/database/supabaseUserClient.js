"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseForUser = createSupabaseForUser;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Client scoped to the end-user JWT so Postgres RLS (auth.uid()) works when the API
 * uses SUPABASE_ANON_KEY instead of the service role (common on small deployments).
 */
function createSupabaseForUser(accessToken) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || '';
    if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for user-scoped queries');
    }
    return (0, supabase_js_1.createClient)(url, key, {
        global: {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    });
}
