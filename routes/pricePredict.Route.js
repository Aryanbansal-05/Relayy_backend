// routes/pricePredictRoute.js
import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/predict", async (req, res) => {
  try {
    const { category, type, ...payload } = req.body;

    let apiUrl = "";
    if (type === "mobile") {
      apiUrl = "https://mobile-resale-price-predictor.onrender.com/predict";
    } else if (type === "laptop") {
      apiUrl = "https://laptop-resale-price-predictor.onrender.com/predict";
    } else {
      return res.status(400).json({ error: "Unsupported category or type" });
    }

    const response = await axios.post(apiUrl, payload);

    const predictedPrice =
      response.data.predicted_resale_price ||
      response.data.predicted_price ||
      null;

    if (!predictedPrice) {
      console.error("Unexpected model response:", response.data);
      return res.status(500).json({ error: "Invalid model response" });
    }

    res.json({
      success: true,
      modelType: type,
      predictedPrice,
    });
  } catch (err) {
    console.error("Prediction Error:", err.message);
    res.status(500).json({ error: "Prediction service unavailable" });
  }
});

export default router;
