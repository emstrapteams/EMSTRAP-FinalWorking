import bcrypt from "bcryptjs";
import Emergency from "../models/emergencyrequest.model.js";
import User from "../models/user.model.js";
import Police from "../models/police.model.js";
const isValidEmail = (email) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);

const validatePolicePayload = (payload, isPartial = false) => {
    const requiredFields = ["name", "mobile", "email", "address", "city"];
    if (!isPartial) requiredFields.push("password");

    for (const field of requiredFields) {
        if (!isPartial && !String(payload[field] || "").trim()) {
            return `${field} is required`;
        }
    }

    if (payload.email && !isValidEmail(payload.email)) {
        return "Please provide a valid email address";
    }

    if (payload.role && !["police", "police_hq"].includes(payload.role)) {
        return "Invalid role specified";
    }

    return null;
};

// Fetch Active System Emergencies for Police Command Center
export const getActiveEmergencies = async (req, res) => {
    try {
        const query = {
            status: { $in: ["PENDING", "AMBULANCE_ACCEPTED"] },
            requestType: "EMERGENCY"
        };

        if (req.user.role === "police") {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            query.createdAt = { $gte: oneDayAgo };
        }

        const emergencies = await Emergency.find(query)
            .populate("user", "name mobile")
            .populate("ambulance", "name mobile vehicleNumber")
            .populate("hospital", "name address city mobile email")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, emergencies });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching emergencies", error: error.message });
    }
};

// Fetch ALL emergencies as police cases
export const getPoliceCases = async (req, res) => {
    try {
        const query = { requestType: "EMERGENCY" };

        if (req.user.role === "police") {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            query.createdAt = { $gte: sevenDaysAgo };
        }

        const cases = await Emergency.find(query)
            .populate("user", "name mobile email address city")
            .populate("ambulance", "name mobile vehicleNumber")
            .populate("hospital", "name address city mobile email")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, cases });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching police cases", error: error.message });
    }
};

export const updateCaseStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["PENDING", "AMBULANCE_ACCEPTED", "COMPLETED", "CANCELLED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status` });
        }

        const updated = await Emergency.findByIdAndUpdate(id, { status }, { new: true })
            .populate("user", "name mobile email address city")
            .populate("ambulance", "name mobile vehicleNumber")
            .populate("hospital", "name address city mobile email");

        if (!updated) {
            return res.status(404).json({ success: false, message: "Case not found" });
        }

        return res.status(200).json({ success: true, message: "Case status updated", case: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error updating case status", error: error.message });
    }
};

export const getPoliceRecords = async (req, res) => {
    try {
        const police = await Police.find()
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            police
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching police records",
            error: error.message
        });
    }
};

export const getPoliceById = async (req, res) => {
    try {
        const police = await Police.findOne({ _id: req.params.id }).select("-password");

        if (!police) {
            return res.status(404).json({ success: false, message: "Police record not found" });
        }

        return res.status(200).json({ success: true, police });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching police record", error: error.message });
    }
};

export const createPoliceRecord = async (req, res) => {
    try {
        const validationError = validatePolicePayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const police = await Police.create({
            name: req.body.name,
            mobile: req.body.mobile,
            email: req.body.email,
            password: hashedPassword,
            address: req.body.address,
            city: req.body.city,
            role: req.body.role || "police",
            isEmailVerified: true,
        });

        return res.status(201).json({ success: true, message: "Police record created successfully", police });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "A user with this email already exists" });
        }
        return res.status(500).json({ success: false, message: "Error creating police record", error: error.message });
    }
};

export const updatePoliceRecord = async (req, res) => {
    try {
        const validationError = validatePolicePayload(req.body, true);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const updatePayload = {};
        for (const field of ["name", "mobile", "email", "address", "city", "role", "password"]) {
            if (typeof req.body[field] !== "undefined") {
                if (field === "password") {
                    if (!req.body.password) continue;
                    updatePayload.password = await bcrypt.hash(req.body.password, 10);
                    continue;
                }
                updatePayload[field] = req.body[field];
            }
        }

        const police = await Police.findOneAndUpdate(
            { _id: req.params.id },
            updatePayload,
            { new: true, runValidators: true }
        ).select("-password");

        if (!police) {
            return res.status(404).json({ success: false, message: "Police record not found" });
        }

        return res.status(200).json({ success: true, message: "Police record updated successfully", police });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "A user with this email already exists" });
        }
        return res.status(500).json({ success: false, message: "Error updating police record", error: error.message });
    }
};

export const deletePoliceRecord = async (req, res) => {
    try {
        const police = await Police.findByIdAndDelete(
            req.params.id
        );  

        if (!police) {
            return res.status(404).json({ success: false, message: "Police record not found" });
        }

        return res.status(200).json({ success: true, message: "Police record deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting police record", error: error.message });
    }
};
