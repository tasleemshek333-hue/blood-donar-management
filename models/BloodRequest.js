const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    patientName: {
        type: String,
        required: [true, "Patient name is required"],
        trim: true
    },
    bloodGroup: {
        type: String,
        required: [true, "Blood group is required"],
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    },
    unitsNeeded: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        default: 1
    },
    urgency: {
        type: String,
        enum: ["Critical", "Urgent", "Normal"],
        default: "Normal"
    },
    hospital: {
        type: String,
        required: [true, "Hospital name is required"],
        trim: true
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true
    },
    contactPerson: {
        type: String,
        required: true,
        trim: true
    },
    contactPhone: {
        type: String,
        required: true,
        trim: true
    },
    additionalNotes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["Active", "Fulfilled", "Expired"],
        default: "Active"
    },
    donorsNotified: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
