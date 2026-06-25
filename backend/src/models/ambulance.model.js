import { Schema, model } from "mongoose";

const ambulanceSchema = new Schema(
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

        vehicleNumber: {
            type: String
        },

        driverStatus: {
            type: String,
            enum: ["LIVE", "OFFLINE"],
            default: "OFFLINE"
        },

        currentLocation: {
            latitude: Number,
            longitude: Number
        },

        isOnTrip: {
            type: Boolean,
            default: false
        },

        activeRequest: {
            type: Schema.Types.ObjectId,
            ref: "EmergencyRequest",
            default: null
        },

        role: {
            type: String,
            default: "ambulance_driver"
        },

        isEmailVerified: {
            type: Boolean,
            default: false
        },

        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    {
        timestamps: true
    });

export default model("Ambulance", ambulanceSchema);