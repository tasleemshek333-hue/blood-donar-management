const express = require("express");
const router = express.Router();
const Donor = require("../models/Donor");
const User = require("../models/User");
const Notification = require("../models/Notification");
const RequestResponse = require("../models/RequestResponse");
const { requireAuth, requireRole } = require("./authRoutes");

// Register a new donor (creates User and Donor profile)
router.post("/register", async (req, res) => {
    try {
        const { phone, password, name, age, gender, bloodGroup, city, weight, lastDonation, habits, medicalConditions } = req.body;

        // Create User
        const existingUser = await User.findOne({ phone: phone.trim() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Phone number already exists." });
        }

        const user = new User({
            phone,
            password,
            role: "donor",
            name
        });
        await user.save();

        // Create Donor Profile
        const donor = new Donor({
            userId: user._id,
            name,
            age,
            gender,
            bloodGroup,
            city,
            phone,
            weight: weight || undefined,
            lastDonation: lastDonation || undefined,
            habits: habits || [],
            medicalConditions: medicalConditions || "None"
        });
        await donor.save();

        res.status(201).json({ success: true, message: "Donor registered successfully!", userId: user._id });
    } catch (err) {
        console.error("Donor registration error:", err.message);
        res.status(500).json({ success: false, message: "Registration failed: " + err.message });
    }
});

// Get current logged-in donor profile
router.get("/me", requireAuth, requireRole("donor"), async (req, res) => {
    try {
        const donor = await Donor.findOne({ userId: req.session.userId });
        if (!donor) return res.status(404).json({ success: false, message: "Donor profile not found." });

        // Auto-reactivate if cooldown period has passed
        if (!donor.available && donor.availableAfter && new Date() >= donor.availableAfter) {
            donor.available = true;
            donor.availableAfter = null;
            await donor.save();
        }

        const notifications = await Notification.find({ userId: req.session.userId }).sort({ createdAt: -1 });

        res.json({ success: true, donor, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch profile." });
    }
});

// Toggle current donor availability
router.patch("/me/toggle", requireAuth, requireRole("donor"), async (req, res) => {
    try {
        const donor = await Donor.findOne({ userId: req.session.userId });
        if (!donor) return res.status(404).json({ success: false, message: "Donor profile not found." });

        // Prevent toggling to available during active cooldown
        if (!donor.available && donor.availableAfter && new Date() < donor.availableAfter) {
            const cooldownEnd = new Date(donor.availableAfter).toLocaleDateString();
            return res.status(400).json({
                success: false,
                message: `You are on a 3-month donation cooldown. You will be automatically reactivated on ${cooldownEnd}.`,
                cooldown: true,
                availableAfter: donor.availableAfter
            });
        }

        donor.available = !donor.available;
        // If manually going unavailable, clear any cooldown
        if (!donor.available) {
            // Just toggle off, no cooldown needed
        } else {
            donor.availableAfter = null;
        }
        await donor.save();
        res.json({ success: true, message: `You are now ${donor.available ? "available" : "unavailable"}.`, donor });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update." });
    }
});

// Donor accepts or declines a request
router.post("/respond", requireAuth, requireRole("donor"), async (req, res) => {
    try {
        const { requestId, status } = req.body;
        
        const response = new RequestResponse({
            requestId,
            donorId: req.session.userId,
            status // "Accepted" or "Declined"
        });
        await response.save();

        res.json({ success: true, message: `Request ${status.toLowerCase()} successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to respond." });
    }
});

// Admin routes below

// Get all donors (for admin dashboard)
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const donors = await Donor.find().sort({ registeredAt: -1 });

        // Auto-reactivate any donors whose cooldown has expired
        const now = new Date();
        for (const donor of donors) {
            if (!donor.available && donor.availableAfter && now >= donor.availableAfter) {
                donor.available = true;
                donor.availableAfter = null;
                await donor.save();
            }
        }

        res.json({ success: true, donors, count: donors.length });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch donors." });
    }
});

// Get donor stats (public)
router.get("/stats", async (req, res) => {
    try {
        const totalDonors = await Donor.countDocuments();
        const availableDonors = await Donor.countDocuments({ available: true });
        
        // Sum total donations
        const donationAgg = await Donor.aggregate([{ $group: { _id: null, total: { $sum: "$donationCount" } } }]);
        const totalDonations = donationAgg.length > 0 ? donationAgg[0].total : 0;
        
        // Count unique cities
        const cityStats = await Donor.distinct("city");
        
        // Blood group distribution
        const bloodGroupStats = await Donor.aggregate([
            { $group: { _id: "$bloodGroup", count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            stats: { totalDonors, availableDonors, totalDonations, cityStats, bloodGroupStats }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to get stats." });
    }
});

// Toggle donor availability (admin)
router.patch("/:id/toggle", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const donor = await Donor.findById(req.params.id);
        if (!donor) return res.status(404).json({ success: false, message: "Donor not found." });

        donor.available = !donor.available;
        await donor.save();
        res.json({ success: true, message: `Donor is now ${donor.available ? "available" : "unavailable"}.`, donor });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update." });
    }
});

// Search donors (admin/public depending on how we handle it, let's keep it open for now or require admin)
router.get("/search", async (req, res) => {
    try {
        const { bloodGroup, city } = req.query;
        const filter = { available: true };
        if (bloodGroup && bloodGroup !== "all") filter.bloodGroup = bloodGroup;
        if (city) filter.city = new RegExp(city, "i");

        const donors = await Donor.find(filter).sort({ registeredAt: -1 });
        res.json({ success: true, donors, count: donors.length });
    } catch (err) {
        res.status(500).json({ success: false, message: "Search failed." });
    }
});

// Locality stats for donor dashboard
router.get("/locality-stats", requireAuth, requireRole("donor"), async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) return res.json({ success: true, stats: { totalDonors: 0, linkedHospitals: 0, responseRate: 0 } });

        const totalDonors = await Donor.countDocuments({ city: new RegExp(city, "i") });

        // Get unique hospitals from blood requests in that city
        const hospitals = await require("../models/BloodRequest").distinct("hospital", { city: new RegExp(city, "i") });

        // Response rate = fulfilled / total requests in city
        const BloodRequest = require("../models/BloodRequest");
        const totalReqs = await BloodRequest.countDocuments({ city: new RegExp(city, "i") });
        const fulfilledReqs = await BloodRequest.countDocuments({ city: new RegExp(city, "i"), status: "Fulfilled" });
        const responseRate = totalReqs > 0 ? Math.round((fulfilledReqs / totalReqs) * 100) : 0;

        res.json({
            success: true,
            stats: {
                totalDonors,
                linkedHospitals: hospitals.length,
                responseRate
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to get locality stats." });
    }
});

module.exports = router;
