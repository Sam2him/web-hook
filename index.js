const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");

require("dotenv").config(); // Load .env file

// ✅ Firebase Setup from .env (No serviceAccountKey.json)
const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // 🔹 Fix multi-line issue
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL 
});

// ✅ Check if Firebase is initialized
console.log("✅ Firebase initialized successfully!");

const db = admin.database();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

// ✅ Webhook Verification
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified!");
        res.status(200).send(challenge);
    } else {
        res.status(403).send("Verification failed!");
    }
});

// ✅ Webhook Receiver
app.post("/webhook", async (req, res) => {
    console.log("📩 Webhook received:", JSON.stringify(req.body, null, 2));

    if (req.body.entry) {
        const changes = req.body.entry[0].changes[0].value;

        if (changes.messages) {
            for (const message of changes.messages) {
                const userPhone = `user_${message.from}`;
                const messageId = message.id;
                const text = message.text ? message.text.body : "Media Message";
                const timestamp = message.timestamp;

                const userRef = db.ref(`messages/${userPhone}`);
                const snapshot = await userRef.once("value");

                if (!snapshot.exists()) {
                    sendAutoReply(message.from);
                }

                await db.ref(`messages/${userPhone}/${messageId}`).set({
                    text,
                    status: "received",
                    timestamp
                });

                console.log(`✅ Message stored for ${userPhone}: ${text}`);
            }
        }
    }

    res.status(200).send("✅ Webhook received & stored in Firebase!");
});

// ✅ Auto-Reply Function
async function sendAutoReply(userPhone) {
    const replyMessage = "Hello! Welcome to our service. How can we assist you today? 😊";

    const payload = {
        messaging_product: "whatsapp",
        to: userPhone,
        text: { body: replyMessage }
    };

    try {
        await axios.post(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, payload, {
            headers: {
                "Authorization": `Bearer ${WHATSAPP_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        console.log(`✅ Auto-reply sent to ${userPhone}: ${replyMessage}`);
    } catch (error) {
        console.error("❌ Failed to send auto-reply:", error.response ? error.response.data : error.message);
    }
}

// ✅ Start Server
app.listen(PORT, () => console.log(`✅ Webhook running on port ${PORT}`));
