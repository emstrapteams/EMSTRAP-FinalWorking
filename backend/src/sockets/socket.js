import { Server } from "socket.io";

let io;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
].filter(Boolean);

// To optimize DB performance, we throttle location updates to once every 5 seconds per request
const lastUpdateMap = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    },
  });

  io.on("connection", (socket) => {
    

    // Ambulance joins a specific room to receive nearby requests
    socket.on("join_ambulance", (data) => {
      console.log("JOIN_AMBULANCE EVENT RECEIVED", socket.id);

      socket.join("ambulance");

      console.log(
        "ROOMS:",
        [...socket.rooms]
      );
    });

    socket.on("leave_ambulance", (data) => {
      socket.leave("ambulance");
      console.log(`Ambulance left: ${socket.id}`);
    });

    // Hospital joins hospital room
    socket.on("join_hospital", (data) => {
      socket.join("hospital");
      if (data.hospitalId) {
        socket.join(`hospital_${data.hospitalId}`);
        console.log(`Hospital ${data.hospitalId} joined its specific room`);
      }
      console.log(`Hospital joined: ${socket.id}`);
    });

    // Police joins police room
    socket.on("join_police", (data) => {
      socket.join("police");
      console.log(`Police joined: ${socket.id}`);
    });

    // Ambulance sends live location
    socket.on("update_location", async (data) => {
      // 1. ALWAYS broadcast in real-time (fast, no DB load)
      if (data.requestId) {
        io.to(`request_${data.requestId}`).emit("ambulance_location", data);
        
        // 2. Throttled Persist to DB (slow, every 5 seconds)
        try {
          const now = Date.now();
          const lastUpdate = lastUpdateMap.get(`driver_${data.requestId}`) || 0;
          
          if (now - lastUpdate > 5000) { // 5 seconds throttle
            lastUpdateMap.set(`driver_${data.requestId}`, now);
            
            const EmergencyRequest = (await import("../models/emergencyrequest.model.js")).default;
            const Ambulance = (await import("../models/ambulance.model.js")).default;
            
            const request = await EmergencyRequest.findById(data.requestId);
            if (request && request.ambulance) {
              await Ambulance.findByIdAndUpdate(request.ambulance, {
                currentLocation: {
                  latitude: data.lat,
                  longitude: data.lng
                }
              });
            }
          }
        } catch (err) {
          console.error("Failed to persist driver location:", err);
        }
      }
    });

    // User sends live location
    socket.on("update_user_location", async (data) => {
      // 1. ALWAYS broadcast in real-time
      if (data.requestId) {
        io.to(`request_${data.requestId}`).emit("user_location", data);
        
        // 2. Throttled Persist to DB
        try {
          const now = Date.now();
          const lastUpdate = lastUpdateMap.get(`user_${data.requestId}`) || 0;
          
          if (now - lastUpdate > 5000) {
            lastUpdateMap.set(`user_${data.requestId}`, now);
            const EmergencyRequest = (await import("../models/emergencyrequest.model.js")).default;
            await EmergencyRequest.findByIdAndUpdate(data.requestId, {
              location: {
                latitude: data.latitude,
                longitude: data.longitude
              }
            });
          }
        } catch (err) {
          console.error("Failed to persist user location:", err);
        }
      }
    });

    // User joins a specific request room to track their ambulance
    socket.on("track_request", (data) => {
      if (data.requestId) {
        socket.join(`request_${data.requestId}`);
        console.log(`User tracking request: ${data.requestId}`);
      }
    });

    socket.on("join_user", (data) => {
      if (data.userId) {
        socket.join(`user_${data.userId}`);
        console.log(`User joined personal room: ${data.userId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
    socket.on("join_private_driver", () => {
      socket.join("private_driver");
      console.log(
        `Private Driver joined: ${socket.id}`
      );
    });
    socket.on("leave_private_driver", () => {
      socket.leave("private_driver");
      console.log(
        `Private Driver left: ${socket.id}`
      );
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
};
