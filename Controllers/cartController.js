import multer from 'multer';
import mongoose from 'mongoose';
import { uploadToCloudinary } from "../config/uploadToCloudinary.js";
import Cart from "../Models/Cart.js";
import Product from '../Models/Product.js';
import Order from '../Models/Order.js';


const storage = multer.memoryStorage(); 
const upload = multer({ storage }).single('logo'); 


export const addToCart = async (req, res) => {
console.log("idhr ha hm add to cart me")
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error handling file upload:", err);
      return res.status(400).json({ success: false, message: "File upload failed" });
    }
    
    try {
      const { productId, quantity, size, color, method, position, usePreviousLogo, textLine, font, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized - No user found" });
      }

      // Ensure valid quantity
      const finalQuantity = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

      if (!productId || !finalQuantity || !size || !color) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      // Fetch the product
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });

      let logoUrl = "";

      if (usePreviousLogo === "true") {
        // ✅ Fetch previous logo from user's orders
        const lastOrderWithLogo = await Order.findOne({ userId, "products.logo": { $exists: true, $ne: "" } })
          .sort({ createdAt: -1 })
          .select("products.logo");

        if (lastOrderWithLogo) {
          const logoProduct = lastOrderWithLogo.products.find((p) => p.logo);
          if (logoProduct) logoUrl = logoProduct.logo;
        }
      } else if (req.file) {
        // ✅ Upload new logo
        logoUrl = await uploadToCloudinary(req.file, "shirt-logo");
      }

      let finalPrice = product.price;
      if (!usePreviousLogo && req.file) finalPrice += 5;

      let cart = await Cart.findOne({ user: userId });
      if (!cart) cart = new Cart({ user: userId, products: [] });

      cart.products.push({
        product: productId,
        title: product.title,
        frontImage: product.frontImage,
        sideImage: product.sideImage || "",
        price: finalPrice,
        size,
        color,
        logo: logoUrl || "",
        quantity: finalQuantity,
        method: method || "Not selected",
        position: position || "Not selected",
        textLine: textLine || "",  // ✅ Storing textLine
        font: font || "",  // ✅ Storing font
        notes: notes || ""  // ✅ Storing notes
      });

      await cart.save();
      res.status(200).json({ success: true, cart });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });
};


export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("Fetching cart for user:", userId);

    // Ensure products are populated correctly
    const cart = await Cart.findOne({ user: userId }).populate(
      "products.product",
      "title frontImage sideImage price"
    );

    // Include method, position, textLine, font, and notes in the response
    const formattedCart = cart?.products.map((item) => ({
      _id: item._id,
      product: item.product,
      title: item.title,
      frontImage: item.frontImage,
      sideImage: item.sideImage,
      price: item.price,
      size: item.size,
      color: item.color,
      logo: item.logo,
      quantity: item.quantity,
      method: item.method || "Not selected",
      position: item.position || "Not selected",
      textLine: item.textLine || "",  // Add textLine to the response
      font: item.font || "",          // Add font to the response
      notes: item.notes || ""         // Add notes to the response
    }));
    res.status(200).json({ success: true, cart: formattedCart });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


