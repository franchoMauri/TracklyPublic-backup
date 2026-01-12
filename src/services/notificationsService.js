import { getMessaging, getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// ⚠️ IMPORTANTE: sin espacios al final
const VAPID_KEY =
  "BNmwE0vC9je-fJNPS_ukm2h-AnOiP7Sdxvk36l8FZYEShF6BBDVaOBqUxtf26eYpXfb9xOPGVG0KU7bVia3nFdk";

export async function registerFCMToken(userId) {
  try {
    // 🛑 PROTECCIÓN CRÍTICA
    if (!userId) {
      console.warn("⚠️ registerFCMToken llamado sin userId");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("🔕 Permiso de notificaciones denegado");
      return;
    }

    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      console.log("⚠️ No se pudo obtener el FCM token");
      return;
    }

    console.log("📱 FCM TOKEN REAL:", token);

    await setDoc(doc(db, "users", userId),
      {
        fcmToken: token,
      },
      { merge: true }
    );

    console.log("🔔 FCM token guardado en Firestore");
  } catch (e) {
    console.error("❌ Error registrando push token", e);
  }
}

