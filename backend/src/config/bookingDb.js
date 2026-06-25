import mongoose from "mongoose";

let bookingConnection;

export const connectBookingDB = async () => {
    if (bookingConnection) {
        return bookingConnection;
    }

    if (!process.env.MONGO_URI_BOOKING) {
        throw new Error("MONGO_URI_BOOKING is not configured");
    }

    bookingConnection = await mongoose
        .createConnection(process.env.MONGO_URI_BOOKING, {
            serverSelectionTimeoutMS: 10000,
        })
        .asPromise();

    console.log("✅ Booking DB connected");

    return bookingConnection;
};

export const getBookingConnection = () => {
    if (!bookingConnection) {
        throw new Error(
            "Booking DB not initialized. Call connectBookingDB() first."
        );
    }

    return bookingConnection;
};