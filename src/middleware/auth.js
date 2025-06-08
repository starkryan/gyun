// Simple admin authentication for the dashboard
// In a production app, you would use JWT or OAuth

// Basic admin authentication middleware
exports.adminAuth = (req, res, next) => {
  // Get API key from query params, headers, or cookies
  const apiKey = req.query.apiKey ||
                req.headers['x-api-key'] ||
                req.cookies?.apiKey;

  // Check for valid API key (hardcoded for simplicity)
  // In production, this would be stored securely
  const validApiKey = process.env.ADMIN_API_KEY || 'leome-admin-key';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      message: 'Unauthorized. Please provide a valid API key.',
    });
  }

  // If API key is valid, proceed
  next();
};

// Placeholder user authentication middleware
// TODO: Implement proper user authentication (e.g., JWT verification)
exports.protect = (req, res, next) => {
  // For now, just allow the request to proceed
  next();
};
