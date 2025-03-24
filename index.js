const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios"); // 🔹 WhatsApp API ke liye

// 🔹 Firebase Setup
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sam2him2024-default-rtdb.firebaseio.com"
});

const db = admin.database();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// ✅ Webhook Verification (GET Request)
app.get("/webhook", (req, res) => {
    const VERIFY_TOKEN = "EAAQmXsFDdBEBO0RbSy0AcI07C2q7xVYhXDImvvjiAbtBsziZBGHeG3jou5ZAZBUoYjJAWRv6bbyGZCwsGhOFCgBagGR97pn83mIrg1mcnT6ZAhPO1lJzZCwXelqfCbhzg9TyMNQCz3QP9EcJWVGTKyga4Ag5HgQntEZBNBzavLGvx7cAFoNqvbwnZAYBgHMi1NtfHQZDZD"; 

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

// ✅ Webhook Receiver (Messages)
app.post("/webhook", async (req, res) => {
    console.log("📩 Webhook received:", JSON.stringify(req.body, null, 2));

    if (req.body.entry) {
        const changes = req.body.entry[0].changes[0].value;

        // 📌 Message Received Case
        if (changes.messages) {
            for (const message of changes.messages) {
                const userPhone = `user_${message.from}`;  // 🔹 Unique user ID (WhatsApp number)
                const messageId = message.id;
                const text = message.text ? message.text.body : "Media Message";
                const timestamp = message.timestamp;

                // 🔹 Firebase me check karo ki user ka pehla message hai ya nahi
                const userRef = db.ref(`messages/${userPhone}`);
                const snapshot = await userRef.once("value");

                if (!snapshot.exists()) {
                    // 🔹 User first time message kar raha hai, auto-reply bhejo
                    sendAutoReply(message.from);
                }

                // 🔹 Firebase me message store karo
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
        const response = await axios.post(
            "https://graph.facebook.com/v18.0/567870373079357/messages",
            payload,
            {
                headers: {
                    "Authorization": "EAAQmXsFDdBEBO0RbSy0AcI07C2q7xVYhXDImvvjiAbtBsziZBGHeG3jou5ZAZBUoYjJAWRv6bbyGZCwsGhOFCgBagGR97pn83mIrg1mcnT6ZAhPO1lJzZCwXelqfCbhzg9TyMNQCz3QP9EcJWVGTKyga4Ag5HgQntEZBNBzavLGvx7cAFoNqvbwnZAYBgHMi1NtfHQZDZD",
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`✅ Auto-reply sent to ${userPhone}: ${replyMessage}`);
    } catch (error) {
        console.error("❌ Failed to send auto-reply:", error.response ? error.response.data : error.message);
    }
}

// ✅ Start Server
app.listen(PORT, () => console.log(`✅ Webhook running on port ${PORT}`));
