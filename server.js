const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const app = express();

// Middleware
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Setup sessions
const sessionConfig = {
    secret: process.env.SESSION_SECRET || "giftlife-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production", // set to true if using HTTPS
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
};

const sanitizeMongoUri = (uri) => {
    if (uri && typeof uri === 'string') {
        uri = uri.trim();
        // Look for the specific cluster host domain
        const hostIndex = uri.indexOf('giftlife.csi8bls.mongodb.net');
        if (hostIndex !== -1) {
            const charBeforeHost = uri.charAt(hostIndex - 1);
            if (charBeforeHost !== '@') {
                // Replace whatever character is there (e.g. 'm') with '@'
                uri = uri.substring(0, hostIndex - 1) + '@' + uri.substring(hostIndex);
            }
        }
    }
    return uri;
};

if (process.env.MONGODB_URI) {
    process.env.MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI);
}

const isValidMongoUri = (uri) => {
    return uri && typeof uri === 'string' && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) && uri.includes('@') && !uri.includes('<username>') && !uri.includes('<password>');
};

// We default to MemoryStore for sessions to ensure maximum stability and zero startup connection crashes.
console.log("ℹ️ Using memory session store (MemoryStore) for flawless stability.");
app.use(session(sessionConfig));

const fs = require("fs");

// MongoDB Connection
async function connectDB() {
    try {
        let connected = false;
    
    // 1. Attempt connection to Remote MongoDB Atlas (if URI is valid)
    if (isValidMongoUri(process.env.MONGODB_URI)) {
        try {
            console.log("⏳ Attempting to connect to MongoDB Atlas...");
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000 // 5 seconds timeout
            });
            console.log("✅ MongoDB (Remote Atlas) Connected Successfully");
            connected = true;
        } catch (err) {
            console.error("⚠️ MongoDB Atlas Connection Error:", err.message);
            console.log("👉 Falling back to Local MongoDB In-Memory Server...");
        }
    }
    
    // 2. Fallback to Local MongoDB memory server if Atlas is unreachable or configuration is invalid
    if (!connected) {
        try {
            const dbPath = path.join(__dirname, "database_data");
            if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

            const { MongoMemoryServer } = require("mongodb-memory-server");
            const mongoServer = await MongoMemoryServer.create({
                instance: { dbPath: dbPath }
            });
            const mongoUri = mongoServer.getUri();
            await mongoose.connect(mongoUri);
            console.log("✅ MongoDB (Local In-Memory) Connected Successfully");
            console.log(`📂 Database is PERMANENTLY stored at: ${dbPath}`);
        } catch (localErr) {
            console.error("❌ Critical Error: Failed to initialize Local MongoDB:", localErr.message);
        }
    }

        // Seed or fix admin if needed
        const User = require("./models/User");
        let existing = await User.findOne({ phone: "9999999999" });
        if (!existing) {
            await User.create({
                phone: "9999999999",
                password: "admin123",
                hospitalName: "GiftLife HQ",
                role: "admin"
            });
            console.log("🔑 Admin created: 9999999999 / admin123");
        } else if (!existing.password.startsWith('$2')) {
            // Password is not a bcrypt hash, fix it
            existing.password = "admin123";
            await existing.save();
            console.log("🔑 Admin password hash fixed.");
        }

        // Force drop stale email index
        try {
            await mongoose.connection.db.collection('users').dropIndex('email_1');
            console.log("✅ Stale email_1 index dropped permanently.");
        } catch (e) {
            // Ignore if index doesn't exist
        }

    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
    }
}
connectDB();

// Routes
const donorRoutes = require("./routes/donorRoutes");
const requestRoutes = require("./routes/requestRoutes");
const { router: authRoutes } = require("./routes/authRoutes");

app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/auth", authRoutes);

// Serve pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/register-requester", (req, res) => res.sendFile(path.join(__dirname, "public", "register-requester.html")));
app.get("/search", (req, res) => res.sendFile(path.join(__dirname, "public", "search.html")));
app.get("/emergency", (req, res) => res.sendFile(path.join(__dirname, "public", "emergency.html")));
app.get("/dashboard-admin", (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard-admin.html")));
app.get("/dashboard-donor", (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard-donor.html")));
app.get("/dashboard-requester", (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard-requester.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🩸 GiftLife Server running on http://localhost:${PORT}`);
    console.log(`   ├── Home:      http://localhost:${PORT}/`);
    console.log(`   ├── Register:  http://localhost:${PORT}/register`);
    console.log(`   ├── Search:    http://localhost:${PORT}/search`);
    console.log(`   ├── Emergency: http://localhost:${PORT}/emergency`);
    console.log(`   ├── Dashboards:http://localhost:${PORT}/dashboard-...`);
    console.log(`   └── Login:     http://localhost:${PORT}/login\n`);
});
