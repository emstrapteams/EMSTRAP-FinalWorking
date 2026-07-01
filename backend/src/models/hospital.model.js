import { Schema, model } from "mongoose";

const hospitalSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            default: "hospital"
        },
        mobile: {
            type: String,
            required: true
        },

        address: {
            type: String,
            required: true
        },

        city: {
            type: String,
            required: true
        },

        emergencyBeds: {
            type: Number,
            default: 0,
            min: 0
        },

        isEmailVerified: {
            type: Boolean,
            default: true
        },

        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    {
        timestamps: true
    });

export default model("Hospital", hospitalSchema);