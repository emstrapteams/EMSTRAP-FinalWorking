import { Schema, model } from 'mongoose';

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: String,
        required: true,
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number']
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationTokenExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    password: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'ambulance', 'ambulance_driver', 'hospital', 'hospital_admin', 'police', 'police_hq', 'admin'],
        default: 'user'
    },
    vehicleNumber: {
        type: String,
        required: false
    },
    driverStatus: {
        type: String,
        enum: ['LIVE', 'OFFLINE'],
        default: 'OFFLINE'
    },
    currentLocation: {
        latitude: Number,
        longitude: Number
    },
    isOnTrip: {
        type: Boolean,
        default: false
    },
    activeRequest: {
        type: Schema.Types.ObjectId,
        ref: "EmergencyRequest",
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const User = model('User', userSchema);
userSchema.pre("save", function (next) {
    console.log("SAVING USER ROLE:", this.role);
    next();
});
export default User;