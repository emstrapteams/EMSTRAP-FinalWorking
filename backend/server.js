import dns from "node:dns";
import "dotenv/config";
import connectDB from "./src/config/db.js";
import app from "./app.js";
import http from "http";
import { initSocket } from "./src/sockets/socket.js";
import { ensureDefaultAdminUser } from "./src/utils/adminAuth.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const server = http.createServer(app);
initSocket(server);

// ✅ Start from 5000 (not fixed 5001)
let PORT = Number(process.env.PORT) || 5000;

// ✅ UPDATED ERROR HANDLER (NO CRASH)
const handleServerError = (error) => {
  if (error.code === "EADDRINUSE") {
    console.warn(`⚠️ Port ${PORT} is busy. Trying ${PORT + 1}...`);
    PORT++; // move to next port
    setTimeout(() => {
      server.listen(PORT);
    }, 1000);
  } else {
    console.error("❌ Server error:", error.message);
    process.exit(1);
  }
};

server.on("error", handleServerError);

const startServer = async () => {
  try {
    await connectDB();
    await ensureDefaultAdminUser();

    // ✅ start server normally
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});