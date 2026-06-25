import { Schema, model } from "mongoose";

const bookingSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        pickupLocation: {
            latitude: Number,
            longitude: Number,
            address: String,
        },

        dropoffLocation: {
            latitude: Number,
            longitude: Number,
            address: String,
        },

        hospital: {
            type: Schema.Types.ObjectId,
            ref: "Hospital",
            required: false,
        },

        ambulanceType: {
            type: String,
            enum: ["BASIC", "OXYGEN", "ICU", "PREGNANT"],
            default: "BASIC",
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "ACCEPTED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
            ],
            default: "PENDING",
        },

        ambulance: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        estimatedPrice: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: ["PENDING", "COMPLETED"],
            default: "PENDING",
        },

        paymentMethod: {
            type: String,
            enum: ["CASH", "CARD", "UPI"],
            default: null,
        },

        transactionId: {
            type: String,
            default: null,
        },

        paidAt: {
            type: Date,
            default: null,
        },
        distanceKm: {
            type: Number,
            default: 0,
        },

        requestId: {
            type: Schema.Types.ObjectId,
            ref: "EmergencyRequest",
            required: false,
        },
    },
    { timestamps: true }
);

export default model("Booking", bookingSchema);