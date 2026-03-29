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
