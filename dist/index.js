"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const party_routes_1 = __importDefault(require("./routes/party.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const node_cron_1 = __importDefault(require("node-cron"));
const reminder_job_1 = require("./services/reminder.job");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Main App Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/categories', category_routes_1.default);
app.use('/api/transactions', transaction_routes_1.default);
app.use('/api/parties', party_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/profile', profile_routes_1.default);
app.use('/api/subscription', subscription_routes_1.default);
// Catch-all for 404 debugging
app.use((req, res) => {
    console.log(`[404 DEBUG] Unmatched Request: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        url: req.url,
        hint: 'Check if backend is fully deployed'
    });
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Daily-KHATA API is running' });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Available routes:`);
    console.log(`- /api/auth`);
    console.log(`- /api/categories`);
    console.log(`- /api/transactions`);
    console.log(`- /api/profile`);
});
// Schedule daily expense reminder at 8:00 PM IST (20:00)
// Note: Render servers usually use UTC. 8 PM IST is 2:30 PM UTC.
// Setting for 20:00 server time.
node_cron_1.default.schedule('0 20 * * *', () => {
    console.log('[Cron] Running daily expense reminders at 8 PM...');
    (0, reminder_job_1.processDailyReminders)();
});
