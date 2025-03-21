import Bundle from '../Models/Bundle.js'; // ES Modules import
import { uploadToCloudinary } from '../config/uploadToCloudinary.js'; // Cloudinary upload utility

export const addBundle = async (req, res) => {
	try {
		const { BundleData, categories } = req.body;

		// Check if categories are selected
		if (categories.length === 0) {
			return res.status(400).json({ message: 'At least one category must be selected' });
		}

		// Parse colors from the request body (ensure it's an array)
		let colors = Array.isArray(BundleData) ? BundleData : JSON.parse(BundleData || '[]'); // Only parse if it's a string
		let colorImages = [];

		// If color images are URLs (as in your JSON body), push them directly into colorImages array
		if (req.body.colorImages && req.body.colorImages.length > 0) {
			req.body.colorImages.forEach((imageUrl, index) => {
				const color = colors[index] ? colors[index].color : '#000000'; // Default color if missing
				colorImages.push({ color, image: imageUrl });
			});
		} else {
			console.warn('No color images provided.');
		}

		// Ensure required fields like title and price are provided
		if (!req.body.title || !req.body.price) {
			return res.status(400).json({
				success: false,
				message: 'Title and price are required',
			});
		}

		// If product image is being provided as URL
		const mainImageUrl = req.body.productImage_0 || ''; // Assuming productImage_0 is URL

		// Ensure that sizes is an array
		const sizes = Array.isArray(req.body.sizes) ? req.body.sizes : req.body.sizes.split(','); // Handle size as a string or array

		// Ensure productType is an array
		const productType = Array.isArray(req.body.productType) ? req.body.productType : req.body.productType.split(','); // Handle product type as a string or array

		// Ensure that product type is selected
		if (productType.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'At least one product type (hoodie, shirt, trouser) must be selected',
			});
		}

		// Ensure price is a valid number
		const price = parseFloat(req.body.price);
		if (isNaN(price)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid price value',
			});
		}

		// Save the bundle to the database with colors & images
		const newBundle = new Bundle({
			image: mainImageUrl, // Main image of the bundle (it could be a URL)
			colors: colorImages.map((item) => ({
				color: item.color,
				image: item.image,
				sizes: sizes, // Ensuring sizes are saved with the color
			})),
			categories: categories,
			size: sizes,
			description: req.body.description,
			seller: req.user.id, // Seller ID (user)
			customizable: req.body.customizable || false,
			productType: productType, // Save the product type
			price: price, // Save the price correctly
		});

		// Save the new bundle object
		await newBundle.save();

		return res.status(201).json({ success: true, bundle: newBundle });
	} catch (error) {
		console.error('Error in form submission:', error);
		return res.status(500).json({
			success: false,
			message: 'An internal server error occurred',
		});
	}
};

// Get All Bundles
export const getAllBundles = async (req, res) => {
	try {
		const bundles = await Bundle.find().populate('seller', 'name email'); // Populate seller details (optional)
		if (!bundles || bundles.length === 0) {
			return res.status(404).json({ success: false, message: 'No bundles found' });
		}
		return res.status(200).json({ success: true, bundles });
	} catch (error) {
		console.error('Error fetching bundles:', error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

// Get Single Bundle by ID
export const getBundleById = async (req, res) => {
	const { id } = req.params; // Get the bundle ID from URL params
	try {
		const bundle = await Bundle.findById(id).populate('seller', 'name email');
		if (!bundle) {
			return res.status(404).json({ success: false, message: 'Bundle not found' });
		}
		return res.status(200).json({ success: true, bundle });
	} catch (error) {
		console.error('Error fetching bundle:', error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

// Update a Bundle
export const updateBundle = async (req, res) => {
	const { id } = req.params;
	try {
		// Check if the bundle exists
		const bundle = await Bundle.findById(id);
		if (!bundle) {
			return res.status(404).json({ success: false, message: 'Bundle not found' });
		}

		// Check if user is the owner of the bundle
		if (bundle.seller.toString() !== req.user.id) {
			return res.status(403).json({ success: false, message: 'You are not authorized to update this bundle' });
		}

		// Update the bundle fields with the new data
		bundle.title = req.body.title || bundle.title;
		bundle.price = parseFloat(req.body.price) || bundle.price;
		bundle.description = req.body.description || bundle.description;
		bundle.colors = req.body.colorImages || bundle.colors;
		bundle.size = req.body.sizes || bundle.size;
		bundle.productType = req.body.productType || bundle.productType;
		bundle.categories = req.body.categories || bundle.categories;

		// Save the updated bundle
		await bundle.save();
		return res.status(200).json({ success: true, message: 'Bundle updated successfully', bundle });
	} catch (error) {
		console.error('Error updating bundle:', error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

// Delete a Bundle
export const deleteBundle = async (req, res) => {
	const { id } = req.params;
	try {
		// Find the bundle
		const bundle = await Bundle.findById(id);
		if (!bundle) {
			return res.status(404).json({ success: false, message: 'Bundle not found' });
		}

		// Check if user is the owner of the bundle
		if (bundle.seller.toString() !== req.user.id) {
			return res.status(403).json({ success: false, message: 'You are not authorized to delete this bundle' });
		}

		// Delete the bundle
		await bundle.remove();
		return res.status(200).json({ success: true, message: 'Bundle deleted successfully' });
	} catch (error) {
		console.error('Error deleting bundle:', error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	}
};
