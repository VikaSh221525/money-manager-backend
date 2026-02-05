import express from "express";
import {
    createAccount,
    getAccounts,
    updateAccount,
    deleteAccount,
    getAccountDetails
} from "../controllers/accountController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Account routes
router.post("/", createAccount);
router.get("/", getAccounts);
router.get("/:id", getAccountDetails);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

export default router;