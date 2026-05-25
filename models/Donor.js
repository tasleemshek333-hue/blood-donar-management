const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    age: {
        type: Number,
        required: [true, "Age is required"],
        min: [18, "Must be at least 18 years old"],
        max: [65, "Must be 65 or younger"]
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: [true, "Gender is required"]
    },
    bloodGroup: {
        type: String,
        required: [true, "Blood group is required"],
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true
    },
    phone: {
        type: String,
        required: [true, "Phone is required"],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    weight: {
        type: Number,
        min: [45, "Minimum weight is 45 kg"]
    },
    lastDonation: {
        type: Date
    },
    medicalConditions: {
        type: String,
        trim: true,
        default: "None"
    },
    habits: [{
        type: String,
        enum: ["Drinking", "Smoking", "Drugs", "Other", "None"]
    }],
    available: {
        type: Boolean,
        default: true
    },
    lastDonationDate: {
        type: Date,
        default: null
    },
    availableAfter: {
        type: Date,
        default: null
    },
    donationCount: {
        type: Number,
        default: 0
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient search queries
donorSchema.index({ bloodGroup: 1, city: 1, available: 1 });

module.exports = mongoose.model("Donor", donorSchema);
