import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import Hospital from "../models/hospital.model.js";
import Police from "../models/police.model.js";
import Ambulance from "../models/ambulance.model.js";
import { getBookingConnection } from "../config/bookingDb.js";
import { getBookingDriverModel } from "../models/bookingDriver.model.js";
const findAccountByEmail = async (email) => {
    let account = await User.findOne({ email });
    if (account) return account;

    account = await Admin.findOne({ email });
    if (account) return account;

    account = await Hospital.findOne({ email });
    if (account) return account;

    account = await Police.findOne({ email });
    if (account) return account;

    account = await Ambulance.findOne({ email });
    if (account) return account;

    const bookingConnection = getBookingConnection();
    const BookingDriver = getBookingDriverModel(bookingConnection);

    account = await BookingDriver.findOne({ email });
    if (account) return account;

    return null;
};

export default findAccountByEmail;