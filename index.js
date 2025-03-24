



const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000; // Agar 3000 diya hai to 8080 nahi chalega


// ✅ Webhook Verification (GET Request)
app.get("/webhook", (req, res) => {
    const VERIFY_TOKEN = "EAAQmXsFDdBEBO0RbSy0AcI07C2q7xVYhXDImvvjiAbtBsziZBGHeG3jou5ZAZBUoYjJAWRv6bbyGZCwsGhOFCgBagGR97pn83mIrg1mcnT6ZAhPO1lJzZCwXelqfCbhzg9TyMNQCz3QP9EcJWVGTKyga4Ag5HgQntEZBNBzavLGvx7cAFoNqvbwnZAYBgHMi1NtfHQZDZD"; // Isko Meta Developer Portal me set karein
   

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

// ✅ Webhook Receiver (POST Request)
app.post("/webhook", (req, res) => {
    console.log("📩 Webhook received:", JSON.stringify(req.body, null, 2));

    res.status(200).send("✅ Webhook received!");
});

// ✅ Start Server
app.listen(PORT, () => console.log(`✅ Webhook running on port ${PORT}`));




