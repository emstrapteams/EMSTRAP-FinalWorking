import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import Hospital from "../models/hospital.model.js";
import Police from "../models/police.model.js";
import Ambulance from "../models/ambulance.model.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDriverModel } from "../models/bookingDriver.model.js";
const authMiddleware = async (req, res, next) => {
  
  try {
    let token = req.cookies.token;

    // Fallback if needed for Postman testing
    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
  
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ⚠️ Make sure this matches how you created token
    // If you used: jwt.sign({ id: user._id })
    // then use decoded.id
    let user = null;

    switch (decoded.role) {

      case "admin":
        user = await Admin.findById(decoded.id).select("-password");
        break;

      case "hospital":
      case "hospital_admin":
        user = await Hospital.findById(decoded.id).select("-password");
        break;

      case "police":
      case "police_hq":
        user = await Police.findById(decoded.id).select("-password");
        break;

      case "ambulance_driver":
        user = await Ambulance.findById(decoded.id).select("-password");
        break;
      case "private_driver":

        const bookingConnection =
          getBookingConnection();

        const BookingDriver =
          getBookingDriverModel(
            bookingConnection
          );

        user = await BookingDriver
          .findById(decoded.id)
          .select("-password");

        break;
      default:
        user = await User.findById(decoded.id).select("-password");
    }
    if (!user) {
      user = await User.findById(decoded.id).select("-password");
    }
   
    req.user = user;
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
