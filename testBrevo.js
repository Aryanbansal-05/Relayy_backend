import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailOptions = {
  from: `"Relayy Support" <${process.env.EMAIL_USER}>`,
  to: "abansal4_be23@thapar.edu",
  subject: "SMTP Test - Relayy",
  text: "This is a test message from your Relayy backend using Brevo SMTP.",
};

(async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful!");
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ SMTP error:", err);
  }
})();
