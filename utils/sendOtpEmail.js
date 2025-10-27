import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Professional & clean HTML email template
  const mailOptions = {
    from: `"Relayy" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Relayy OTP Verification Code",
    html: `
      <div style="
        font-family: 'Segoe UI', Arial, sans-serif;
        background-color: #f3f4f6;
        padding: 40px 0;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          overflow: hidden;
        ">
          <!-- Header -->
          <div style="
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            text-align: center;
            padding: 20px 0;
          ">
            <h1 style="margin: 0; font-size: 28px;">Relayy</h1>
            <p style="margin: 4px 0 0; font-size: 15px; opacity: 0.9;">
              The story of stuff. Relayed.
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px; text-align: center;">
            <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">
              Verify Your Email
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Thank you for joining <strong>Relayy</strong>!  
              To complete your registration, please verify your email using the OTP below.
            </p>

            <!-- OTP Box -->
            <div style="
              margin: 32px auto 16px;
              display: inline-block;
              background: #ecfdf5;
              border: 2px dashed #059669;
              border-radius: 10px;
              padding: 18px 36px;
            ">
              <span id="otp" style="
                color: #065f46;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 4px;
                font-family: 'Courier New', monospace;
              ">
                ${otp}
              </span>
            </div>

            <p style="color: #4b5563; font-size: 15px; margin-top: 24px;">
              This OTP is valid for the next <strong>10 minutes</strong>.<br/>
              If you did not request this, please ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="
            background-color: #f9fafb;
            color: #6b7280;
            font-size: 13px;
            text-align: center;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          ">
            <p style="margin: 0;">© ${new Date().getFullYear()} Relayy. All rights reserved.</p>
            <p style="margin: 4px 0 0;">Campus Marketplace | Connect • Buy • Sell</p>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
