# 🚑 EmSTraP - Emergency Medical Services & Ambulance Booking Platform

> A full-stack emergency response and ambulance booking platform that enables real-time emergency reporting, ambulance dispatch, hospital coordination, police assistance, and scheduled ambulance bookings.

---

# 📌 Project Overview

EmSTraP is designed to bridge the gap between emergency victims and emergency response services by providing:

- Instant Emergency Request System
- Scheduled Ambulance Booking
- Real-time Ambulance Tracking
- Hospital Management Dashboard
- Police Dashboard
- Admin Dashboard
- Government & Private Ambulance Management
- AI-ready Emergency Image Processing
- Multi-Database Architecture

The application supports multiple user roles with dedicated dashboards and workflows.

---

# 🛠 Tech Stack

## Frontend

- React.js (Vite)
- Tailwind CSS
- Axios
- React Router
- Socket.IO Client
- React Hot Toast

## Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Socket.IO
- JWT Authentication
- Cloudinary
- bcrypt

---

# 🗄 Database Architecture

The application uses **two independent MongoDB databases**.

## EMSTRAP-Emergency

Stores:

- Users
- Admins
- Hospitals
- Police
- Government Ambulances
- Emergency Requests
- Emergency Alerts

---

## EMSTRAP-Booking

Stores:

- Booking Users
- Private Drivers
- Ambulance Bookings

This separation ensures emergency operations remain independent from scheduled bookings.

---

# 👥 User Roles

The system currently supports:

- User
- Anonymous User
- Admin
- Hospital
- Police
- Government Ambulance Driver
- Private Ambulance Driver

Each role has its own protected dashboard.

---

# 🔐 Authentication

Implemented using

- JWT
- HttpOnly Cookies
- Authorization Headers

Features

- Register
- Login
- Logout
- Session Persistence
- Role-based Authorization
- Protected Routes

---

# 🚨 Emergency Workflow

## Logged-in User

✔ Login

↓

✔ Create Emergency Request

↓

✔ Image Upload (Cloudinary)

↓

✔ Location Capture

↓

✔ Emergency Stored in Database

↓

✔ Government Ambulance Receives Request

↓

✔ Driver Accepts Request

↓

✔ Driver Marks Arrived

↓

✔ Hospital Selection

↓

✔ Request Completion

---

## Anonymous User

Anonymous users can also

- Create Emergency Requests
- Upload Accident Image
- Share Live Location

No login is required.

Anonymous requests are handled exactly like registered users.

---

# 🚑 Government Ambulance Workflow

Implemented and Tested

- Receive live emergency requests
- Accept emergency
- Decline emergency
- Mark Arrived
- Assign Hospital
- Complete Emergency
- Trip history
- Online / Offline status

---

# 🚗 Private Ambulance Booking Workflow

Implemented and Tested

User

↓

Book Ambulance

↓

Booking stored in Booking Database

↓

Private Driver receives booking

↓

Accept Booking

↓

Start Trip

↓

Complete Trip

---

# 🏥 Hospital Dashboard

Implemented

- Dashboard
- Emergency Alerts
- Patient Records
- Hospital Profile
- Statistics
- Emergency Status Updates

Hospital assignment from ambulance workflow is fully functional.

---

# 👮 Police Dashboard

Implemented

- Emergency Notifications
- Dashboard
- Live Alerts
- Emergency Status

---

# 👨‍💼 Admin Dashboard

Implemented

## User Management

- View Users
- Delete Users

---

## Hospital Management

- Add Hospital
- Edit Hospital
- Delete Hospital
- View Hospitals

---

## Police Management

- Add Police
- Edit Police
- Delete Police

---

## Government Ambulance Management

- Add Driver
- Edit Driver
- Delete Driver

---

## Private Driver Management

- Add Driver
- Edit Driver
- Delete Driver

Stored inside Booking Database.

---

## Booking Management

Admin can

- View all bookings
- Track booking status
- Manage booking information

---

## Emergency Management

Admin can

- View emergencies
- Monitor requests
- Dashboard statistics

---

# 🌍 Live Location

Implemented

- User Location
- Driver Location
- Hospital Assignment
- Google Maps integration

---

# ☁ Cloudinary

Implemented

- Emergency Image Upload
- Secure Cloud Storage
- Image URL Storage

---

# 🔔 Real-time Communication

Implemented using Socket.IO

- Live Emergency Requests
- Driver Notifications
- Booking Notifications
- Status Updates

---

# 📊 Dashboards

Completed

✔ User Dashboard

✔ Admin Dashboard

✔ Hospital Dashboard

✔ Police Dashboard

✔ Government Ambulance Dashboard

✔ Private Driver Dashboard

---

# 🧠 AI Module (Current Status)

Backend supports

- Emergency Image Upload
- Image Embedding Storage
- Duplicate Detection Infrastructure

Future Enhancements

- Accident Severity Detection
- Vehicle Detection
- Pedestrian Detection
- Automatic Duplicate Alert Prevention

---

# 🔄 Current Database Flow

## Emergency

User

↓

Emergency Database

↓

Government Ambulance

↓

Hospital

↓

Complete

---

## Booking

User

↓

Booking Database

↓

Private Driver

↓

Complete

---

# 🔒 Security

- JWT Authentication
- Password Hashing (bcrypt)
- Role-based Authorization
- Protected APIs
- Cookie Authentication
- Authorization Headers

---

# 📂 Project Structure

```
Frontend
│
├── React
├── Components
├── Pages
├── Context
├── Services
└── Tailwind

Backend
│
├── Controllers
├── Routes
├── Models
├── Middlewares
├── Services
├── Config
└── Socket
```

---

# ✅ Manual Testing Completed

The following workflows have been manually tested and verified:

## Authentication

- User Registration
- User Login
- Logout
- Session Restore
- Role-based Dashboard Routing

---

## Emergency Module

- Logged-in Emergency
- Anonymous Emergency
- Image Upload
- Live Emergency Creation
- Government Driver Notification
- Driver Acceptance
- Mark Arrived
- Hospital Assignment
- Trip Completion

---

## Booking Module

- Ambulance Booking
- Booking Storage
- Private Driver Notification
- Accept Booking
- Start Trip
- Complete Trip

---

## Admin Module

- User CRUD
- Hospital CRUD
- Police CRUD
- Government Driver CRUD
- Private Driver CRUD
- Dashboard Statistics
- Emergency Management
- Booking Management

---

## Hospital Module

- Dashboard
- Patient Records
- Emergency Alerts
- Hospital Assignment
- Statistics

---

## Police Module

- Dashboard
- Live Emergency Alerts

---

## Database

Verified

✔ EMSTRAP-Emergency

✔ EMSTRAP-Booking

Proper separation implemented.

---

# 🚀 Current Project Status

## Fully Working

- Authentication
- Emergency System
- Anonymous Emergency Requests
- Ambulance Dispatch
- Hospital Assignment
- Booking System
- Admin Dashboard
- Hospital Dashboard
- Police Dashboard
- Government Drivers
- Private Drivers
- Multi-Database Architecture
- Cloudinary Integration
- Real-time Notifications

---

# ⚠ Remaining Improvements

The application is functionally complete.

Minor improvements that can be implemented in future versions:

- AI-powered accident severity analysis
- Push notifications
- Production deployment configuration
- Automated testing

---

# 👨‍💻 Developed By

emstrap team

---