export const increaseQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    
    // Log the received productId and userId
    console.log("Received productId:", productId);
    console.log("Received userId:", userId);

    // Fetch the cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    // Log the cart to check its contents
    console.log("Cart found:", cart);

    const itemIndex = cart.products.findIndex(item => item._id.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in cart" });
    }
    console.log("index number ===>",itemIndex)

    // Log the item to be updated
    console.log("Product to increase:", cart.products[itemIndex]);

    // Increase the quantity
    cart.products[itemIndex].quantity += 1;

    // Log after updating the quantity
    console.log("Updated product:", cart.products[itemIndex]);

    // Save the updated cart
    await cart.save();

    // Log the updated cart
    console.log("Updated Cart:", cart);

    // Send success response
    res.status(200).json({ success: true, cart,updatedCart:cart.products[itemIndex] });
  } catch (error) {
    console.error("Error increasing quantity:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const decreaseQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Find the user's cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    // Find the item in the cart and update its quantity
    const itemIndex = cart.products.findIndex(item => item._id.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in cart" });
    }

    // Decrease the quantity of the product, ensuring it doesn't go below 1
    if (cart.products[itemIndex].quantity > 1) {
      cart.products[itemIndex].quantity -= 1;
    }

    // Save the cart after updating the quantity
    await cart.save();

    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("Error decreasing quantity:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// export const removeFromCart = async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const userId = req.user.id;

//     console.log("User ID:", userId);
//     console.log("Received productId:", productId);

//     // Ensure the productId is a valid ObjectId using 'new'
//     const productObjectId = new mongoose.Types.ObjectId(productId);

//     // Fetch the user's cart
//     let cart = await Cart.findOne({ user: userId });

//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }

//     console.log("Current cart products:", cart.products);

//     // Check if the product exists in the cart
//     const productExists = cart.products.some(item => item.product.toString() === productObjectId.toString());

//     if (!productExists) {
//       return res.status(404).json({ message: "Product not found in the cart" });
//     }

//     // Filter out the product with the matching productId
//     cart.products = cart.products.filter((item) => item.product.toString() !== productObjectId.toString());

//     console.log("Filtered cart products:", cart.products);

//     // If the cart is empty after removing the product, delete the entire cart
//     if (cart.products.length === 0) {
//       await Cart.deleteOne({ user: userId });
//       console.log("Cart is empty. Deleted the cart.");
//       return res.status(200).json({ success: true, message: "Cart is empty and has been deleted" });
//     }

//     // Save the updated cart if products are still remaining
//     const updatedCart = await cart.save();
//     console.log("Updated Cart After Removal:", updatedCart);

//     if (updatedCart) {
//       res.status(200).json({ success: true, cart: updatedCart });
//     } else {
//       console.error("❌ Failed to save updated cart");
//       res.status(500).json({ success: false, message: "Failed to update cart" });
//     }
//   } catch (error) {
//     console.error("❌ Error removing product:", error);
//     res.status(500).json({ message: error.message });
//   }
// };




export const removeFromCart = async (req, res) => {
	try {
		const { productId } = req.params;
		console.log('productId--->', productId);
		const userId = req.user.id;

		console.log('User ID:', userId);
		console.log('Received productId:', productId);

		// Ensure the productId is a valid ObjectId using 'new'
		const productObjectId = new mongoose.Types.ObjectId(productId);

		// Fetch the user's cart
		let cart = await Cart.findOne({ user: userId });

		if (!cart) {
			return res.status(404).json({ message: 'Cart not found' });
		}

		console.log('Current cart products:', cart.products);

		// Check if the product exists in the cart
		const productExists = cart.products.find((item) => item._id.toString() === productObjectId.toString());
		console.log('products exist--->', productExists);

		if (!productExists) {
			return res.status(404).json({ message: 'Product not found in the cart' });
		}

		// Store the product before removing it
		const deletedProduct = productExists;

		// Filter out the product with the matching productId
		cart.products = cart.products.filter((item) => item._id.toString() !== productObjectId.toString());
		console.log('Filtered cart products:', cart.products);

		// If the cart is empty after removing the product, delete the entire cart
		if (cart.products.length === 0) {
			await Cart.deleteOne({ user: userId });
			console.log('Cart is empty. Deleted the cart.');
			return res.status(200).json({ success: true, message: 'Cart is empty and has been deleted', deletedProduct });
		}

		// Save the updated cart if products are still remaining
		const updatedCart = await cart.save();
		console.log('Updated Cart After Removal:', updatedCart);

		if (updatedCart) {
			res.status(200).json({ success: true, cart: updatedCart, deletedProduct });
		} else {
			console.error('❌ Failed to save delete cart');
			res.status(500).json({ success: false, message: 'Failed to update cart' });
		}
	} catch (error) {
		console.error('❌ Error removing product:', error);
		res.status(500).json({ message: error.message });
	}
};