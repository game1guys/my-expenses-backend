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
exports.sendReminderEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendReminderEmail = (to, partyName, amount, senderName) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: `"Daily-KHATA" <${process.env.SMTP_USER}>`,
        to,
        subject: `Payment Reminder - Daily-KHATA`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #FFD740;">Payment Reminder</h2>
        <p>Dear <strong>${partyName}</strong>,</p>
        <p>This is a friendly reminder from <strong>${senderName}</strong> regarding your outstanding balance.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFD740;">
          <p style="margin: 0; font-size: 18px;">Total Outstanding Amount: <strong>₹${amount.toLocaleString()}</strong></p>
        </div>
        <p>Please settle the payment at your earliest convenience.</p>
        <p>Thank you for using Daily-KHATA!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #888;">This is an automated message sent via Daily-KHATA App.</p>
      </div>
    `,
    };
    try {
        const info = yield transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return info;
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
});
exports.sendReminderEmail = sendReminderEmail;
