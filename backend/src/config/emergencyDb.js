import mongoose from "mongoose";

export const connectEmergencyDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not configured");
    }

    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ Emergency DB connected");

    return mongoose.connection;
};