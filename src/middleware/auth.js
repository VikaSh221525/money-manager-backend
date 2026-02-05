import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token structure."
            });
        }
        
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid token. User not found."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token."
            });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired."
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Server error during authentication."
        });
    }
};