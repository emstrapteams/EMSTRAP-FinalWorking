import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import {
  DEFAULT_ADMIN,
  ensureDefaultAdminUser,
  verifyPasswordAndUpgradeIfNeeded,
} from "../utils/adminAuth.js";
import findAccountByEmail from "../utils/findAccountByEmail.js";
import findAccountByResetToken from "../utils/findAccountByResetToken.js";
import { loadAccountByIdForPassword } from "../utils/loadAccountById.js";
import Ambulance from "../models/ambulance.model.js";
import Hospital from "../models/hospital.model.js";
import Police from "../models/police.model.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingUserModel } from "../models/bookingUser.model.js";
import { getBookingDriverModel } from "../models/bookingDriver.model.js";

// Helper function to set JWT in an HttpOnly cookie
const generateTokenAndSetCookie = (user, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // True in production (HTTPS)
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict", // "None" allows cross-origin on Netlify
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  return token;
};

const buildAuthResponse = (user, token, message) => ({
  success: true,
  message,
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,

    driverStatus: user.driverStatus,
    isOnTrip: user.isOnTrip,
    vehicleNumber: user.vehicleNumber,
  },

  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,

  driverStatus: user.driverStatus,
  isOnTrip: user.isOnTrip,
  vehicleNumber: user.vehicleNumber,
});
// REGISTER
export const registerUser = async (req, res) => {

  const { name, email, password, mobile, address, role, city, vehicleNumber } = req.body;

  try {
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit Indian mobile number." });
    }

    // Strong Password Validation (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long, including an uppercase letter, lowercase letter, number, and special character." });
    }

    const userExists = await findAccountByEmail(email);

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const userRole = role || "user";
    const allowedRegisterRoles = [
      "user",
      "ambulance_driver",
    ];

    if (!allowedRegisterRoles.includes(userRole)) {
      return res.status(400).json({
        message: "Invalid role for self-registration"
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verifyUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    const message = `Please confirm your email by visiting the following link: \n\n ${verifyUrl}`;
    {/* <h2 style="color: #333;">Verify your Emstrap account</h2> */ }
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <p style="color: #555; font-size: 16px;">Hello ${name},</p>
        <p style="color: #555; font-size: 16px;">Welcome to <strong>EMSTRAP PVT LTD</strong>! We’re excited to have you on board.</p>
        <p style="color: #555; font-size: 16px;">To get started and gain full access to your account, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #007BFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #555; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 14px; word-break: break-all;"><a href="${verifyUrl}" style="color: #007BFF;">${verifyUrl}</a></p>
        
        <h3 style="color: #333; margin-top: 30px;">Why verify?</h3>
        <ul style="color: #555; font-size: 14px; line-height: 1.6;">
          <li>Secure your account data.</li>
          <li>Receive important updates regarding your projects.</li>
          <li>Enable full platform features.</li>
        </ul>
        
        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
          This link will expire in 24 hours. If you did not create an account with Emstrap, please ignore this email.
        </p>
        <p style="color: #555; font-size: 14px; margin-top: 20px;">
          Cheers,<br>
          <strong>The Emstrap Team</strong>
        </p>
      </div>
    `;

    let user;

    if (userRole === "ambulance_driver") {

      user = new Ambulance({
        name,
        email,
        password: hashedPassword,
        mobile,
        address,
        city,
        vehicleNumber,

        role: "ambulance_driver",

        isEmailVerified: false,

        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry:
          Date.now() + 24 * 60 * 60 * 1000,
      });

    } else {

      user = new User({
        name,
        email,
        password: hashedPassword,
        mobile,
        address,
        city,

        role: "user",

        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry:
          Date.now() + 24 * 60 * 60 * 1000,
      });

    }

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify your Emstrap account",
        message,
        htmlMessage
      });

      await user.save();

      if (userRole === "user") {

        const bookingConnection =
          getBookingConnection();

        const BookingUser =
          getBookingUserModel(
            bookingConnection
          );

        const existingBookingUser =
          await BookingUser.findOne({
            email
          });

        if (!existingBookingUser) {

          await BookingUser.create({
            name,
            email,
            password: hashedPassword,
            mobile,
            address,
            city,

            role: "user",

            isEmailVerified: false,

            emailVerificationToken:
              hashedToken,

            emailVerificationTokenExpiry:
              Date.now() +
              24 * 60 * 60 * 1000,
          });

        }

      }
      res.status(201).json({
        message: "Registration successful. Please check your email to verify your account before logging in."
      });
    } catch (error) {
      console.error("Email error:", error);
      return res.status(500).json({ message: "There was an error sending the email. Please try again later." });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    let user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      user = await Ambulance.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          message: "Verification token is invalid or has expired."
        });
      }
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    if (user.role === "user") {
      const bookingConnection = getBookingConnection();
      const BookingUser = getBookingUserModel(bookingConnection);
      await BookingUser.findOneAndUpdate(
        { email: user.email },
        {
          isEmailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationTokenExpiry: undefined
        }
      );
    }

    res.status(200).json({ message: "Email successfully verified." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await findAccountByEmail(email);
    console.log("[auth] user lookup result", {
      email,
      found: Boolean(user),
      role: user?.role || null,
    });
    
    

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const passwordMatched =
      await verifyPasswordAndUpgradeIfNeeded(user, password);
    
    console.log("[auth] user password match result", { email, passwordMatched });

    if (user && passwordMatched) {

      // Bypass email verification for admin, hospital, police, government ambulance roles
      const bypassVerification = [
        "admin",
        "hospital",
        "hospital_admin",
        "police",
        "police_hq"
      ].includes(user.role);
      if (!user.isEmailVerified && !bypassVerification) {
        return res.status(401).json({ success: false, message: "Please verify your email to login" });
      }

      const token = generateTokenAndSetCookie(user, res);

      res.json(buildAuthResponse(user, token, "Login successful"));

    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginAdminUser = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    console.log("[auth] admin login request", { email, hasPassword: Boolean(password) });

    if (email === DEFAULT_ADMIN.email) {
      await ensureDefaultAdminUser();
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await Ambulance.findOne({ email });
    }
    console.log("[auth] admin lookup result", {
      email,
      found: Boolean(user),
      role: user?.role || null,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Admin user not found" });
    }

    const passwordMatched = await verifyPasswordAndUpgradeIfNeeded(user, password);
    console.log("[auth] admin password match result", { email, passwordMatched });

    if (!passwordMatched) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Administrative privileges required" });
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
      console.log("[auth] admin email verification restored", { email });
    }

    const token = generateTokenAndSetCookie(user, res);
    return res.status(200).json(buildAuthResponse(user, token, "Admin login successful"));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SETUP SINGLE ADMIN (One-time use)
export const setupAdminUser = async (req, res) => {
  const { name, email, password, mobile } = req.body;

  try {
    // 1. Check if ANY admin already exists in the entire database
    const adminExists = await User.countDocuments({ role: "admin" });
    if (adminExists > 0) {
      return res.status(403).json({ message: "An administrator account already exists. Setup is locked." });
    }

    // 2. Strong Password Validation
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ message: "Password must be at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the Admin User (Bypass email verification so they can immediately login)
    const adminUser = new User({
      name,
      email,
      password: hashedPassword,
      mobile: mobile || "0000000000",
      address: "Admin HQ",
      city: "System",
      role: "admin",
      isEmailVerified: true // Pre-verify the master admin
    });

    await adminUser.save();

    // 4. Issue token immediately
    const token = generateTokenAndSetCookie(adminUser, res);

    res.status(201).json(buildAuthResponse(adminUser, token, "Master Administrator account successfully initialized."));

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET CURRENT USER (For session restoration)
export const getMe = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// LOGOUT
export const logoutUser = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    path: "/",
    expires: new Date(0) // Expire immediately
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// UPDATE USER PROFILE
export const updateUser = async (req, res) => {
  const { name, email, mobile, city, address, driverStatus, vehicleNumber } = req.body;
  try {
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit Indian mobile number." });
    }

    const userId = req.user._id;
    const updateFields = { name, email, mobile, city, address, updatedAt: Date.now() };
    if (vehicleNumber !== undefined) {
      updateFields.vehicleNumber = vehicleNumber;
    }
    if (driverStatus) {
      updateFields.driverStatus = driverStatus;
    }

    let updatedUser;

    if (req.user.role === "ambulance_driver") {

      updatedUser = await Ambulance.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).select("-password");

    } else if (req.user.role === "private_driver") {

      const bookingConnection = getBookingConnection();
      const BookingDriver = getBookingDriverModel(bookingConnection);

      updatedUser = await BookingDriver.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).select("-password");

    } else if (
      req.user.role === "hospital" ||
      req.user.role === "hospital_admin"
    ) {

      updatedUser = await Hospital.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).select("-password");

    } else if (
      req.user.role === "police" ||
      req.user.role === "police_hq"
    ) {

      updatedUser = await Police.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).select("-password");

    } else {

      updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).select("-password");

    }

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role === "user") {
      const bookingConnection = getBookingConnection();
      const BookingUser = getBookingUserModel(bookingConnection);
      await BookingUser.findOneAndUpdate(
        { email: req.user.email },
        {
          name: updatedUser.name,
          email: updatedUser.email,
          mobile: updatedUser.mobile,
          city: updatedUser.city,
          address: updatedUser.address,
        }
      );
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CHANGE PASSWORD (Logged in user)
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await loadAccountByIdForPassword(req.user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Verify current password using the utility that handles legacy hashing
    const isMatch = await verifyPasswordAndUpgradeIfNeeded(user, currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }
    
    // Validate new password
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long, including an uppercase letter, lowercase letter, number, and special character." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  try {
    const user = await findAccountByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "There is no user with that email address." });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #555; font-size: 16px;">Hello ${user.name},</p>
        <p style="color: #555; font-size: 16px;">We received a request to reset your password. You can reset it by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #E53E3E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #777; font-size: 14px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
          This link will expire in 10 minutes.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
        htmlMessage
      });
      res.status(200).json({ message: "Email sent" });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const result = await findAccountByResetToken(resetPasswordToken);

    if (!result) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const { account: user } = result;

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(req.body.password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long, including an uppercase letter, lowercase letter, number, and special character." });
    }

    // Set new password
    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
