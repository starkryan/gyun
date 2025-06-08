const express = require('express');
const router = express.Router();
// const { getUserDiamonds, updateUserDiamonds } = require('../controllers/userController'); // Diamond functions removed
const { protect } = require('../middleware/auth'); // Assuming auth middleware exists

// Get user's diamond balance (protected route) - Functionality Removed
// router.get('/:firebaseUid/diamonds', protect, getUserDiamonds);

// Update user's diamond balance (protected route) - Functionality Removed
// router.put('/:firebaseUid/diamonds', protect, updateUserDiamonds);

// If you have other user-related routes, add them here.
// For example:
// router.get('/:firebaseUid/profile', protect, someUserProfileControllerFunction);

module.exports = router;
