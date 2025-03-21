import express from 'express';
import {
	addBundle,
	getAllBundles,
	updateBundle,
	deleteBundle,
	getBundleById,
} from '../Controllers/bundleController.js';
import authenticate from '../Middleware/authenticate.js';

const router = express.Router();

// Define the route to handle the form submission
router.post('/add', authenticate, addBundle);
router.get('/', getAllBundles);
router.put('/update', authenticate, updateBundle);
router.delete('/delete', authenticate, deleteBundle);
router.get('/id', authenticate, getBundleById);

export default router;
