const mongoose = require("mongoose");

const requestResponseSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BloodRequest",
        required: true
    },
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    donorName: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Accepted", "Declined"],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a donor can only respond once per request
requestResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

module.exports = mongoose.model("RequestResponse", requestResponseSchema);
