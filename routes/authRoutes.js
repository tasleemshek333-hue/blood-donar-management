const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Middleware: require login
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    return res.status(401).json({ success: false, message: "Unauthorized. Please login." });
}

// Middleware: require role
function requireRole(...roles) {
    return function(req, res, next) {
        if (req.session && roles.includes(req.session.role)) return next();
        return res.status(403).json({ success: false, message: `Access denied. Allowed roles: ${roles.join(', ')}.` });
    }
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { phone, password, role } = req.body;
        if (!phone || !password || !role)
            return res.status(400).json({ success: false, message: "Phone, password, and role are required." });

        const user = await User.findOne({ phone: phone.trim(), role });
        if (!user)
            return res.status(401).json({ success: false, message: "Invalid credentials or role." });

        const isMatch = await user.comparePassword(password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid credentials or role." });

        // Set session
        req.session.userId = user._id;
        req.session.phone = user.phone;
        req.session.role = user.role;
        req.session.name = user.name || user.hospitalName;

        res.json({
            success: true,
            message: `Welcome, ${user.name || user.hospitalName || user.phone}!`,
            user: {
                id: user._id,
                phone: user.phone,
                role: user.role,
                name: user.name || user.hospitalName
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Login failed: " + err.message });
    }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { phone, password, role, name, hospitalName } = req.body;
        if (!phone || !password || !role) {
            return res.status(400).json({ success: false, message: "Phone, password, and role are required." });
        }

        const existing = await User.findOne({ phone: phone.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: "Phone number already exists." });
        }

        const user = new User({
            phone,
            password,
            role,
            name,
            hospitalName
        });

        await user.save();

        res.status(201).json({ success: true, message: "Registration successful. Please login.", userId: user._id });
    } catch (err) {
        res.status(500).json({ success: false, message: "Registration failed." });
    }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: "Logged out successfully." });
    });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({
            success: true,
            user: {
                id: req.session.userId,
                phone: req.session.phone,
                role: req.session.role,
                name: req.session.name
            }
        });
    }
    return res.status(401).json({ success: false, message: "Not logged in." });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: "Could not log out." });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully." });
    });
});

// GET /api/auth/all-requesters — Admin: list all requester accounts
router.get("/all-requesters", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const users = await User.find({ role: "requester" }).select("-password").sort({ createdAt: -1 });
        const BloodRequest = require("../models/BloodRequest");
        const usersWithCount = await Promise.all(users.map(async u => {
            const requestCount = await BloodRequest.countDocuments({ requesterId: u._id });
            return { ...u.toObject(), requestCount };
        }));
        res.json({ success: true, users: usersWithCount });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch requesters." });
    }
});

// POST /api/auth/forgot-password — Request an OTP to reset password
router.post("/forgot-password", async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number is required." });
        }

        const user = await User.findOne({ phone: phone.trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not registered with this phone number." });
        }

        // Generate a 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expire in 5 minutes
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        user.resetOtp = otp;
        user.resetOtpExpires = expires;
        await user.save();

        console.log(`\n🔑 [DEMO OTP SYSTEM] Generated OTP for phone ${phone}: ${otp}\n`);

        res.json({
            success: true,
            message: `OTP sent successfully to your mobile number.`,
            devOtp: otp // Returned in response for easy testing in development
        });
    } catch (err) {
        console.error("Forgot Password Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to generate OTP." });
    }
});

// POST /api/auth/reset-password — Reset password using verification OTP
router.post("/reset-password", async (req, res) => {
    try {
        const { phone, otp, newPassword } = req.body;
        if (!phone || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "Phone, OTP, and new password are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }

        const user = await User.findOne({ phone: phone.trim() });
        if (!user || !user.resetOtp || !user.resetOtpExpires) {
            return res.status(400).json({ success: false, message: "No active password reset session found." });
        }

        // Check if OTP is correct
        if (user.resetOtp !== otp.trim()) {
            return res.status(400).json({ success: false, message: "Invalid OTP code." });
        }

        // Check if expired
        if (new Date() > user.resetOtpExpires) {
            return res.status(400).json({ success: false, message: "OTP code has expired. Please try again." });
        }

        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successful! You can now login with your new password."
        });
    } catch (err) {
        console.error("Reset Password Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to reset password." });
    }
});

module.exports = { router, requireAuth, requireRole };

