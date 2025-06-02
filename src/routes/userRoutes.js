const express = require('express');
const router = express.Router();
const { getUserDiamonds, updateUserDiamonds } = require('../controllers/userController');
const { protect } = require('../middleware/auth'); // Assuming auth middleware exists

// Get user's diamond balance (protected route)
router.get('/:firebaseUid/diamonds', protect, getUserDiamonds);

// Update user's diamond balance (protected route)
router.put('/:firebaseUid/diamonds', protect, updateUserDiamonds);

module.exports = router;
