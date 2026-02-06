import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import bcryptjs from "bcryptjs";
import { createDefaultCategories } from "./categoryController.js";

// Sign up controller
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Validate password length before hashing
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Validate name length
        if (name.trim().length < 2 || name.trim().length > 50) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 2 and 50 characters long"
            });
        }

        // Validate email format
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        const idx = Math.floor(Math.random()*100) +1;  // generate a num between 1-100
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`

        // Hash password manually
        const salt = await bcryptjs.genSalt(12);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Create new user with hashed password
        const user = new User({ name, email, password: hashedPassword, profilePic: randomAvatar });
        await user.save();

        // Create default categories for the new user
        await createDefaultCategories(user._id);

        // Generate token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error("Signup error:", error);
        
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Login controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check password directly with bcryptjs
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Logout controller
export const logout = (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get current user controller
export const getCurrentUser = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user.toJSON()
        });
    } catch (error) {
        console.error("Get current user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};