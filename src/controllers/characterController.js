const Character = require('../models/Character');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const bunnyStorage = require('../services/bunnyStorageService');
const localStorage = require('../services/localStorageService');

// Helper function to generate a shorter numeric ID
const generateShortId = () => {
  // Generate a random 6-digit number
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  // Add timestamp to ensure uniqueness (last 4 digits of timestamp)
  const timestamp = Date.now() % 10000;
  // Combine to create a unique ID (typically 10 digits)
  return `${randomNum}${timestamp}`;
};

// Get all characters
exports.getAllCharacters = async (req, res) => {
  try {
    // Optimize: Select only necessary fields to reduce data transfer
    // Consider adding indexes on 'isActive' and 'createdAt' for better performance.
    // For very large datasets, implement pagination (e.g., .skip().limit()).
    const characters = await Character.find(
      { isActive: true },
      { // Projection: Include only fields needed by the frontend
        id: 1,
        name: 1,
        description: 1,
        personality: 1,
        imageUrl: 1,
        backgroundImageUrl: 1,
        accentColor: 1,
        textColor: 1,
        age: 1,
        location: 1,
        responseTime: 1,
        traits: 1,
        interests: 1,
        isPremium: 1, // Assuming isPremium might be needed for frontend Profile interface
        style: 1, // Assuming style might be needed for frontend Profile interface
      }
    ).sort({ createdAt: -1 });

    // Get server base URL for API endpoints
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Transform data to match the format expected by the React Native app
    const transformedCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      description: char.description,
      personality: char.personality,
      image: { uri: char.imageUrl },
      backgroundImage: { uri: char.backgroundImageUrl },
      accentColor: char.accentColor,
      textColor: char.textColor,
      age: char.age,
      location: char.location,
      responseTime: char.responseTime,
      traits: char.traits,
      interests: char.interests,
      isPremium: char.isPremium,
      style: char.style,
    }));

    res.status(200).json(transformedCharacters);
  } catch (error) {
    console.error('Error getting characters:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get character by ID
exports.getCharacterById = async (req, res) => {
  try {
    const character = await Character.findOne({ id: req.params.id, isActive: true });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Get server base URL for API endpoints
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Transform to match React Native format
    const transformedCharacter = {
      id: character.id,
      name: character.name,
      description: character.description,
      personality: character.personality,
      image: { uri: character.imageUrl },
      backgroundImage: { uri: character.backgroundImageUrl },
      accentColor: character.accentColor,
      textColor: character.textColor,
      age: character.age,
      location: character.location,
      responseTime: character.responseTime,
      traits: character.traits,
      interests: character.interests,
    };

    res.status(200).json(transformedCharacter);
  } catch (error) {
    console.error('Error getting character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new character
exports.createCharacter = async (req, res) => {
  try {
    console.log('createCharacter called with:');
    console.log('- Headers:', req.headers);
    console.log('- Body:', req.body);
    console.log('- Files:', req.files);

    let {
      name,
      description,
      personality,
      accentColor,
      textColor,
      age,
      location,
      responseTime,
      traits,
      interests,
    } = req.body;

    // Parse traits and interests if they're JSON strings
    if (traits && typeof traits === 'string') {
      try {
        traits = JSON.parse(traits);
      } catch (error) {
        console.error('Error parsing traits JSON:', error);
        traits = traits.split(',').map(t => t.trim());
      }
    }

    if (interests && typeof interests === 'string') {
      try {
        interests = JSON.parse(interests);
      } catch (error) {
        console.error('Error parsing interests JSON:', error);
        interests = interests.split(',').map(i => i.trim());
      }
    }

    console.log('Extracted fields:', {
      name,
      description,
      personality,
      hasFiles: !!req.files,
      hasImage: req.files && !!req.files.image,
    });

    // Validate required fields
    if (!name || !description || !personality) {
      console.log('Validation failed! Missing required fields:', {
        hasName: !!name,
        hasDescription: !!description,
        hasPersonality: !!personality,
      });
      return res.status(400).json({ message: 'Please provide name, description, and personality' });
    }

    // Validate image files are uploaded
    if (!req.files || !req.files.image) {
      console.log('Image validation failed!', {
        hasFiles: !!req.files,
        filesKeys: req.files ? Object.keys(req.files) : [],
      });
      return res.status(400).json({ message: 'Character image is required' });
    }

    // Process the image file
    const image = req.files.image[0];

    // Generate a shorter numeric ID instead of UUID
    const characterId = generateShortId();

    // Get server base URL for API endpoints
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Try to upload to Bunny.net first, fall back to local storage if it fails
    let imageUrl;
    try {
      imageUrl = await bunnyStorage.processAndUploadCharacterImage(
        image.path,
        characterId,
        false, // not a background image
        { width: 400, height: 400 }
      );
      console.log('Profile image uploaded to Bunny.net:', imageUrl);
    } catch (err) {
      console.error('Failed to upload image to Bunny.net, falling back to local storage:', err);
      try {
        // Fall back to local storage
        imageUrl = await localStorage.processAndSaveCharacterImage(
          image.path,
          characterId,
          false,
          { width: 400, height: 400 }
        );
        // Make absolute URL
        imageUrl = baseUrl + imageUrl;
        console.log('Profile image saved to local storage:', imageUrl);
      } catch (localErr) {
        console.error('Failed to save image locally:', localErr);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }

    // Upload the background image to Bunny.net if provided
    let backgroundImageUrl = null;
    if (req.files.backgroundImage && req.files.backgroundImage[0]) {
      try {
        backgroundImageUrl = await bunnyStorage.processAndUploadCharacterImage(
          req.files.backgroundImage[0].path,
          characterId,
          true, // is a background image
          { width: 1200, height: 800 }
        );
        console.log('Background image uploaded to Bunny.net:', backgroundImageUrl);
      } catch (err) {
        console.error('Failed to upload background image to Bunny.net, falling back to local storage:', err);
        try {
          // Fall back to local storage
          backgroundImageUrl = await localStorage.processAndSaveCharacterImage(
            req.files.backgroundImage[0].path,
            characterId,
            true,
            { width: 1200, height: 800 }
          );
          // Make absolute URL
          backgroundImageUrl = baseUrl + backgroundImageUrl;
          console.log('Background image saved to local storage:', backgroundImageUrl);
        } catch (localErr) {
          console.error('Failed to save background image locally:', localErr);
          // Continue without background image
        }
      }
    }

    // Delete temporary files after processing
    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }

    if (req.files.backgroundImage && req.files.backgroundImage[0] &&
        fs.existsSync(req.files.backgroundImage[0].path)) {
      fs.unlinkSync(req.files.backgroundImage[0].path);
    }

    // Create new character with image URLs
    const character = new Character({
      id: characterId,
      name,
      description,
      personality,
      imageUrl: imageUrl,
      backgroundImageUrl: backgroundImageUrl,
      accentColor: accentColor || '#ec4899',
      textColor: textColor || '#ffffff',
      age,
      location,
      responseTime: responseTime || '< 1 min',
      traits: traits || [],
      interests: interests || [],

    });

    await character.save();

    // Transform to match React Native format
    const transformedCharacter = {
      id: character.id,
      name: character.name,
      description: character.description,
      personality: character.personality,
      image: { uri: character.imageUrl },
      backgroundImage: { uri: character.backgroundImageUrl },
      accentColor: character.accentColor,
      textColor: character.textColor,
      age: character.age,
      location: character.location,
      responseTime: character.responseTime,
      traits: character.traits,
      interests: character.interests,
    };

    res.status(201).json(transformedCharacter);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a character
exports.updateCharacter = async (req, res) => {
  try {
    const characterId = req.params.id;
    let {
      name,
      description,
      personality,
      accentColor,
      textColor,
      age,
      location,
      responseTime,
      traits,
      interests,
    } = req.body;

    // Parse traits and interests if they're JSON strings
    if (traits && typeof traits === 'string') {
      try {
        traits = JSON.parse(traits);
      } catch (error) {
        console.error('Error parsing traits JSON:', error);
        traits = traits.split(',').map(t => t.trim());
      }
    }

    if (interests && typeof interests === 'string') {
      try {
        interests = JSON.parse(interests);
      } catch (error) {
        console.error('Error parsing interests JSON:', error);
        interests = interests.split(',').map(i => i.trim());
      }
    }

    const character = await Character.findOne({ id: characterId });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Update text fields
    if (name) {character.name = name;}
    if (description) {character.description = description;}
    if (personality) {character.personality = personality;}
    if (accentColor) {character.accentColor = accentColor;}
    if (textColor) {character.textColor = textColor;}
    if (age) {character.age = age;}
    if (location) {character.location = location;}
    if (responseTime) {character.responseTime = responseTime;}
    if (traits) {character.traits = traits;}
    if (interests) {character.interests = interests;}

    // Get server base URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Update image if provided
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        // Try to upload the new image to Bunny.net
        const newImageUrl = await bunnyStorage.processAndUploadCharacterImage(
          req.files.image[0].path,
          characterId,
          false, // not a background image
          { width: 400, height: 400 }
        );

        // Update the image URL in the character
        character.imageUrl = newImageUrl;
        console.log(`Updated profile image for character ${characterId}:`, newImageUrl);
      } catch (err) {
        console.error('Failed to upload updated image to Bunny.net, falling back to local storage:', err);
        try {
          // Fall back to local storage
          const localImageUrl = await localStorage.processAndSaveCharacterImage(
            req.files.image[0].path,
            characterId,
            false,
            { width: 400, height: 400 }
          );
          // Make absolute URL
          character.imageUrl = baseUrl + localImageUrl;
          console.log(`Updated profile image (local) for character ${characterId}:`, character.imageUrl);
        } catch (localErr) {
          console.error('Failed to save image locally:', localErr);
          return res.status(500).json({ message: 'Failed to upload updated image' });
        }
      } finally {
        // Delete temporary file
        if (fs.existsSync(req.files.image[0].path)) {
          fs.unlinkSync(req.files.image[0].path);
        }
      }
    }

    // Update background image if provided
    if (req.files && req.files.backgroundImage && req.files.backgroundImage[0]) {
      try {
        // Try to upload the new background image to Bunny.net
        const newBgImageUrl = await bunnyStorage.processAndUploadCharacterImage(
          req.files.backgroundImage[0].path,
          characterId,
          true, // is a background image
          { width: 1200, height: 800 }
        );

        // Update the background image URL in the character
        character.backgroundImageUrl = newBgImageUrl;
        console.log(`Updated background image for character ${characterId}:`, newBgImageUrl);
      } catch (err) {
        console.error('Failed to upload updated background image to Bunny.net, falling back to local storage:', err);
        try {
          // Fall back to local storage
          const localBgImageUrl = await localStorage.processAndSaveCharacterImage(
            req.files.backgroundImage[0].path,
            characterId,
            true,
            { width: 1200, height: 800 }
          );
          // Make absolute URL
          character.backgroundImageUrl = baseUrl + localBgImageUrl;
          console.log(`Updated background image (local) for character ${characterId}:`, character.backgroundImageUrl);
        } catch (localErr) {
          console.error('Failed to save background image locally:', localErr);
          // Continue without updating background image
        }
      } finally {
        // Delete temporary file
        if (fs.existsSync(req.files.backgroundImage[0].path)) {
          fs.unlinkSync(req.files.backgroundImage[0].path);
        }
      }
    }

    // Update timestamp
    character.updatedAt = Date.now();

    // Save the updated character
    await character.save();

    // Transform to match React Native format
    const transformedCharacter = {
      id: character.id,
      name: character.name,
      description: character.description,
      personality: character.personality,
      image: { uri: character.imageUrl },
      backgroundImage: { uri: character.backgroundImageUrl },
      accentColor: character.accentColor,
      textColor: character.textColor,
      age: character.age,
      location: character.location,
      responseTime: character.responseTime,
      traits: character.traits,
      interests: character.interests,
    };

    res.status(200).json(transformedCharacter);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a character (soft delete)
exports.deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({ id: req.params.id });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Soft delete
    character.isActive = false;
    character.updatedAt = Date.now();
    await character.save();

    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Permanently delete a character
exports.permanentDeleteCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({ id: req.params.id });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Delete the character from the database
    // This will delete all associated data including image data
    await Character.deleteOne({ id: req.params.id });

    res.status(200).json({ message: 'Character permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting character:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get featured characters
exports.getFeaturedCharacters = async (req, res) => {
  try {
    // Get 3 random characters
    const characters = await Character.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 3 } },
    ]);

    // Get server base URL for API endpoints
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Transform data to match the format expected by the React Native app
    const transformedCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      description: char.description,
      personality: char.personality,
      image: { uri: char.imageUrl },
      backgroundImage: { uri: char.backgroundImageUrl },
      accentColor: char.accentColor,
      textColor: char.textColor,
      age: char.age,
      location: char.location,
      responseTime: char.responseTime,
      traits: char.traits,
      interests: char.interests,
    }));

    res.status(200).json(transformedCharacters);
  } catch (error) {
    console.error('Error getting featured characters:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

