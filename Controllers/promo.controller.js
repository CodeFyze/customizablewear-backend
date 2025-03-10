import Promo from '../Models/Promo.js';
import User from '../Models/User.js';
import sendEmail from '../Utils/sendEmail.js';




// ✅ Get all active promo codes
export const getActivePromoCodes = async (req, res) => {
	try {
		// Query the database for promo codes with status 'active'
		const activePromoCodes = await Promo.find({ status: 'active' });
console.log(activePromoCodes)
		// Return the list of active promo codes
		res.status(200).json({ promos: activePromoCodes });
	} catch (error) {
		console.error('Error fetching active promo codes:', error);
		res.status(500).json({ message: 'Failed to fetch active promo codes' });
	}
};








// ✅ Create a Promo Code (Only for Admin or Seller)
export const createCode = async (req, res) => {
	console.log("coming in createCode")
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
console.log(req._id);
		const newPromo = new Promo({
			code,
			discount,
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days from now
			createdBy: req.user.id,
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
		if (!req.user || req.user.role !== 'seller') {
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
	console.log("delete code")
	try {
		// Restrict access to Admins only
		if (!req.user || req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Access denied. seller only.' });
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
		const { code, cartTotal } = req.body; // ✅ Add cartTotal to check minimum order amount

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

		// Check if the promo code is active
		if (promo.status !== 'active') {
			return res.status(400).json({ success: false, message: 'This promo code is not active' });
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

		// Return success response with discount details
		res.status(200).json({
			success: true,
			message: 'Promo code is valid',
			discount: promo.discount,
			promoCode: promo.code, // Return the promo code for reference
		});
	} catch (error) {
		console.error('Validate Promo Code Error:', error.message);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};

// ✅ Toggle Promo Code Status (Admin Only)
export const togglePromoStatus = async (req, res) => {
	try {
		console.log("toogle")
		// Restrict access to Admins only
		if (!req.user || req.user.role !== 'seller') {
			return res.status(403).json({ success: false, message: 'Access denied. seller only.' });
		}

		const { id } = req.params;

		// Find the promo code
		const promo = await Promo.findById(id);
		if (!promo) {
			return res.status(404).json({ success: false, message: 'Promo code not found' });
		}

		// Toggle status
		const newStatus = promo.status === "active" ? "inactive" : "active";
		const isActive = newStatus === "active";

		// Update the promo
		promo.status = newStatus;
		promo.isActive = isActive;
		await promo.save();

		res.status(200).json({
			success: true,
			message: `Promo code is now ${newStatus}`,
			promo,
		});
	} catch (error) {
		console.error('Toggle Promo Status Error:', error.message);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
};


// Controller to send email to all customers
export const sendEmailToCustomers = async (req, res) => {
  const { emailBody } = req.body;

  try {
    // Fetch all customer emails from the database
    const customers = await User.find({ isCustomer: true }, 'email');

    // Loop through each customer and send the email
    for (const customer of customers) {
      await sendEmail({
        email: customer.email,
        subject: 'New Offer!',
        message: emailBody,
      });
    }

    res.json({ success: true, message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};