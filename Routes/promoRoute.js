import express from 'express';
import {
	getAllCodes,
	deleteCode,
	createCode,
	validatePromoCode,
	togglePromoStatus,
	getActivePromoCodes,
	sendEmailToCustomers
} from '../Controllers/promo.controller.js';

import authenticate from '../Middleware/authenticate.js';
import authRoles from '../Middleware/authRoles.js';

const router = express.Router();

// ✅ Get active promo codes (accessible to authenticated users)
router.get('/active', authenticate, getActivePromoCodes);

// ✅ Validate a promo code (accessible to all authenticated users)
router.post('/validate', authenticate, validatePromoCode);

// ✅ Only admins can access promo management routes
router.get('/all', authenticate, authRoles('admin', 'seller'), getAllCodes);
router.post('/create', authenticate, authRoles('admin', 'seller'), createCode);
router.delete('/delete/:id', authenticate, authRoles('admin', 'seller'), deleteCode);
// ✅ Toggle promo status (Only for Admins)
router.patch('/toggle/:id', authenticate, authRoles('admin', 'seller'), togglePromoStatus);
// ✅ Send email to all customers (Only for Admins/Sellers)
router.post('/send-email', authenticate, authRoles('admin', 'seller'), sendEmailToCustomers);

export default router;
