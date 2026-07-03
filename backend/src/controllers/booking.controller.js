import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDbBookingModel } from "../models/bookingDbBooking.model.js";
import { getBookingUserModel } from "../models/bookingUser.model.js";
import EmergencyRequest from "../models/emergencyrequest.model.js";
import { getIO } from "../sockets/socket.js";

const resolveBookingUserIds = async (user) => {
    const bookingConnection = getBookingConnection();
    const BookingUser = getBookingUserModel(bookingConnection);
    const bookingUser = await BookingUser.findOne({ email: user.email });
    const ids = [user._id];
    if (bookingUser) {
        ids.push(bookingUser._id);
    }
    return { bookingUser, ids };
};

const canAccessBooking = async (booking, req) => {
    if (req.user.role === "admin") return true;
    const { ids } = await resolveBookingUserIds(req.user);
    if (req.user.role === "user") {
        return ids.some((id) => id.toString() === booking.user.toString());
    }
    if (req.user.role === "private_driver") {
        return booking.ambulance?.toString() === req.user._id.toString();
    }
    return false;
};

const isAssignedPrivateDriver = (booking, req) =>
    req.user.role === "private_driver" &&
    booking.ambulance?.toString() === req.user._id.toString();
export const createBooking = async (req, res) => {
    
    try {
        if (!["user", "admin"].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Only users can create bookings" });
        }

        const bookingConnection = getBookingConnection();
        const Booking =
            getBookingDbBookingModel(bookingConnection);
        const { pickupLocation, dropoffLocation, ambulanceType, needs, distanceKm } = req.body;

        let baseRate = 100; // BASIC
        if (ambulanceType === "OXYGEN") baseRate = 150;
        if (ambulanceType === "ICU") baseRate = 250;
        if (ambulanceType === "PREGNANT") baseRate = 200;

        const estimatedPrice = distanceKm ? parseFloat((distanceKm * baseRate).toFixed(2)) : 500;
        const minFares = { BASIC: 500, OXYGEN: 750, ICU: 1250, PREGNANT: 1000 };
        const finalPrice = Math.max(estimatedPrice, minFares[ambulanceType] || 500);

        const { bookingUser } = await resolveBookingUserIds(req.user);
        const bookingUserId = bookingUser?._id || req.user._id;

        const booking = await Booking.create({
            user: bookingUserId,
            pickupLocation,
            dropoffLocation,
            ambulanceType,
            needs,
            distanceKm,
            estimatedPrice: finalPrice
        });

        const io = getIO();

        io.to("private_driver").emit(
            "new_booking_request",
            booking
        );

        res.status(201).json({
            success: true,
            data: booking,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getBookings = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const Booking =
            getBookingDbBookingModel(bookingConnection);
        const { ids: bookingUserIds } = await resolveBookingUserIds(req.user);

        // Fetch regular bookings
        const bookings = await Booking.find({ user: { $in: bookingUserIds } }).sort({ createdAt: -1 });

        // Fetch emergency requests that are NOT linked to bookings (standalone emergencies)
        // and only show those that are PENDING or ACCEPTED
        const standaloneEmergencies = await EmergencyRequest.find({
            user: req.user._id,
            requestType: "EMERGENCY"
        }).sort({ createdAt: -1 });

        const mapEmergencyStatus = (status) => {
            switch (status) {
                case "PENDING":
                    return "PENDING";

                case "AMBULANCE_ACCEPTED":
                case "ARRIVED_AT_LOCATION":
                case "EN_ROUTE_TO_HOSPITAL":
                    return "IN_PROGRESS";

                case "COMPLETED":
                    return "COMPLETED";

                case "CANCELLED":
                    return "CANCELLED";

                default:
                    return status;
            }
        };

        // Transform emergencies to match booking-like structure for the UI
        const transformedEmergencies = standaloneEmergencies.map(err => ({
            _id: err._id,
            requestId: err._id,
            type: "emergency",
            status: mapEmergencyStatus(err.status),
            ambulanceType: "EMERGENCY",
            pickupLocation: { address: "Live Emergency Location" },
            estimatedPrice: 0,
            createdAt: err.createdAt,
            isEmergency: true
        }));

        // Combine and sort by date
        const transformedBookings = bookings.map(booking => ({
            ...booking.toObject(),

            type: "booking",

            isEmergency: false
        }));

        const combined = [...transformedBookings, ...transformedEmergencies].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.status(200).json({
            success: true,
            data: combined,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const Booking =
            getBookingDbBookingModel(bookingConnection);
        const { id } = req.params;
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // Only the owner, an ambulance driver, or an admin can cancel
        const { ids: bookingUserIds } = await resolveBookingUserIds(req.user);
        const isOwner = bookingUserIds.some(
            (id) => id.toString() === booking.user.toString()
        );
        const isDriver = req.user.role === "private_driver" &&
            booking.ambulance?.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isDriver && !isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized to cancel this booking" });
        }

        booking.status = "CANCELLED";
        await booking.save();

        const io = getIO();
        io.to(`request_${id}`).emit("booking_cancelled", { bookingId: id });
        io.to("private_driver").emit("booking_cancelled", { bookingId: id });

        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            data: booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
export const getBookingById = async (req, res) => {
    try {
        console.log("BOOKING ID:", req.params.id);

        const bookingConnection = getBookingConnection();
        const BookingModel = getBookingDbBookingModel(bookingConnection);

        const booking = await BookingModel.findById(req.params.id);

        console.log("BOOKING FOUND:", booking);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (!(await canAccessBooking(booking, req))) {
            return res.status(403).json({ success: false, message: "Not authorized to view this booking" });
        }

        res.json({
            success: true,
            data: booking,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getPaymentStatus = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const BookingModel = getBookingDbBookingModel(bookingConnection);

        const booking = await BookingModel.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (!(await canAccessBooking(booking, req))) {
            return res.status(403).json({ success: false, message: "Not authorized to view this booking" });
        }

        res.json({
            success: true,
            data: {
                status: booking.paymentStatus,
                amount: booking.estimatedPrice,
                paymentMethod: booking.paymentMethod,
                transactionId: booking.transactionId,
                paidAt: booking.paidAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const processPayment = async (req, res) => {
    try {
        const { paymentMethod } = req.body;

        const bookingConnection = getBookingConnection();
        const BookingModel = getBookingDbBookingModel(bookingConnection);

        const booking = await BookingModel.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (!(await canAccessBooking(booking, req))) {
            return res.status(403).json({ success: false, message: "Not authorized to pay for this booking" });
        }

        booking.paymentStatus = "COMPLETED";
        booking.paymentMethod = paymentMethod;
        booking.transactionId = "TXN-" + Date.now();
        booking.paidAt = new Date();

        await booking.save();

        res.json({
            success: true,
            data: {
                amount: booking.estimatedPrice,
                paymentMethod: booking.paymentMethod,
                transactionId: booking.transactionId,
                paidAt: booking.paidAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAvailableBookings = async (req, res) => {
    try {
        if (req.user.role !== "private_driver") {
            return res.status(403).json({ success: false, message: "Private driver access required" });
        }

        const bookingConnection = getBookingConnection();
        const Booking =
            getBookingDbBookingModel(bookingConnection);

        const bookings = await Booking.find({
            status: "PENDING",
            ambulance: null,
            declinedBy: {
                $ne: req.user._id
            }
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: bookings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const acceptBooking = async (req, res) => {
    try {
        if (req.user.role !== "private_driver") {
            return res.status(403).json({ success: false, message: "Private driver access required" });
        }

        const bookingConnection = getBookingConnection();
        const Booking =
            getBookingDbBookingModel(bookingConnection);

        const booking = await Booking.findOneAndUpdate(
            { _id: req.params.id, status: "PENDING", ambulance: null },
            {
                ambulance: req.user._id,
                status: "ACCEPTED"
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not available" });
        }

        res.json({
            success: true,
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const arriveBooking = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const Booking = getBookingDbBookingModel(bookingConnection);

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (!isAssignedPrivateDriver(booking, req)) {
            return res.status(403).json({ success: false, message: "Only the assigned driver can update this booking" });
        }

        if (booking.status !== "ACCEPTED") {
            return res.status(400).json({ success: false, message: "Booking must be accepted before marking arrival" });
        }

        booking.status = "ARRIVED";

        await booking.save();

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const startBookingTrip = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const Booking = getBookingDbBookingModel(bookingConnection);

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (!isAssignedPrivateDriver(booking, req)) {
            return res.status(403).json({ success: false, message: "Only the assigned driver can update this booking" });
        }

        if (booking.status !== "ARRIVED") {
            return res.status(400).json({ success: false, message: "Booking must be marked arrived before starting trip" });
        }

        booking.status = "IN_PROGRESS";

        await booking.save();

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const completeBooking = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const Booking = getBookingDbBookingModel(bookingConnection);

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (!isAssignedPrivateDriver(booking, req)) {
            return res.status(403).json({ success: false, message: "Only the assigned driver can update this booking" });
        }

        if (booking.status !== "IN_PROGRESS") {
            return res.status(400).json({ success: false, message: "Booking must be in progress before completing" });
        }

        booking.status = "COMPLETED";

        await booking.save();

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const getPrivateDriverDashboard = async (req, res) => {
    try {
        if (req.user.role !== "private_driver") {
            return res.status(403).json({ success: false, message: "Private driver access required" });
        }

        const bookingConnection = getBookingConnection();
        const Booking = getBookingDbBookingModel(bookingConnection);

        const driverId = req.user._id;

        const pending = await Booking.find({
            status: "PENDING",
            ambulance: null,
            declinedBy: {
                $ne: driverId
            }
        }).sort({ createdAt: -1 });

        const accepted = await Booking.find({
            ambulance: driverId,
            status: { $in: ["ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"] }
        }).sort({ updatedAt: -1 });

        res.json({
            success: true,
            data: {
                pending,
                accepted
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const declineBooking = async (req, res) => {
    try {
        const bookingConnection = getBookingConnection();
        const Booking = getBookingDbBookingModel(bookingConnection);

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Only pending bookings can be declined
        if (booking.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Booking is no longer pending",
            });
        }

        // Track who declined
        if (!booking.declinedBy) {
            booking.declinedBy = [];
        }

        const alreadyDeclined = booking.declinedBy.some(
            id => id.toString() === req.user._id.toString()
        );

        if (!alreadyDeclined) {
            booking.declinedBy.push(req.user._id);
        }
        await booking.save();
        const io = getIO();

        io.to("private_driver").emit("booking_declined", {
            bookingId: booking._id,
            driverId: req.user._id
        });
        res.json({
            success: true,
            message: "Booking declined",
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};