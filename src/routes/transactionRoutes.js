import express from "express";
import {
    addTransaction,
    getTransactions,
    updateTransaction,
    deleteTransaction
} from "../controllers/transactionController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Transaction routes
router.post("/", addTransaction);
router.get("/", getTransactions);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;