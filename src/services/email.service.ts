import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import net from 'net';
import dotenv from 'dotenv';

dotenv.config();

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpSecure =
  process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || smtpPort === 465;

const smtpHostName = process.env.SMTP_HOST || 'smtp.gmail.com';

/** Render (and some hosts) have broken IPv6 to Gmail; nodemailer randomly picks AAAA and fails. */
const forceIpv4 =
  process.env.SMTP_FORCE_IPV4 !== 'false' && process.env.SMTP_FORCE_IPV4 !== '0';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function createTransporter(): Promise<nodemailer.Transporter> {
  let connectHost = smtpHostName;

  if (forceIpv4 && !net.isIP(smtpHostName)) {
    try {
      const v4 = await dns.resolve4(smtpHostName);
      if (v4?.length) {
        connectHost = v4[Math.floor(Math.random() * v4.length)];
        console.log(`[SMTP] Connecting via IPv4 ${connectHost} (hostname ${smtpHostName} for TLS/SNI)`);
      }
    } catch (e) {
      console.warn('[SMTP] IPv4 resolve failed, using hostname:', e);
    }
  }

  return nodemailer.createTransport({
    host: connectHost,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 35_000,
    requireTLS: !smtpSecure && smtpPort === 587,
    tls: {
      servername: smtpHostName,
      minVersion: 'TLSv1.2' as const,
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  return transporterPromise;
}

export const sendReminderEmail = async (to: string, partyName: string, amount: number, senderName: string) => {
  const transporter = await getTransporter();
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

export const sendOtpEmail = async (to: string, otp: string) => {
  const from = process.env.SMTP_USER;
  if (!from) {
    throw new Error('SMTP_USER is not configured');
  }
  const transporter = await getTransporter();
  const mailOptions = {
    from: `"Daily-KHATA" <${from}>`,
    to,
    subject: 'Your Daily-KHATA password reset code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
        <h2 style="color: #0f172a; margin-top: 0;">Password reset</h2>
        <p>Use this code to set a new password. It expires in <strong>15 minutes</strong>.</p>
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 28px; font-weight: 800; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you did not request this, you can ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 28px;" />
        <p style="font-size: 12px; color: #94a3b8;">Daily-KHATA — automated message</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};
