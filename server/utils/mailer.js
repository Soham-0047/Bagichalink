const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // App Password, NOT your Gmail password
  },
});

/**
 * Send OTP email to user
 */
const sendOTPEmail = async (to, otp, name = '') => {
  const mailOptions = {
    from: `"BagichaLink 🌿" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your BagichaLink verification code',
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: auto; background: #FAF7F2; padding: 40px; border-radius: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 48px;">🌿</div>
          <h1 style="font-family: Georgia, serif; color: #1C2B1A; font-size: 24px; margin: 8px 0;">BagichaLink</h1>
          <p style="color: #6B7B68; font-size: 14px;">Global Plant Swap Community</p>
        </div>

        <div style="background: #FFFFFF; border-radius: 16px; padding: 32px; text-align: center;">
          <p style="color: #1C2B1A; font-size: 16px; margin-bottom: 8px;">
            ${name ? `Hi ${name},` : 'Hello,'} here's your verification code:
          </p>
          <div style="background: #D6E8C8; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1C2B1A;">
              ${otp}
            </span>
          </div>
          <p style="color: #6B7B68; font-size: 13px; margin: 0;">
            This code expires in <strong>10 minutes</strong>.<br/>
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>

        <p style="text-align: center; color: #A09B8C; font-size: 12px; margin-top: 24px;">
          🌍 BagichaLink — Growing together, worldwide
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };