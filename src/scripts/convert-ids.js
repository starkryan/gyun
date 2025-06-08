/**
 * Migration script to convert existing character IDs from UUID format to shorter numeric format
 *
 * Run this script with: node src/scripts/convert-ids.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Character = require('../models/Character');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper function to generate a shorter numeric ID
const generateShortId = () => {
  // Generate a random 6-digit number
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  // Add timestamp to ensure uniqueness (last 4 digits of timestamp)
  const timestamp = Date.now() % 10000;
  // Combine to create a unique ID (typically 10 digits)
  return `${randomNum}${timestamp}`;
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lomu')
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully');

    try {
      // Get all characters
      const characters = await Character.find();
      console.log(`Found ${characters.length} characters to process`);

      // Process each character
      let updateCount = 0;

      for (const character of characters) {
        // Check if the ID is a UUID (contains hyphens or is 36 chars long)
        if (character.id.includes('-') || character.id.length > 10) {
          // Generate a new short ID
          const newId = generateShortId();
          console.log(`Converting ${character.id} to ${newId}`);

          // Update image URLs if they exist
          if (character.imageUrl) {
            character.imageUrl = character.imageUrl.replace(character.id, newId);
          }

          if (character.backgroundImageUrl) {
            character.backgroundImageUrl = character.backgroundImageUrl.replace(character.id, newId);
          }

          // Update the ID
          character.id = newId;
          await character.save();
          updateCount++;
        }
      }

      console.log(`✅ Successfully updated ${updateCount} characters`);
    } catch (error) {
      console.error('❌ Error during migration:', error);
    } finally {
      // Close the database connection
      mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
  });
