import express from 'express';
import { getAllCodes, deleteCode, createCode, validatePromoCode } from '../Controllers/promo.controller.js';
import authenticate from '../Middleware/authenticate.js';
import authRoles from '../Middleware/authRoles.js';
import { isAdmin } from '../Controllers/auth.controller.js';

const router = express.Router();

// ✅ Validate a promo code (accessible to all authenticated users)
router.post('/validate', authenticate, validatePromoCode);
// ✅ Only admins can access promo management routes
router.get('/all', isAdmin, authRoles('seller'), getAllCodes);
router.post('/create', isAdmin, createCode);
router.delete('/delete/:id', isAdmin, authRoles('seller'), deleteCode);

export default router;
