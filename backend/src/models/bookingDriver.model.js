import { Schema } from "mongoose";

const bookingDriverSchema = new Schema(
    {
        name: String,
        email: {
            type: String,
            unique: true,
        },
        password: String,
        mobile: String,
        address: String,
        city: String,

        vehicleNumber: String,

        driverStatus: {
            type: String,
            enum: ["LIVE", "OFFLINE"],
            default: "OFFLINE",
        },

        isOnTrip: {
            type: Boolean,
            default: false,
        },

        resetPasswordToken: String,
        resetPasswordExpire: Date,

        role: {
            type: String,
            default: "private_driver",
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        emailVerificationToken: String,
        emailVerificationTokenExpiry: Date,
    },
    {
        timestamps: true,
    }
);

export const getBookingDriverModel = (connection) =>
    connection.models.Driver ||
    connection.model(
        "Driver",
        bookingDriverSchema,
        "drivers"
    );