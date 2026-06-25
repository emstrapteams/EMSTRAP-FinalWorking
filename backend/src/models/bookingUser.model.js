import { Schema } from "mongoose";

const bookingUserSchema = new Schema(
    {
        name: String,
        email: {
            type: String,
            unique: true,
        },
        mobile: String,
        password: String,
        address: String,
        city: String,

        isEmailVerified: Boolean,

        emailVerificationToken: String,
        emailVerificationTokenExpiry: Date,

        resetPasswordToken: String,
        resetPasswordExpire: Date,

        role: {
            type: String,
            default: "user",
        },
    },
    {
        timestamps: true,
    }
);

export const getBookingUserModel = (connection) =>
    connection.models.BookingUser ||
    connection.model(
        "BookingUser",
        bookingUserSchema,
        "users"
    );