const admin = require("firebase-admin");
admin.initializeApp();

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

// ======================================================
// 🔐 SECRETS — JIRA
// ======================================================
const JIRA_BASE_URL = defineSecret("JIRA_BASE_URL");
const JIRA_EMAIL = defineSecret("JIRA_EMAIL");
const JIRA_API_TOKEN = defineSecret("JIRA_API_TOKEN");

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
            title: "Trackly",
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
        console.error("Gmail env vars missing");
        return res.status(500).send("Mail not configured");
      }

      const db = admin.firestore();

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

      const subject = `Informe horas Trackly — ${month}`;
      const html = `
        <div style="font-family:Arial,sans-serif;text-align:center">
          <h2>Horas informadas</h2>
          <p><strong>Total de horas:</strong> ${totalHours}</p>
        </div>
      `;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transporter.sendMail({
        from: `"Trackly" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject,
        html,
      });

      res.send("OK");
    } catch (err) {
      console.error("Error sendHoursReport", err);
      res.status(500).send("Error");
    }
  }
);

// ===================================================================
// 🧩 JIRA — OBTENER ISSUES (httpsCallable)
// ===================================================================
// ===================================================================
// 🧩 JIRA — OBTENER ISSUES (httpsCallable) ✔️ FIX
// ===================================================================
exports.getJiraIssues = onCall(
  { region: "us-central1" },
  async (request) => {
    const { auth } = request;

    if (!auth) {
      throw new Error("User not authenticated");
    }

    const {
      JIRA_BASE_URL,
      JIRA_EMAIL,
      JIRA_API_TOKEN,
    } = process.env;

    if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
      console.error("❌ JIRA ENV VARS MISSING");
      return [];
    }

    try {
      const authHeader = Buffer.from(
        `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
      ).toString("base64");

      // ✅ JQL MÁS ROBUSTO
      const jql = "ORDER BY updated DESC";

      const url =
        `${JIRA_BASE_URL}/rest/api/3/search` +
        `?jql=${encodeURIComponent(jql)}` +
        `&fields=summary` +
        `&maxResults=50`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ JIRA HTTP ERROR", res.status, text);
        return [];
      }

      const json = await res.json();

      if (!Array.isArray(json.issues)) {
        console.warn("⚠️ Jira response without issues array");
        return [];
      }

      return json.issues.map((i) => ({
        id: i.id,
        key: i.key,
        summary: i.fields?.summary || "Sin título",
      }));
    } catch (err) {
      console.error("❌ JIRA FETCH ERROR:", err.message);
      return [];
    }
  }
);

