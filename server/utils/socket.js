import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let io = null;
const userSockets = new Map();
const socketUsers = new Map();

export const initSocketIO = (server) => {
  const corsOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:8081",
    "https://elegance-it-geo-infotech.onrender.com",
  ].filter(Boolean).map(url => url.replace(/\/$/, ""));

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = corsOrigins.includes(origin) || 
                         origin.endsWith(".vercel.app") || 
                         origin.includes("localhost");
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded._id;
      socket.userName = decoded.name;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userName} (${socket.userId})`);
    
    userSockets.set(socket.userId, socket.id);
    socketUsers.set(socket.id, socket.userId);

    socket.join(`user:${socket.userId}`);
    socket.join("online");

    // Broadcast that this user is online
    io.emit("user:status", { userId: socket.userId, status: "online" });

    socket.on("chat:send", (data) => {
      const isOnline = userSockets.has(data.to);
      const messageData = {
        from: socket.userId,
        fromName: socket.userName,
        text: data.text,
        timestamp: new Date().toISOString(),
        isOnline: isOnline
      };
      io.to(`user:${data.to}`).emit("chat:receive", messageData);
      
      // Acknowledge to sender that it's sent (and if recipient is online)
      socket.emit("chat:sent", { to: data.to, timestamp: messageData.timestamp, isOnline });
    });

    socket.on("message:seen", (data) => {
      // data: { from: senderId, timestamp: msgTimestamp }
      io.to(`user:${data.from}`).emit("message:status", {
        userId: socket.userId,
        timestamp: data.timestamp,
        status: "seen"
      });
    });

    socket.on("chat:sendGroup", (data) => {
      socket.to(`group:${data.groupId}`).emit("chat:receiveGroup", {
        from: socket.userId,
        fromName: socket.userName,
        text: data.text,
        groupId: data.groupId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("typing:start", (data) => {
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit("typing:update", {
          userId: socket.userId,
          userName: socket.userName,
          groupId: data.groupId,
        });
      } else {
        io.to(`user:${data.to}`).emit("typing:update", {
          userId: socket.userId,
          userName: socket.userName,
        });
      }
    });

    socket.on("typing:stop", (data) => {
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit("typing:stop", {
          userId: socket.userId,
          groupId: data.groupId,
        });
      } else {
        io.to(`user:${data.to}`).emit("typing:stop", {
          userId: socket.userId,
        });
      }
    });

    socket.on("message:read", (data) => {
      io.to(`user:${data.from}`).emit("message:read", {
        messageId: data.messageId,
        readBy: socket.userId,
      });
    });

    socket.on("notification:send", (data) => {
      io.to(`user:${data.userId}`).emit("notification:new", {
        id: data.id,
        title: data.title,
        message: data.message,
        type: data.type,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("join:group", (groupId) => {
      socket.join(`group:${groupId}`);
      socket.to(`group:${groupId}`).emit("user:joined", {
        userId: socket.userId,
        userName: socket.userName,
        groupId,
      });
    });

    socket.on("leave:group", (groupId) => {
      socket.leave(`group:${groupId}`);
      socket.to(`group:${groupId}`).emit("user:left", {
        userId: socket.userId,
        userName: socket.userName,
        groupId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userName}`);
      const userId = socket.userId;
      userSockets.delete(userId);
      socketUsers.delete(socket.id);
      
      // Broadcast that this user is offline
      io.emit("user:status", { userId: userId, status: "offline" });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const sendToGroup = (groupId, event, data) => {
  if (io) {
    io.to(`group:${groupId}`).emit(event, data);
  }
};

export const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export const isUserOnline = (userId) => {
  return userSockets.has(userId);
};

export const getOnlineUsers = () => {
  return Array.from(userSockets.keys());
};

export default {
  initSocketIO,
  getIO,
  sendToUser,
  sendToGroup,
  broadcast,
  isUserOnline,
  getOnlineUsers,
};
