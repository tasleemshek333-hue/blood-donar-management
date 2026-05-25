const express = require("express");
const router = express.Router();
const BloodRequest = require("../models/BloodRequest");
const Donor = require("../models/Donor");
const Notification = require("../models/Notification");
const RequestResponse = require("../models/RequestResponse");
const { requireAuth, requireRole } = require("./authRoutes");

// POST /api/requests/create — Requester or Admin creates a blood request
router.post("/create", requireAuth, requireRole("requester", "admin"), async (req, res) => {
    try {
        const request = new BloodRequest({
            ...req.body,
            requesterId: req.session.userId,
            contactPerson: req.body.contactPerson || req.session.name || 'Hospital Admin',
            contactPhone: req.body.contactPhone || req.session.phone || 'N/A'
        });
        await request.save();

        res.status(201).json({
            success: true,
            message: "Blood request created successfully!",
            request
        });
    } catch (err) {
        console.error("Request Creation Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to create request: " + err.message });
    }
});

// GET /api/requests/my-requests — Requester views their own requests
router.get("/my-requests", requireAuth, requireRole("requester"), async (req, res) => {
    try {
        const requests = await BloodRequest.find({ requesterId: req.session.userId }).sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch requests." });
    }
});

// GET /api/requests/my-responses — Requester views donor responses to their requests
router.get("/my-responses", requireAuth, requireRole("requester"), async (req, res) => {
    try {
        // Get all requests by this requester
        const myRequests = await BloodRequest.find({ requesterId: req.session.userId });
        const reqIds = myRequests.map(r => r._id);

        // Get all responses to those requests
        const responses = await RequestResponse.find({ requestId: { $in: reqIds } })
            .populate("donorId", "name phone bloodGroup")
            .populate("requestId", "patientName bloodGroup hospital")
            .sort({ createdAt: -1 });

        const formatted = responses.map(r => ({
            _id: r._id,
            status: r.status,
            donorName: r.donorId?.name || "Unknown",
            donorPhone: r.status === "Accepted" ? r.donorId?.phone : null,
            patientName: r.requestId?.patientName || "—",
            createdAt: r.createdAt
        }));

        res.json({ success: true, responses: formatted });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch responses." });
    }
});

// GET /api/requests/matching — Donor sees requests matching their blood group & city
router.get("/matching", requireAuth, requireRole("donor"), async (req, res) => {
    try {
        const { bloodGroup, city } = req.query;
        const filter = { status: "Active" };
        if (bloodGroup) filter.bloodGroup = bloodGroup;
        if (city) filter.city = new RegExp(city, "i");

        const requests = await BloodRequest.find(filter).sort({ createdAt: -1 }).limit(10);

        // Filter out ones the donor already responded to
        const donorId = req.session.userId;
        const myResponses = await RequestResponse.find({ donorId });
        const respondedIds = myResponses.map(r => r.requestId.toString());

        const pending = requests.filter(r => !respondedIds.includes(r._id.toString()));

        res.json({ success: true, requests: pending });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch matching requests." });
    }
});

// POST /api/requests/respond — Donor accepts or declines a request
router.post("/respond", requireAuth, requireRole("donor"), async (req, res) => {
    try {
        const { requestId, status } = req.body;
        if (!requestId || !status) return res.status(400).json({ success: false, message: "requestId and status required." });

        // Check for duplicate response
        const existing = await RequestResponse.findOne({ requestId, donorId: req.session.userId });
        if (existing) return res.status(400).json({ success: false, message: "You already responded to this request." });

        const donor = await Donor.findOne({ userId: req.session.userId });

        const response = new RequestResponse({
            requestId,
            donorId: req.session.userId,
            donorName: donor?.name,
            status
        });
        await response.save();

        // If donor accepted, mark them unavailable for 3 months (cooldown)
        if (status === "Accepted" && donor) {
            const now = new Date();
            const threeMonthsLater = new Date(now);
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

            donor.available = false;
            donor.lastDonationDate = now;
            donor.availableAfter = threeMonthsLater;
            donor.donationCount = (donor.donationCount || 0) + 1;
            await donor.save();

            return res.json({
                success: true,
                message: `Request accepted! Thank you for donating. You are now on a 3-month cooldown until ${threeMonthsLater.toLocaleDateString()}.`
            });
        }

        res.json({ success: true, message: `Request ${status.toLowerCase()} successfully.` });
    } catch (err) {
        console.error("Respond Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to respond." });
    }
});

// PATCH /api/requests/:id/fulfill — Requester marks request as fulfilled
router.patch("/:id/fulfill", requireAuth, requireRole("requester"), async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });
        if (request.requesterId.toString() !== req.session.userId)
            return res.status(403).json({ success: false, message: "Unauthorized." });

        request.status = "Fulfilled";
        await request.save();
        res.json({ success: true, message: "Request marked as fulfilled." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update." });
    }
});

// GET /api/requests/all — Admin: view all blood requests
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const requests = await BloodRequest.find().sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch requests." });
    }
});

// PATCH /api/requests/:id/status — Admin: update request status
router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });

        request.status = req.body.status;
        await request.save();
        res.json({ success: true, message: "Status updated.", request });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update." });
    }
});

// POST /api/requests/:id/alert — Admin: send emergency alerts to matching donors
router.post("/:id/alert", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });

        const matchingDonors = await Donor.find({
            bloodGroup: request.bloodGroup,
            city: new RegExp(request.city.trim(), "i"),
            available: true
        });

        for (let donor of matchingDonors) {
            if (donor.userId) {
                await Notification.create({
                    userId: donor.userId,
                    message: `URGENT: ${request.unitsNeeded} units of ${request.bloodGroup} needed at ${request.hospital}, ${request.city}. Patient: ${request.patientName}.`,
                    type: "Alert"
                });
            }
        }

        request.donorsNotified = (request.donorsNotified || 0) + matchingDonors.length;
        await request.save();

        res.json({
            success: true,
            message: `Emergency alert sent to ${matchingDonors.length} matching donors!`,
            donorsNotified: matchingDonors.length
        });
    } catch (err) {
        console.error("Alert Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to send alerts: " + err.message });
    }
});

// GET /api/requests/:id/matches — Admin: get matching available donors for a request
router.get("/:id/matches", async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });

        const matchingDonors = await Donor.find({
            bloodGroup: request.bloodGroup,
            city: new RegExp(request.city.trim(), "i"),
            available: true
        }).select("name phone bloodGroup city donationCount");

        res.json({ success: true, donors: matchingDonors, count: matchingDonors.length });
    } catch (err) {
        console.error("Matches Error:", err.message);
        res.status(500).json({ success: false, message: "Failed to fetch matches." });
    }
});

// GET /api/requests/stats — Admin: stats summary
router.get("/stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const total = await BloodRequest.countDocuments();
        const active = await BloodRequest.countDocuments({ status: "Active" });
        const fulfilled = await BloodRequest.countDocuments({ status: "Fulfilled" });
        res.json({ success: true, stats: { total, active, fulfilled } });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to get stats." });
    }
});

module.exports = router;
