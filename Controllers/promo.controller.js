import Promo from '../Models/Promo.js';

// ✅ Create a Promo Code (Only for Admin or Seller)
export const createCode = async (req, res) => {
	try {
		// Ensure only Admin or Seller can create promo codes
		if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'seller')) {
			return res
				.status(403)
				.json({ success: false, message: 'Access denied. Only sellers or admins can create promo codes.' });
		}

		const { code, discount } = req.body;
		if (!code || !discount) {
			return res.status(400).json({ success: false, message: 'Code and discount are required' });
		}

		const newPromo = new Promo({
			code,
			discount,
			createdBy: req.user.id, // Store the logged-in user who created it
		});

		await newPromo.save();
		res.status(201).json({ success: true, message: 'Promo code created', promo: newPromo });
	} catch (error) {
		console.error('Promo Code Creation Error:', error.message);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// ✅ Get All Promo Codes (Admin Only)
export const getAllCodes = async (req, res) => {
	try {
		// Restrict access to Admins only
		if (!req.user || req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
		}

		const promos = await Promo.find();
		res.status(200).json({ success: true, promos });
	} catch (error) {
		console.error('Get Promo Codes Error:', error.message);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// ✅ Delete a Promo Code (Admin Only)
export const deleteCode = async (req, res) => {
	try {
		// Restrict access to Admins only
		if (!req.user || req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
		}

		const { id } = req.params;
		const deletedPromo = await Promo.findByIdAndDelete(id);
		if (!deletedPromo) {
			return res.status(404).json({ success: false, message: 'Promo code not found' });
		}
		res.status(200).json({ success: true, message: 'Promo code deleted' });
	} catch (error) {
		console.error('Delete Promo Code Error:', error.message);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// ✅ Validate a Promo Code
export const validatePromoCode = async (req, res) => {
	try {
		const { code } = req.body;

		// Check if code was provided
		if (!code) {
			return res.status(400).json({ success: false, message: 'Promo code is required' });
		}

		// Find the promo code in the database
		const promo = await Promo.findOne({ code });

		// Check if the promo code exists
		if (!promo) {
			return res.status(404).json({ success: false, message: 'Invalid promo code' });
		}

		// Check if the promo code has expired
		const currentDate = new Date();
		if (promo.expiryDate && currentDate > promo.expiryDate) {
			return res.status(400).json({ success: false, message: 'Promo code has expired' });
		}

		// Check if usage limit is reached
		if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
			return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
		}

		// ✅ Increase the usage count after validation
		promo.timesUsed = (promo.timesUsed || 0) + 1;
		await promo.save();

		res.status(200).json({
			success: true,
			message: 'Promo code is valid',
			discount: promo.discount,
		});
	} catch (error) {
		console.error('Validate Promo Code Error:', error.message);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};
