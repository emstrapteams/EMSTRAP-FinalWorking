import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.{53}$/;

export const DEFAULT_ADMIN = {
  name: process.env.DEFAULT_ADMIN_NAME || "System Administrator",
  email: process.env.DEFAULT_ADMIN_EMAIL || "admin@gmail.com",
  password: process.env.DEFAULT_ADMIN_PASSWORD || "312",
  mobile: process.env.DEFAULT_ADMIN_MOBILE || "9876543210",
  address: process.env.DEFAULT_ADMIN_ADDRESS || "Admin HQ",
  city: process.env.DEFAULT_ADMIN_CITY || "System",
};

export const isBcryptHash = (value = "") => BCRYPT_HASH_REGEX.test(value);

export const ensureDefaultAdminUser = async () => {
  const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN.email });

  if (existingAdmin) {
    let changed = false;
    const repairedFields = [];

    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      changed = true;
      repairedFields.push("role");
    }

    if (!existingAdmin.isEmailVerified) {
      existingAdmin.isEmailVerified = true;
      changed = true;
      repairedFields.push("isEmailVerified");
    }

    const passwordMatchesDefault = isBcryptHash(existingAdmin.password)
      ? await bcrypt.compare(DEFAULT_ADMIN.password, existingAdmin.password)
      : existingAdmin.password === DEFAULT_ADMIN.password;

    if (!passwordMatchesDefault || !isBcryptHash(existingAdmin.password)) {
      existingAdmin.password = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      changed = true;
      repairedFields.push("password");
    }

    if (changed) {
      await existingAdmin.save();
      console.log("[auth] default admin user repaired", {
        email: existingAdmin.email,
        role: existingAdmin.role,
        repairedFields,
      });
    }

    return existingAdmin;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const adminUser = await User.create({
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email,
    password: hashedPassword,
    mobile: DEFAULT_ADMIN.mobile,
    address: DEFAULT_ADMIN.address,
    city: DEFAULT_ADMIN.city,
    role: "admin",
    isEmailVerified: true,
  });

  console.log("[auth] default admin user created", { email: adminUser.email });
  return adminUser;
};

export const verifyPasswordAndUpgradeIfNeeded = async (user, candidatePassword) => {
  if (!user?.password) return false;

  if (isBcryptHash(user.password)) {
    return bcrypt.compare(candidatePassword, user.password);
  }

  const plainTextMatch = user.password === candidatePassword;
  console.log({
    storedPassword: user.password,
    enteredPassword: candidatePassword,
    plainTextMatch
  });
  if (!plainTextMatch) return false;

  user.password = await bcrypt.hash(candidatePassword, 10);
  await user.save();
  console.log("[auth] migrated plain text password to bcrypt", {
    email: user.email,
  });
  return true;
};
