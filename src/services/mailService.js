import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// ======================================
// 📧 Enviar informe de horas por mail
// ======================================
exports.sendHoursReport = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    console.log("🔥 BODY:", req.body);

    try {
      const { userId, month } = req.body;

      if (!userId || !month) {
        console.log("❌ Missing params");
        return res.status(400).send("Missing params");
      }

      console.log("✅ Params OK", userId, month);

      res.send("OK DEBUG");
    } catch (err) {
      console.error("❌ ERROR:", err);
      res.status(500).send("Error");
    }
  }
);

