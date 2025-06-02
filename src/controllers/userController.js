const User = require('../models/User');

// Get user's diamond balance
exports.getUserDiamonds = async (req, res) => {
  try {
    const { firebaseUid } = req.params; // Assuming firebaseUid is passed in params

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ diamonds: user.diamonds });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update user's diamond balance
exports.updateUserDiamonds = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { diamonds: diamondsToAdd } = req.body; // Renamed for clarity

    if (typeof diamondsToAdd !== 'number' || diamondsToAdd <= 0) {
      return res.status(400).json({ message: 'Invalid diamond value. Must be a positive number.' });
    }

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ message: 'User not found. Cannot update diamonds.' });
    }

    // Increment the existing diamond balance
    user.diamonds = (user.diamonds || 0) + diamondsToAdd;
    await user.save();

    res.status(200).json({ message: 'Diamond balance updated successfully', user });
  } catch (error) {
    console.error('Error updating user diamonds:', error); // Log the actual error on the server
    res.status(500).json({ message: 'Server error while updating diamonds', error: error.message });
  }
};
