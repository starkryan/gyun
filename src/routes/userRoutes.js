const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth'); // Assuming auth middleware exists

// Get user's diamond balance (protected route)
router.get('/:firebaseUid/diamonds', protect, userController.getUserDiamonds);

// Update user's diamond balance (protected route)
router.put('/:firebaseUid/diamonds', protect, userController.updateUserDiamonds);

module.exports = router;
