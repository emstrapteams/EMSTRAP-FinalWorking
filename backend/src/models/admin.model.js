import { Schema, model } from "mongoose";

const adminSchema = new Schema(
    {
        name: String,

        email: {
            type: String,
            unique: true
        },

        password: String,

        mobile: String,

        role: {
            type: String,
            default: "admin"
        },

        isEmailVerified: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    });

export default model("Admin", adminSchema);