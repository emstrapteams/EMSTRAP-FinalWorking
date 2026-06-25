import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import Hospital from "../models/hospital.model.js";
import Police from "../models/police.model.js";
import Ambulance from "../models/ambulance.model.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDriverModel } from "../models/bookingDriver.model.js";

const findAccountByResetToken = async (hashedToken) => {
  const query = {
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  };

  const collections = [
    User,
    Admin,
    Hospital,
    Police,
    Ambulance,
  ];

  for (const Model of collections) {
    const account = await Model.findOne(query);
    if (account) {
      return { account, Model };
    }
  }

  const bookingConnection = getBookingConnection();
  const BookingDriver = getBookingDriverModel(bookingConnection);
  const driver = await BookingDriver.findOne(query);
  if (driver) {
    return { account: driver, Model: BookingDriver };
  }

  return null;
};

export default findAccountByResetToken;
