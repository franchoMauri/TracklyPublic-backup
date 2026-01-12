const admin = require("firebase-admin");
admin.initializeApp();

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");

// ======================================================
// ⏱️ CRON — Detectar usuarios inactivos
// ======================================================
exports.checkUserInactivity = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  async () => {
    const db = admin.firestore();

    const settingsSnap = await db
      .collection("adminSettings")
      .doc("global")
      .get();

    if (!settingsSnap.exists) return;

    const { inactivityEnabled, inactivityHours } =
      settingsSnap.data() || {};

    if (!inactivityEnabled) return;

    const limitMs = inactivityHours * 60 * 60 * 1000;
    const now = Date.now();

    const usersSnap = await db.collection("users").get();

    for (const doc of usersSnap.docs) {
      const user = doc.data();

      if (
        user.role === "admin" ||
        user.disabled ||
        !user.lastHourAt ||
        !user.fcmToken ||
        user.inactivityNotifiedAt
      )
        continue;

      const last = user.lastHourAt.toDate().getTime();
      if (now - last < limitMs) continue;

      const hoursInactive = (
        (now - last) / 1000 / 60 / 60
      ).toFixed(1);

      try {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: {
            title: "⏰ Trackly",
            body: `Hace ${hoursInactive} horas que no registrás horas`,
          },
        });

        await doc.ref.update({
          inactivityNotifiedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("Push error:", e.message);
      }
    }
  }
);

// ===================================================================
// 📧 ENDPOINT — ENVIAR INFORME DE HORAS POR MAIL
// ===================================================================
exports.sendHoursReport = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    
    try {
      const { userId, month } = req.body;

      if (!userId || !month) {
        return res.status(400).send("Missing params");
      }

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.error("❌ Gmail env vars missing");
        return res.status(500).send("Mail not configured");
      }

      const db = admin.firestore();

      const subject = `Informe horas Trackly — ${month}`;
      const html = `
          <div style="font-family:Arial,sans-serif;text-align:center">
            <img src="https://i.imgur.com/9Y7QZ4A.png" width="120" />
            <h2>Horas informadas</h2>
            <p><strong>Total de horas:</strong> ${totalHours}</p>
          </div>
        `;

      const userSnap = await db
        .collection("users")
        .doc(userId)
        .get();

      if (!userSnap.exists) {
        return res.status(404).send("User not found");
      }

      const user = userSnap.data();

      const hoursSnap = await db
        .collection("hours")
        .where("userId", "==", userId)
        .get();

      const totalHours = hoursSnap.docs
        .map((d) => d.data())
        .filter((r) => r.date?.startsWith(month))
        .reduce((sum, r) => sum + Number(r.hours || 0), 0);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 465,
        secure: true,
        logger: true,
        debug: true,
        secureConnection: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
        tls:{
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from: `"Trackly" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject,
        html,
      });

      res.send("OK");
    } catch (err) {
      console.error("❌ Error sendHoursReport", err);
      res.status(500).send("Error");
    }
  }
);
