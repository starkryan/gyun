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
    const { firebaseUid } = req.params; // Assuming firebaseUid is passed in params
    const { diamonds } = req.body; // Assuming new diamond value is in body

    if (typeof diamonds !== 'number' || diamonds < 0) {
      return res.status(400).json({ message: 'Invalid diamond value' });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { diamonds },
      { new: true, upsert: true } // Create user if not exists, return updated doc
    );

    res.status(200).json({ message: 'Diamond balance updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
