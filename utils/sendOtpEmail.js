import dotenv from "dotenv";
import SibApiV3Sdk from "sib-api-v3-sdk";

dotenv.config();

export const sendOtpEmail = async (email, otp) => {
  try {
    // 🔑 Initialize Brevo API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // ✉️ Sender info (must be verified sender in Brevo)
    const sender = {
      email: process.env.FROM_EMAIL,
      name: "Relayy",
    };

    // 📩 Receiver
    const receivers = [{ email }];

    // 📨 Send email via HTTPS API
    await apiInstance.sendTransacEmail({
      sender,
      to: receivers,
      subject: "Your Relayy OTP Verification Code",
      htmlContent: `
        <div style="font-family: 'Josefin Sans', Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; text-align: center; padding: 20px 0;">
              <h1 style="margin: 0; font-size: 28px;">Relayy</h1>
              <p style="margin: 4px 0 0; font-size: 15px; opacity: 0.9;">The story of stuff. Relayed.</p>
            </div>

            <div style="padding: 32px; text-align: center;">
              <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Verify Your Email</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Thank you for joining <strong>Relayy</strong>! Use the OTP below to verify your email.</p>

              <div style="margin: 32px auto 16px; display: inline-block; background: #ecfdf5; border: 2px dashed #059669; border-radius: 10px; padding: 18px 36px;">
                <span style="color: #065f46; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: 'Courier New', monospace;">${otp}</span>
              </div>

              <p style="color: #4b5563; font-size: 15px; margin-top: 24px;">This OTP is valid for <strong>10 minutes</strong>.</p>
            </div>

            <div style="background-color: #f9fafb; color: #6b7280; font-size: 13px; text-align: center; padding: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Relayy. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`✅ OTP email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error.message);
    throw error;
  }
};
