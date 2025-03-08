const authRoles = (...allowedRoles) => {
	return (req, res, next) => {
	

		if (!req.user || !allowedRoles.includes(req.user.role)) {
			console.log('Access denied.');
			return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
		}

		console.log('Access granted.');
		next();
	};

};
export default authRoles
