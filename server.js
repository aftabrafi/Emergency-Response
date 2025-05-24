require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcrypt');
const User = require('./models/user');


// ✅ Twilio Credentials (replace with your actual Twilio Account SID and Auth Token)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = require('twilio')(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;


// 🚀 Function to send SMS
function sendSMS(phoneNumber, message) {
    console.log(`📲 Sending SMS to ${phoneNumber}: ${message}`);

    twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber, // ✅ Sending from Twilio phone number
        to: phoneNumber           // ✅ Sending to the user's trusted contact
    })
    .then(() => console.log("✅ SMS sent successfully!"))
    .catch(error => console.error("🚨 Error sending SMS:", error));
}
function sendEmail(email, message) {
    console.log(`📩 Sending email to ${email}: ${message}`);

    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "🚨 Emergency Alert!",
        text: message
    }, (error, info) => {
        if (error) {
            console.error("🚨 Error sending email:", error);
        } else {
            console.log("✅ Email sent successfully!", info.response);
        }
    });
}


async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected successfully!");
    } catch (err) {
        console.error("🚨 MongoDB connection error:", err);
        process.exit(1);
    }
}
connectDB();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, contacts, emergencyContactName, emergencyContactInfo } = req.body; // ✅ Updated emergencyContactPhone to emergencyContactInfo

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "🚨 Email already registered!" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Store emergency contact details inside the user's profile (supports both email & phone)
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            contacts,
             emergencyContact: emergencyContactInfo
        });

        await newUser.save();
        console.log("✅ User registered with emergency contact:", newUser);

        res.status(201).json({ message: "✅ Registration successful!" });

    } catch (error) {
        console.error("🚨 Registration error:", error);
        res.status(500).json({ message: "❌ Registration failed." });
    }
});


app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "🚨 Invalid credentials! User not found." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "🚨 Invalid credentials! Password incorrect." });
        }

        console.log("✅ Login successful, sending user ID:", user._id); // ✅ Debugging log

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.json({ token, userId: user._id, message: "Login successful!" }); // ✅ Ensure userId is sent

    } catch (error) {
        console.error("🚨 Login error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});


app.post('/api/send-sos', async (req, res) => {
    try {
        console.log("🚨 Received SOS Request!");
        console.log("🔍 Request Body:", req.body);

        const { userId, latitude, longitude, location, message } = req.body;

        // 🚨 Check if `message` is correctly received
        if (!userId || !latitude || !longitude || !location || !message) {
            console.log("🚨 Missing required data!");
            return res.status(400).json({ message: "🚨 User ID, location details, and message are required!" });
        }

        const user = await User.findById(userId);
        if (!user || !user.contacts.length) {
            console.log("🚨 No trusted contacts found!");
            return res.status(404).json({ message: "🚨 No emergency contacts available!" });
        }

        // ✅ Use the correct `message` variable inside the loop
        const sentContacts = new Set();
        user.contacts.forEach(contact => {
            if (!sentContacts.has(contact)) {
                if (contact.includes('@')) {
                    sendEmail(contact, message); // ✅ Use message from request
                } else {
                    sendSMS(contact, message); // ✅ Use message from request
                }
                sentContacts.add(contact); // ✅ Mark contact as notified
            }
        });

        res.json({ message: "✅ SOS Alert sent successfully!" });

    } catch (error) {
        console.error("🚨 Error processing SOS request:", error);
        res.status(500).json({ message: "🚨 Failed to send SOS alert." });
    }
});

app.post('/api/add-contact', async (req, res) => {
    const { userId, contact } = req.body;

    if (!userId || !contact) {
        return res.status(400).json({ message: "🚨 User ID and contact are required!" });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "🚨 User not found!" });
        }

        // 🚀 Remove duplicate check if you want to allow adding the same number again
        // if (user.contacts.includes(contact)) {
        //     return res.status(400).json({ message: "🚨 Contact already exists!" });
        // }

        await User.findByIdAndUpdate(userId, { $push: { contacts: contact } });
        res.status(201).json({ message: "✅ Contact added successfully!" });

    } catch (error) {
        console.error("🚨 Error adding contact:", error);
        res.status(500).json({ message: "🚨 Failed to add contact." });
    }
});


