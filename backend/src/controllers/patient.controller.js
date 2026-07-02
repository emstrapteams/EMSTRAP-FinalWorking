import EmergencyRequest from "../models/emergencyRequest.model.js";

export const getPatients = async (req, res) => {
    try {

        const records = await EmergencyRequest
            .find({
                hospital: { $ne: null }
            })
            .populate("user", "name mobile")
            .sort({ createdAt: -1 });

        const patients = records.map((record) => ({
            _id: record._id,

            name: record.user?.name || "Anonymous Patient",

            age: record.age || "-",

            gender: record.gender || "-",

            accidentType:
                record.accidentType ||
                record.requestType ||
                "Emergency",

            doctorName:
                record.doctorName ||
                "Not Assigned",

            ward:
                record.ward ||
                "Emergency Ward",

            status:
                record.status === "COMPLETED"
                    ? "Completed"
                    : record.status === "ARRIVED_AT_LOCATION"
                        ? "Active"
                        : "Pending",

            admissionDate: record.createdAt,

            createdAt: record.createdAt,

            // ===== NEW =====
            imageUrl: record.imageUrl || "",

            evidence: record.evidence || [],

            aiAnalysis: record.aiAnalysis,

            ambulance: record.ambulance,

            hospital: record.hospital,
        }));

        res.status(200).json({
            success: true,
            patients,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};