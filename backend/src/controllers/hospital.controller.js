import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Hospital from "../models/hospital.model.js";
const isValidEmail = (email) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);

const validateHospitalPayload = (payload, isPartial = false) => {
  const requiredFields = ["name", "address", "city", "mobile", "email"];

  for (const field of requiredFields) {
    if (!isPartial && !payload[field]) {
      return `${field} is required`;
    }
  }

  if (payload.email && !isValidEmail(payload.email)) {
    return "Please provide a valid email address";
  }

  return null;
};

export const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find()
      .select("-password")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      hospitals
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching hospitals",
      error: error.message
    });
  }
};

export const getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).select("-password");

    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    return res.status(200).json({ success: true, hospital });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching hospital", error: error.message });
  }
};
export const getAvailableHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      emergencyBeds: { $gt: 0 },
    })
      .select("-password")
      .sort({
        emergencyBeds: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      hospitals,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching available hospitals",
      error: error.message,
    });
  }
};
export const createHospital = async (req, res) => {
  try {
    const validationError = validateHospitalPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const hospital = await Hospital.create({
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      mobile: req.body.mobile,
      email: req.body.email,
      password: hashedPassword,
      role: "hospital",
      emergencyBeds: req.body.emergencyBeds ?? 0,
      isEmailVerified: true,
    });
    console.log("CREATED HOSPITAL:", hospital);
    return res.status(201).json({ success: true, message: "Hospital created successfully", hospital });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating hospital", error: error.message });
  }
};

export const updateHospital = async (req, res) => {
  try {
    const validationError = validateHospitalPayload(req.body, true);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const updatePayload = {};
    for (const field of ["name", "address", "city", "mobile", "email", "password"]) {
      if (typeof req.body[field] !== "undefined" && req.body[field] !== "") {
        updatePayload[field] = req.body[field];
      }
    }

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    return res.status(200).json({ success: true, message: "Hospital updated successfully", hospital });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating hospital", error: error.message });
  }
};

export const updateEmergencyBeds = async (req, res) => {
  try {
    const { emergencyBeds } = req.body;
    if (req.user.role !== "hospital") {
      return res.status(403).json({
        success: false,
        message: "Only hospitals can update emergency bed availability.",
      });
    }
    // Validate input
    if (
      emergencyBeds === undefined ||
      emergencyBeds === null ||
      emergencyBeds < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid number of emergency beds.",
      });
    }

    // Logged-in hospital
    const hospitalId = req.user._id.toString();

    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { emergencyBeds },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency bed availability updated successfully.",
      hospital,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating emergency beds.",
      error: error.message,
    });
  }
};

export const deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    return res.status(200).json({ success: true, message: "Hospital deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting hospital", error: error.message });
  }
};
