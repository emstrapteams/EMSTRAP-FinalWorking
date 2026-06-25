import { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "BookingUser",
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
                "ARRIVED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED"
            ],
            default: "PENDING",
        },
        ambulance: {
            type: Schema.Types.ObjectId,
            ref: "Driver",
            default: null,
        },
        estimatedPrice: Number,
        distanceKm: Number,
        needs: String,
        paymentStatus: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED"],
            default: "PENDING",
        },
        paymentMethod: String,
        transactionId: String,
        paidAt: Date,
        requestId: {
            type: Schema.Types.ObjectId,
            required: false,
        },
    },
    { timestamps: true }
);

export const getBookingDbBookingModel = (connection) =>
    connection.models.Booking ||
    connection.model("Booking", bookingSchema, "bookings");