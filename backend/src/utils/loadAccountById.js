import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import Hospital from "../models/hospital.model.js";
import Police from "../models/police.model.js";
import Ambulance from "../models/ambulance.model.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDriverModel } from "../models/bookingDriver.model.js";

export const loadAccountById = async (id, role) => {
  switch (role) {
    case "admin": {
      const admin = await Admin.findById(id);
      return admin || User.findById(id);
    }
    case "hospital":
    case "hospital_admin":
      return Hospital.findById(id);
    case "police":
    case "police_hq":
      return Police.findById(id);
    case "ambulance_driver":
    case "ambulance":
      return Ambulance.findById(id);
    case "private_driver":
      return getBookingDriverModel(getBookingConnection()).findById(id);
    default:
      return User.findById(id);
  }
};

export const loadAccountByIdForPassword = async (user) => {
  const id = user._id;
  const role = user.role;

  if (role === "ambulance_driver" || role === "ambulance") {
    return Ambulance.findById(id);
  }
  if (role === "private_driver") {
    return getBookingDriverModel(getBookingConnection()).findById(id);
  }
  if (role === "hospital" || role === "hospital_admin") {
    return Hospital.findById(id);
  }
  if (role === "police" || role === "police_hq") {
    return Police.findById(id);
  }
  if (role === "admin") {
    return (await Admin.findById(id)) || User.findById(id);
  }
  return User.findById(id);
};

export default loadAccountById;
