import express from "express";
import {
    getDashboardSummary,
    getTrends,
    getAccountsOverview
} from "../controllers/dashboardController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard routes
router.get("/summary", getDashboardSummary);
router.get("/trends", getTrends);
router.get("/accounts", getAccountsOverview);

export default router;