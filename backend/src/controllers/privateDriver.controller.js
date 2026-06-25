import bcrypt from "bcryptjs";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDriverModel } from "../models/bookingDriver.model.js";
import Ambulance from "../models/ambulance.model.js";
export const createPrivateDriver = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            mobile,
            address,
            city,
            vehicleNumber,
        } = req.body;

        const bookingConnection = getBookingConnection();

        const Driver =
            getBookingDriverModel(bookingConnection);

        const existingDriver =
            await Driver.findOne({ email });

        if (existingDriver) {
            return res.status(400).json({
                success: false,
                message: "Driver already exists",
            });
        }

        const role = req.body.role || "private_driver";

        const hashedPassword =
            await bcrypt.hash(password, 10);

        if (role === "ambulance_driver") {

            const existingAmbulance =
                await Ambulance.findOne({ email });

            if (existingAmbulance) {
                return res.status(400).json({
                    success: false,
                    message: "Driver already exists",
                });
            }

            const driver = await Ambulance.create({
                name,
                email,
                password: hashedPassword,
                mobile,
                address,
                city,
                vehicleNumber,
                role: "ambulance_driver",
                isEmailVerified: true,
            });

            return res.status(201).json({
                success: true,
                driver,
            });
        }

        const driver = await Driver.create({
            name,
            email,
            password: hashedPassword,
            mobile,
            address,
            city,
            vehicleNumber,
            role: "private_driver",
            isEmailVerified: true,
        });

        return res.status(201).json({
            success: true,
            driver,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
export const getPrivateDrivers = async (req, res) => {
    try {
        const bookingConnection =
            getBookingConnection();

        const Driver =
            getBookingDriverModel(bookingConnection);

        const drivers =
            await Driver.find().select("-password");

        res.status(200).json({
            success: true,
            drivers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
export const updatePrivateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const allowedFields = ["name", "email", "mobile", "address", "city", "vehicleNumber", "driverStatus", "isEmailVerified"];
        const updatePayload = {};

        for (const field of allowedFields) {
            if (typeof req.body[field] !== "undefined") {
                updatePayload[field] = req.body[field];
            }
        }

        if (typeof req.body.password === "string" && req.body.password.trim()) {
            updatePayload.password = await bcrypt.hash(req.body.password, 10);
        }

        const bookingConnection = getBookingConnection();
        const Driver = getBookingDriverModel(bookingConnection);

        const driver = await Driver.findByIdAndUpdate(id, updatePayload, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found",
            });
        }

        res.status(200).json({
            success: true,
            driver,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
export const deletePrivateDriver = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const bookingConnection =
            getBookingConnection();

        const Driver =
            getBookingDriverModel(bookingConnection);

        const driver =
            await Driver.findByIdAndDelete(id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found",
            });
        }

        res.status(200).json({
            success: true,
            message:
                "Driver deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};