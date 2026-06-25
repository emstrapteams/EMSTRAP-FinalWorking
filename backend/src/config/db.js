import { connectEmergencyDB } from "./emergencyDb.js";
import { connectBookingDB } from "./bookingDb.js";

const connectDB = async () => {
  try {
    console.log("Connecting databases...");

    await connectEmergencyDB();
    await connectBookingDB();

    console.log("✅ All databases connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;