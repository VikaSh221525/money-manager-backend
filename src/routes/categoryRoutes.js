import express from "express";
import {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,
    getCategorySummary,
    initializeDefaultCategories
} from "../controllers/categoryController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Category routes
router.post("/", createCategory);
router.get("/", getCategories);
router.get("/summary", getCategorySummary);
router.post("/initialize", initializeDefaultCategories); // Utility endpoint
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;