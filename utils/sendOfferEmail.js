import dotenv from "dotenv";
import SibApiV3Sdk from "sib-api-v3-sdk";

dotenv.config();

export const sendOfferEmail = async ({
  sellerEmail,
  productName,
  buyerName,
  buyerEmail,
  offerAmount,
  message,
  productImage, // new field for product image URL
}) => {
  try {
    // 🔑 Initialize Brevo API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // ✉️ Sender (Relayy)
    const sender = {
      email: process.env.FROM_EMAIL,
      name: "Relayy",
    };

    // 📩 Receiver (Seller)
    const receivers = [{ email: sellerEmail }];

    // 💌 Build email HTML with image and clean design
    const htmlContent = `
      <div style="font-family: 'Josefin Sans', Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
          
          <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; text-align: center; padding: 20px 0;">
            <h1 style="margin: 0; font-size: 28px;">Relayy</h1>
            <p style="margin: 4px 0 0; font-size: 15px; opacity: 0.9;">You received a new offer!</p>
          </div>

          <div style="padding: 32px;">
            <h2 style="color: #111827; font-size: 22px; margin-bottom: 12px;">Offer on <strong>${productName}</strong></h2>

            ${
              productImage
                ? `<div style="text-align:center; margin-bottom:20px;">
                    <img src="${productImage}" alt="${productName}" style="max-width:100%; border-radius:12px; border:1px solid #e5e7eb;" />
                  </div>`
                : ""
            }

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              <strong>${buyerName}</strong> (<a href="mailto:${buyerEmail}" style="color:#2563eb;">${buyerEmail}</a>)
              has made an offer on your listing.
            </p>

            <div style="margin: 24px 0; background: #f9fafb; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px;">
              <p style="margin: 0; font-size: 16px;">
                <strong>Offered Price:</strong> ₹${offerAmount}
              </p>
              ${
                message
                  ? `<p style="margin: 6px 0 0; color: #374151;">💬 "${message}"</p>`
                  : ""
              }
            </div>

            <a href="https://relayy.shop/dashboard/offers"
               style="display:inline-block; margin-top:16px; padding:12px 24px; background:#10b981; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
              View Offer on Relayy
            </a>
          </div>

          <div style="background-color: #f9fafb; color: #6b7280; font-size: 13px; text-align: center; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Relayy. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    // 📨 Send email via Brevo
    await apiInstance.sendTransacEmail({
      sender,
      to: receivers,
      subject: `💰 New Offer on ${productName} from ${buyerName}`,
      htmlContent,
    });

    console.log(`✅ Offer email sent to seller: ${sellerEmail}`);
  } catch (error) {
    console.error("❌ Failed to send offer email:");
    if (error.response && error.response.body) {
      console.error("➡️ Brevo Error Response:", JSON.stringify(error.response.body, null, 2));
    } else {
      console.error("➡️ Error Message:", error.message);
    }
    throw error;
  }
};
