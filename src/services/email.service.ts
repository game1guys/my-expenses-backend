import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Daily Khata" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your Password Reset OTP — Daily Khata',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 32px; background: #f8fafc; color: #0f172a;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="margin: 0 0 8px; font-size: 22px; color: #0f172a;">Password Reset</h2>
          <p style="color: #64748b; margin: 0 0 24px;">Use the OTP below to reset your Daily Khata password. It expires in <strong>10 minutes</strong>.</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; letter-spacing: 10px; font-size: 36px; font-weight: 900; color: #0f172a; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">If you did not request a password reset, please ignore this email. Your account is safe.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #cbd5e1; margin: 0;">Daily Khata — Automated Security Email</p>
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('[OTP Email] Sent to %s — messageId: %s', to, info.messageId);
  return info;
};

export const sendReminderEmail = async (to: string, partyName: string, amount: number, senderName: string) => {
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
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
