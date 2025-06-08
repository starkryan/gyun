const Character = require('../models/Character');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Admin login
exports.login = (req, res) => {
  const { username, password } = req.body;

  // Super simple authentication for demo purposes
  // In production, use proper auth with hashed passwords, etc.
  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === validUsername && password === validPassword) {
    const apiKey = process.env.ADMIN_API_KEY || 'leome-admin-key';
    return res.status(200).json({ apiKey });
  }

  res.status(401).json({ message: 'Invalid credentials' });
};

// Get stats for admin dashboard
exports.getStats = async (req, res) => {
  try {
    const totalCharacters = await Character.countDocuments();
    const activeCharacters = await Character.countDocuments({ isActive: true });
    const inactiveCharacters = await Character.countDocuments({ isActive: false });

    const stats = {
      totalCharacters,
      activeCharacters,
      inactiveCharacters,
      serverUptime: process.uptime(), // in seconds
      nodeVersion: process.version,
      mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all characters (including inactive) for admin
exports.getAllCharacters = async (req, res) => {
  try {
    const characters = await Character.find().sort({ createdAt: -1 });

    // Get server base URL for API endpoints
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Transform the characters for admin dashboard
    const transformedCharacters = characters.map(char => {
      // Create a plain object from mongoose document
      const plainChar = char.toObject();

      // Don't send binary image data to admin dashboard
      delete plainChar.imageData;
      delete plainChar.backgroundImageData;

      // Ensure image URLs are set
      if (!plainChar.imageUrl) {
        plainChar.imageUrl = `${baseUrl}/api/characters/${char.id}/image`;
      }

      if (!plainChar.backgroundImageUrl) {
        plainChar.backgroundImageUrl = `${baseUrl}/api/characters/${char.id}/background`;
      }

      return plainChar;
    });

    res.status(200).json(transformedCharacters);
  } catch (error) {
    console.error('Error getting characters:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get character by ID for admin
exports.getCharacterById = async (req, res) => {
  try {
    const character = await Character.findOne({ id: req.params.id });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Get server base URL for API endpoints
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Create a plain object from mongoose document
    const plainChar = character.toObject();

    // Don't send binary image data to admin dashboard
    delete plainChar.imageData;
    delete plainChar.backgroundImageData;

    // Ensure image URLs are set
    if (!plainChar.imageUrl) {
      plainChar.imageUrl = `${baseUrl}/api/characters/${character.id}/image`;
    }

    if (!plainChar.backgroundImageUrl) {
      plainChar.backgroundImageUrl = `${baseUrl}/api/characters/${character.id}/background`;
    }

    res.status(200).json(plainChar);
  } catch (error) {
    console.error('Error getting character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create character from admin
exports.createCharacter = async (req, res) => {
  // This is handled by the characterController already
  // Just redirecting to the character controller's method
  require('./characterController').createCharacter(req, res);
};

// Update character from admin
exports.updateCharacter = async (req, res) => {
  // This is handled by the characterController already
  // Just redirecting to the character controller's method
  require('./characterController').updateCharacter(req, res);
};

// Delete character from admin
exports.deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({ id: req.params.id });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Soft delete - just mark as inactive
    character.isActive = false;
    await character.save();

    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