app.get('/api/check-contacts', async (req, res) => {
    const { userId } = req.query;

    if (!userId || userId === "undefined") {
        console.log("🚨 Missing or invalid User ID in `/api/check-contacts`");
        return res.status(400).json({ message: "🚨 User ID is required!" });
    }

    try {
        const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
        if (!objectId) {
            return res.status(400).json({ message: "🚨 Invalid user ID format!" });
        }

        const user = await User.findById(objectId);
        const hasContacts = user && user.contacts.length > 0;

        res.json({ hasContacts });

    } catch (error) {
        console.error("🚨 Error checking contacts:", error);
        res.status(500).json({ hasContacts: false });
    }
});
app.post("/api/update-contact-location", async (req, res) => {
    try {
        const { contactLatitude, contactLongitude } = req.body; // ✅ No need for userId

        // ✅ Store the latest live location (replace existing entry)
        await EmergencyLocation.updateOne({}, { latitude: contactLatitude, longitude: contactLongitude }, { upsert: true });

        res.status(200).json({ message: "✅ Emergency contact location updated!" });

    } catch (error) {
        console.error("🚨 Error updating location:", error);
        res.status(500).json({ message: "❌ Failed to update location!" });
    }
});


app.get("/api/get-contact-location", async (req, res) => {
    try {
        const user = await User.findOne({ emergencyLocation: { $exists: true } });
        if (!user || !user.emergencyLocation) {
            return res.status(404).json({ message: "❌ No active emergency contact location found!" });
        }

        res.json(user.emergencyLocation); // ✅ Send correct latitude & longitude
    } catch (error) {
        console.error("🚨 Error retrieving location:", error);
        res.status(500).json({ message: "❌ Failed to retrieve location!" });
    }
});

app.post('/api/send-live-location', async (req, res) => {
    try {
        console.log("🚨 Received LIVE Location Update!");
        console.log("🔍 Request Body:", req.body);

        const { userId, latitude, longitude, location, message } = req.body;

        if (!userId || !latitude || !longitude || !location) {
            console.log("🚨 Missing required live location data!");
            return res.status(400).json({ message: "🚨 User ID and location details required!" });
        }

        const user = await User.findById(userId);
        if (!user || !user.contacts.length) {
            console.log("🚨 No trusted contacts found for live tracking!");
            return res.status(404).json({ message: "🚨 No trusted contacts available!" });
        }

        user.contacts.forEach(contact => {
            if (contact.includes('@')) {
                sendEmail(contact, message); // ✅ Send email updates
            } else {
                sendSMS(contact, message); // ✅ Send SMS updates
            }
        });

        res.json({ message: "✅ Live location update sent successfully!" });

    } catch (error) {
        console.error("🚨 Error processing live tracking:", error);
        res.status(500).json({ message: "🚨 Failed to send live location!" });
    }
});
app.post('/api/send-contact-location', async (req, res) => {
    try {
        console.log("🚨 Received Emergency Contact Location Update!");
        console.log("🔍 Request Body:", req.body);

        const { contactLatitude, contactLongitude, contactLocation, message, userId } = req.body; // ✅ Added userId

        if (!contactLatitude || !contactLongitude || !contactLocation || !userId) {
            console.log("🚨 Missing emergency contact location or user ID!");
            return res.status(400).json({ message: "🚨 Location details and user ID required!" });
        }

        // ✅ Retrieve user's emergency contact info from MongoDB
        const user = await User.findById(userId);
        if (!user || !user.emergencyContact) {
            console.log("🚨 No registered emergency contact found!");
            return res.status(404).json({ message: "❌ Emergency contact not found!" });
        }

        const emergencyContactPhone = user.emergencyContact.phone;
        const emergencyContactEmail = user.emergencyContact.email;

        const notificationMessage = `🚨 Emergency Alert!\n📍 Contact's Location: Latitude ${contactLatitude}, Longitude ${contactLongitude}\n🌍 Map Link: ${contactLocation}`;

        // ✅ Send email/SMS notification to the user's registered emergency contact
        await sendNotification(emergencyContactPhone, emergencyContactEmail, notificationMessage);

        console.log("✅ Emergency Contact Location Sent!");
        res.status(200).json({ message: "✅ Location sent to user's emergency contact!" });

    } catch (error) {
        console.error("🚨 Error sending contact location:", error);
        res.status(500).json({ message: "🚨 Failed to send location!" });
    }
});


app.post('/api/store-location', async (req, res) => {
    const { userId, location } = req.body;

    try {
        await User.findByIdAndUpdate(userId, { lastLocation: location });
        res.json({ message: "✅ Location stored successfully!" });
    } catch (error) {
        res.status(500).json({ message: "🚨 Failed to store location." });
    }
});


const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'Access denied.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token.' });
        req.user = user;
        next();
    });
};

const PORT = process.env.PORT || 5000;
app._router.stack.forEach((route) => {
    if (route.route && route.route.path) {
        console.log(`Registered route: ${route.route.path}`);
    }
});
app.listen(5000, () => {
    console.log("✅ Server running on http://localhost:5000");
});
module.exports = app;

