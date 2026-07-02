import emergencyRequestSchema from "../models/emergencyrequest.model.js";
import Ambulance from "../models/ambulance.model.js";
import { getIO } from "../sockets/socket.js";
import cloudinary from "../config/cloudinary.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDbBookingModel } from "../models/bookingDbBooking.model.js";
import {
  generateEmbedding,
  compareEmbeddings,
} from "../services/duplicateDetection.service.js";

import {
  classifyImage,
} from "../services/AI/imageClassifier.service.js";
import Hospital from "../models/hospital.model.js";
import { calculateDistanceMeters } from "../utils/distance.js";
import { analyzeEmergencyImage } from "../services/AI/emergencyAI.service.js";
import { calculatePriority } from "../services/AI/priority.service.js";
const getBookingModel = () => {
  const bookingConnection = getBookingConnection();
  return getBookingDbBookingModel(bookingConnection);
};

export const assignHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { hospitalId } = req.body;

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "hospitalId is required" });
    }

    const hospital = await Hospital.findById(hospitalId);
    
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found" });
    }
    // Check emergency bed availability
    if (hospital.emergencyBeds <= 0) {
      return res.status(400).json({
        success: false,
        message: "Selected hospital has no emergency beds available."
      });
    }
    const existing = await emergencyRequestSchema.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Emergency request not found" });
    }
    if (existing.ambulance?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the assigned driver can select a hospital" });
    }

    if (existing.requestType !== "EMERGENCY") {
      return res.status(400).json({
        success: false,
        message: "Hospital assignment is only allowed for emergency requests"
      });
    }
    
    if (
      existing.status !== "ARRIVED_AT_LOCATION" &&
      existing.status !== "EN_ROUTE_TO_HOSPITAL"
    ) {
      return res.status(400).json({
        success: false,
        message: "Hospital can only be assigned after arriving at patient location"
      });
    }

    const updated = await emergencyRequestSchema.findByIdAndUpdate(
      id,
      { hospital: hospitalId, status: "EN_ROUTE_TO_HOSPITAL" },
      { new: true }
    )
      .populate("user", "name mobile email address city")
      .populate("ambulance", "name email mobile vehicleNumber")
      .populate("hospital", "name address city mobile email");
    hospital.emergencyBeds -= 1;
    await hospital.save();
    const io = getIO();

    // Notify ONLY the specific hospital with FULL details
    io.to(`hospital_${hospitalId}`).emit("hospital_alert", { request: updated, hospitalSelected: true });
    
    // Still notify all hospitals that this request is handled by a specific hospital (lite version)
    io.to("hospital").emit("hospital_alert", { 
      request: { 
        _id: updated._id, 
        status: updated.status, 
        hospital: { _id: updated.hospital._id, name: updated.hospital.name } 
      }, 
      isLite: true 
    });

    io.to("police").emit("police_new_case", { request: updated, hospitalSelected: true });
    io.to("police").emit("police_alert", { request: updated });

    // Also update the user tracking the request
    io.to(`request_${id}`).emit("ambulance_assigned", {
      driverName: req.user.name || "Driver",
      driverMobile: req.user.mobile || "",
      vehicleNumber: req.user.vehicleNumber || "",
      hospitalName: updated.hospital?.name || "Assigning...",
      hospitalLocation: updated.hospital ? `${updated.hospital.address}, ${updated.hospital.city}` : "N/A",
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markArrived = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await emergencyRequestSchema.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Emergency request not found" });
    }

    if (request.ambulance?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned driver can mark arrival"
      });
    }

    // NEW VALIDATION
    if (request.status !== "AMBULANCE_ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Arrival can only be marked after accepting the emergency"
      });
    }

    request.status = "ARRIVED_AT_LOCATION";
    await request.save();

    const populated = await emergencyRequestSchema.findById(id)
      .populate("user", "name mobile email address city")
      .populate("ambulance", "name email mobile vehicleNumber");

    const io = getIO();
    // Notify user and police
    io.to(`request_${id}`).emit("driver_arrived", { requestId: id });
    io.to("police").emit("police_alert", { request: populated, status: "ARRIVED" });

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmergencyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await emergencyRequestSchema.findById(id)
      .populate("user", "name mobile email address city")
      .populate("ambulance", "name email mobile vehicleNumber currentLocation")
      .populate("hospital", "name address city mobile email");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const isOwner = request.user?.toString() === req.user._id.toString();
    const isAssignedDriver = request.ambulance?.toString() === req.user._id.toString();
    const isPrivileged = ["admin", "police", "police_hq", "hospital", "hospital_admin"].includes(req.user.role);

    if (!isOwner && !isAssignedDriver && !isPrivileged) {
      return res.status(403).json({ success: false, message: "Not authorized to view this emergency" });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEmergencyRequest = async (req, res) => {
  try {
    const { latitude, longitude, imageUrl } = req.body;
    console.log("Creating emergency request. imageUrl present:", !!imageUrl);

    let secureImageUrl = "";

    if (imageUrl) {

      // Image already uploaded during precheck
      if (
        imageUrl.startsWith("https://res.cloudinary.com")
      ) {

        secureImageUrl = imageUrl;

        console.log(
          "Using existing Cloudinary image:",
          secureImageUrl
        );

      } else {

        // First-time upload (fallback for older clients)
        try {

          const uploadResponse =
            await cloudinary.uploader.upload(imageUrl, {
              folder: "emergencies",
            });

          secureImageUrl =
            uploadResponse.secure_url;

          console.log(
            "Cloudinary upload successful:",
            secureImageUrl
          );

        } catch (uploadError) {

          console.error(
            "Cloudinary upload failed:",
            uploadError
          );

        }

      }

    }

    let aiResult = {
      embedding: [],
      duplicateDetected: false,
      duplicateOf: null,
      similarityScore: 0,
      aiAnalysis: null,
      priority: 0,
      warningRequired: false,
    };
    if (secureImageUrl) {
      try {

        aiResult = await analyzeEmergencyImage(
          secureImageUrl,
          latitude,
          longitude
        );

        console.log("AI Result:", aiResult);

      } catch (error) {

        console.error(
          "AI Service Error:",
          error.message
        );

      }
    }
    // Create request
    const request = await emergencyRequestSchema.create({
      user: req.user?._id || undefined,
      imageUrl: secureImageUrl || "",
      location: { latitude, longitude },
      requestType: "EMERGENCY",

      embedding: aiResult.embedding,

      duplicateDetected: aiResult.duplicateDetected,

      duplicateOf: aiResult.duplicateOf,

      similarityScore: aiResult.similarityScore,
      aiAnalysis: aiResult.aiAnalysis
        ? {
          predictedClass:
            aiResult.aiAnalysis.predicted_class,

          confidence:
            aiResult.aiAnalysis.confidence,

          severity:
            aiResult.aiAnalysis.severity,

          recommendedAmbulance:
            aiResult.aiAnalysis.recommended_ambulance,

          allProbabilities:
            aiResult.aiAnalysis.all_probabilities,
        }
        : undefined,
    });

    // 2️⃣ Populate user details for downstream consumers (hospital, police)
    const populatedRequest = await emergencyRequestSchema
      .findById(request._id)
      .populate("user", "name mobile email address city");

    // 3️⃣ Emit to all ambulances, hospitals, and police
    const io = getIO();

    if (!aiResult.duplicateDetected) {
      console.log(
        "EMITTING NEW EMERGENCY TO AMBULANCE ROOM:",
        populatedRequest._id
      );
      io.to("ambulance").emit(
        "new_emergency_request",
        populatedRequest
      );
    } else {
      console.log(
        `Duplicate emergency blocked. Original request: ${aiResult.duplicateOf}`
      );
    }
    
    // For hospitals, send a "lite" version without user details or exact location if not assigned
    const liteRequest = {
      _id: populatedRequest._id,
      requestType: populatedRequest.requestType,
      status: populatedRequest.status,
      createdAt: populatedRequest.createdAt,
      // No user details, no exact location
    };
    io.to("hospital").emit("hospital_alert", { request: liteRequest, isLite: true });
    
    io.to("police").emit("police_new_case", { request: populatedRequest });

    res.status(201).json({
      success: true,
      data: request,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const precheckEmergency = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    let secureImageUrl = "";

    try {
      const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
        folder: "emergencies/precheck",
      });

      secureImageUrl = uploadResponse.secure_url;
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Image upload failed",
      });
    }

    const aiAnalysis = await classifyImage(secureImageUrl);

    const { priority, warningRequired } =
      calculatePriority(aiAnalysis);

    return res.status(200).json({
      success: true,

      secureImageUrl,      // <-- ADD THIS

      warningRequired,

      priority,

      aiAnalysis: {
        predictedClass: aiAnalysis.predicted_class,
        confidence: aiAnalysis.confidence,
        severity: aiAnalysis.severity,
        recommendedAmbulance: aiAnalysis.recommended_ambulance,
        allProbabilities: aiAnalysis.all_probabilities,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    console.log("========== UPLOAD EVIDENCE API ==========");
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const emergency = await emergencyRequestSchema.findById(id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    let secureImageUrl = "";

    // Reuse existing Cloudinary URL if already uploaded
    if (imageUrl.startsWith("https://res.cloudinary.com")) {
      secureImageUrl = imageUrl;
    } else {
      const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
        folder: "emergencies/evidence",
      });

      secureImageUrl = uploadResponse.secure_url;
    }

    // Classification ONLY
    const aiAnalysis = await classifyImage(secureImageUrl);

    emergency.evidence.push({
      imageUrl: secureImageUrl,

      aiAnalysis: {
        predictedClass: aiAnalysis.predicted_class,
        confidence: aiAnalysis.confidence,
        severity: aiAnalysis.severity,
        recommendedAmbulance: aiAnalysis.recommended_ambulance,
        allProbabilities: aiAnalysis.all_probabilities,
      },
    });

    await emergency.save();

    return res.status(200).json({
      success: true,
      message: "Evidence uploaded successfully.",
      evidence: emergency.evidence,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const acceptEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's already accepted to prevent race conditions
    const existingRequest = await emergencyRequestSchema.findById(id);
    if (!existingRequest) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (existingRequest.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Emergency is already handled by another driver" });
    }

    // Security layer: Check if driver already has an active assigned emergency
    const activeDriverEmergency = await emergencyRequestSchema.findOne({
      ambulance: req.user._id,
      status: "AMBULANCE_ACCEPTED"
    });
    
    if (activeDriverEmergency) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already handling an active emergency. Please complete or cancel it before accepting a new one." 
      });
    }

    // Find nearest hospital only for EMERGENCY type
    let hospitalId = null;
    if (existingRequest.requestType === "EMERGENCY") {
      const nearestHospital = await Hospital.findOne();
      hospitalId = nearestHospital ? nearestHospital._id : null;
    }

    const request = await emergencyRequestSchema.findByIdAndUpdate(
      id,
      { 
        status: "AMBULANCE_ACCEPTED", 
        ambulance: req.user._id,
        // hospital: hospitalId // REMOVED: Hospital will be assigned after arrival
      },
      { new: true }
    ).populate("user", "name mobile email address city")
     .populate("ambulance", "name email mobile vehicleNumber")
     .populate("hospital", "name address city mobile email");

    // Update related booking if it's a regular booking request
    if (request.requestType === "BOOKING") {
      await getBookingModel().findOneAndUpdate(
        { requestId: id },
        { status: "ACCEPTED", ambulance: req.user._id }
      );
    }

    const io = getIO();
    // Notify the user tracking the request
    io.to(`request_${id}`).emit("ambulance_assigned", {
      eta: "Calculating...", // or some other more dynamic placeholder if you don't have real ETA
      driverName: req.user.name || "Driver",
      driverMobile: req.user.mobile || "",
      vehicleNumber: req.user.vehicleNumber || "",
      hospitalName: request.hospital?.name || "Assigning...",
      hospitalLocation: request.hospital ? `${request.hospital.address}, ${request.hospital.city}` : "N/A",
    });

    // Notify user's personal room for dashboard refresh
    if (request.user) {
      const userIdStr = request.user._id ? request.user._id.toString() : request.user.toString();
      io.to(`user_${userIdStr}`).emit("ambulance_assigned", { requestId: id, status: "ACCEPTED" });
    }

    // Notify Hospitals & Police only for EMERGENCY type
    if (request.requestType === "EMERGENCY") {
      // Send lite alert to all hospitals that an ambulance is assigned
      io.to("hospital").emit("hospital_alert", { 
        request: { 
          _id: request._id, 
          status: request.status, 
          ambulance: request.ambulance 
        }, 
        isLite: true 
      });
      io.to("police").emit("police_new_case", { request });
      io.to("police").emit("police_alert", { request });
    }

    // Broadcast that this emergency has been accepted so other drivers' dashboards drop it
    io.to("ambulance").emit("emergency_accepted", { requestId: id });

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const declineEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await emergencyRequestSchema.findByIdAndUpdate(
      id,
      { $addToSet: { declinedBy: req.user._id } },
      { new: true }
    );

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await emergencyRequestSchema.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    // Ownership check
    if (!request.ambulance) {
      return res.status(400).json({
        success: false,
        message: "Request has not been assigned to a driver"
      });
    }

    if (request.ambulance.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only assigned driver can cancel this request"
      });
    }

    request.status = "CANCELLED";
    await request.save();

    const io = getIO();

    io.to(`request_${id}`).emit("emergency_cancelled", {
      requestId: id
    });

    if (request.user) {
      const userIdStr = request.user._id
        ? request.user._id.toString()
        : request.user.toString();

      io.to(`user_${userIdStr}`).emit(
        "emergency_cancelled",
        {
          requestId: id,
          status: "CANCELLED"
        }
      );
    }

    res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const completeRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await emergencyRequestSchema.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.ambulance?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the assigned driver can complete this request" });
    }
    if (request.status !== "EN_ROUTE_TO_HOSPITAL") {
      return res.status(400).json({
        success: false,
        message:
          "Patient must be transported to a hospital before completing the trip"
      });
    }
    request.status = "COMPLETED";
    await request.save();

    // Clear activeRequest from the driver
    await Ambulance.findByIdAndUpdate(req.user._id, { 
      activeRequest: null,
      isOnTrip: false 
    });

    if (request.requestType === "BOOKING") {
      await getBookingModel().findOneAndUpdate(
        { requestId: id },
        { status: "COMPLETED" }
      );
    }

    const io = getIO();
    // Notify the user tracking the request
    io.to(`request_${id}`).emit("trip_completed", { requestId: id });

    // Notify user's personal room for dashboard refresh
    if (request.user) {
      const userIdStr = request.user._id ? request.user._id.toString() : request.user.toString();
      io.to(`user_${userIdStr}`).emit("trip_completed", { requestId: id, status: "COMPLETED" });
    }

    res.status(200).json({ success: true, message: "Trip completed successfully", data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDriverHistory = async (req, res) => {
  try {
    const driverId = req.user._id;

    const filter = req.query.filter || "24h";

    // Time 30 minutes ago for ongoing (increased from 1 min to allow seeing bookings)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 1. New/Ongoing Requests within 1 minute that this driver hasn't declined
    // Only fetch if driver is LIVE
    let ongoing = [];
    if (req.user.driverStatus === "LIVE") {
      ongoing = await emergencyRequestSchema
        .find({
          status: "PENDING",
          createdAt: { $gte: thirtyMinutesAgo },
          declinedBy: { $ne: driverId },
          duplicateDetected: { $ne: true }
        })
        .populate("hospital", "name address city mobile email")
        .populate("user", "name mobile")
        .sort({ createdAt: -1 });
    }

    let acceptedQuery = {
      ambulance: driverId,
      status: { $in: ["AMBULANCE_ACCEPTED", "ARRIVED_AT_LOCATION", "EN_ROUTE_TO_HOSPITAL", "COMPLETED"] }
    };

    let rejectedQuery = {
      declinedBy: driverId
    };

    let cancelledQuery = {
      ambulance: driverId,
      status: "CANCELLED"
    };

    if (filter === "24h") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      acceptedQuery.updatedAt = { $gte: oneDayAgo };
      rejectedQuery.updatedAt = { $gte: oneDayAgo };
      cancelledQuery.updatedAt = { $gte: oneDayAgo };
    }

    // 2. Accepted Requests by this driver
    const accepted = await emergencyRequestSchema
      .find(acceptedQuery)
      .populate("hospital", "name address city mobile email")
      .populate("user", "name mobile")
      .sort({ updatedAt: -1 });

    // 3. Rejected Requests by this driver
    const rejected = await emergencyRequestSchema
      .find(rejectedQuery)
      .populate("hospital", "name address city mobile email")
      .populate("user", "name mobile")
      .sort({ updatedAt: -1 });

    // 4. Cancelled Requests by user
    const cancelled = await emergencyRequestSchema
      .find(cancelledQuery)
      .populate("hospital", "name address city mobile email")
      .populate("user", "name mobile")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ongoing,
        accepted,
        rejected,
        cancelled
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
