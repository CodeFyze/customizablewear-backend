import express from "express";
import { submitForm } from "../Controllers/bundleController.js"; // Corrected import to ES module syntax
import authenticate from "../Middleware/authenticate.js"; 


const router = express.Router();

// Define the route to handle the form submission
router.post("/add", authenticate , submitForm);

export default router;
