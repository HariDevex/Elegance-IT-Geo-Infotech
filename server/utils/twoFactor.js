import speakeasy from "speakeasy";
import QRCode from "qrcode";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const generateSecret = () => {
  return speakeasy.generateSecret({
    name: "Elegance EMS",
    length: 20,
  });
};

const verifyTOTP = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: token,
    window: 1,
  });
};

const generateQRCode = async (otpauthUrl) => {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error("Failed to generate QR code");
  }
};

const setup2FA = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const user = await db("users").where("id", userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (user.two_factor_enabled) {
      return res.status(400).json({ success: false, error: "2FA already enabled" });
    }

    const secret = generateSecret();
    
    await db("users").where("id", userId).update({
      two_factor_secret: secret.base32,
      two_factor_enabled: false,
    });

    const qrCode = await generateQRCode(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCode,
      message: "Scan the QR code with your authenticator app",
    });
  } catch (error) {
    next(error);
  }
};

const verifyAndEnable2FA = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: "Token is required" });
    }

    const user = await db("users").where("id", userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (!user.two_factor_secret) {
      return res.status(400).json({ success: false, error: "Please setup 2FA first" });
    }

    if (!verifyTOTP(token, user.two_factor_secret)) {
      return res.status(400).json({ success: false, error: "Invalid token" });
    }

    await db("users").where("id", userId).update({
      two_factor_enabled: true,
    });

    res.json({ success: true, message: "2FA enabled successfully" });
  } catch (error) {
    next(error);
  }
};

const disable2FA = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { token, password } = req.body;

    const user = await db("users").where("id", userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const bcrypt = await import("bcryptjs");
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: "Invalid password" });
    }

    if (user.two_factor_enabled) {
      if (!token) {
        return res.status(400).json({ success: false, error: "Token required" });
      }
      if (!verifyTOTP(token, user.two_factor_secret)) {
        return res.status(400).json({ success: false, error: "Invalid token" });
      }
    }

    await db("users").where("id", userId).update({
      two_factor_secret: null,
      two_factor_enabled: false,
    });

    res.json({ success: true, message: "2FA disabled successfully" });
  } catch (error) {
    next(error);
  }
};

const verify2FALogin = async (req, res, next) => {
  try {
    const { userId, token, tempToken } = req.body;

    if (!tempToken) {
      return res.status(400).json({ success: false, error: "Temp token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid temp token" });
    }

    if (decoded.type !== "2fa_temp" || decoded._id !== userId) {
      return res.status(400).json({ success: false, error: "Invalid temp token" });
    }

    const user = await db("users").where("id", userId).first();
    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ success: false, error: "2FA not enabled" });
    }

    if (!verifyTOTP(token, user.two_factor_secret)) {
      return res.status(400).json({ success: false, error: "Invalid token" });
    }

    const authToken = jwt.sign(
      { _id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: authToken,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

const get2FAStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await db("users").where("id", userId).first();
    
    res.json({
      success: true,
      enabled: !!user.two_factor_enabled,
    });
  } catch (error) {
    next(error);
  }
};

export {
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  verify2FALogin,
  get2FAStatus,
};
