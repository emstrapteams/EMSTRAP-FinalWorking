import Emergency from "../models/emergencyrequest.model.js";
import User from "../models/user.model.js";
import Hospital from "../models/hospital.model.js";
import Police from "../models/police.model.js";
import Ambulance from "../models/ambulance.model.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDbBookingModel } from "../models/bookingDbBooking.model.js";

const getBookingModel = () => {
  const bookingConnection = getBookingConnection();
  return getBookingDbBookingModel(bookingConnection);
};
export const getAlerts = async (req, res) => {
  try {
    const alerts = await Emergency.find({
      requestType: "EMERGENCY",
      duplicateDetected: { $ne: true }
    })
      .populate("user", "name email mobile city")
      .populate("ambulance", "name email mobile vehicleNumber")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, alerts });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching alerts", error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const [totalAlerts, activeAlerts, totalHospitals, totalBookings, totalUsers, totalAmbulanceDrivers, totalPolice] = await Promise.all([
      Emergency.countDocuments(),
      Emergency.countDocuments({ status: { $in: ["PENDING", "AMBULANCE_ACCEPTED"] } }),
      Hospital.countDocuments(),
      getBookingModel().countDocuments(),
      User.countDocuments(),
      Ambulance.countDocuments(),
      Police.countDocuments(),
    ]);
    return res.status(200).json({
      success: true,
      stats: {
        totalAlerts,
        activeAlerts,
        totalHospitals,
        totalBookings,
        totalUsers,
        totalAmbulances: totalAmbulanceDrivers,
        totalPolice,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching stats", error: error.message });
  }
};

export const getOverviewStats = async (req, res) => {
  try {
    const [users, bookings, hospitals, emergencies, liveAmbulances, police] = await Promise.all([
      User.countDocuments(),
      getBookingModel().countDocuments(),
      Hospital.countDocuments(),
      Emergency.countDocuments(),
      Ambulance.countDocuments({ driverStatus: "LIVE" }),
      Police.countDocuments(),
    ]);

    return res.status(200).json({
      users,
      bookings,
      hospitals,
      emergencies,
      liveAmbulances,
      police,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching overview stats", error: error.message });
  }
};
export const updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "AMBULANCE_ACCEPTED", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updated = await Emergency.findByIdAndUpdate(id, { status }, { new: true })
      .populate("user", "name email mobile city")
      .populate("ambulance", "name email mobile vehicleNumber");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Emergency not found" });
    }

    return res.status(200).json({ success: true, message: "Status updated", emergency: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating status", error: error.message });
  }
};
