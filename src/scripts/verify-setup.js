/**
 * Verification script to check if MongoDB image storage is correctly set up
 *
 * Run this script with: node src/scripts/verify-setup.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Character = require('../models/Character');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lomu')
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully');

    try {
      // Get all characters
      const characters = await Character.find();
      console.log(`Found ${characters.length} characters to check`);

      // Check image data for each character
      let withImageData = 0;
      let withoutImageData = 0;
      let withLongIds = 0;
      let withShortIds = 0;

      for (const character of characters) {
        // Check ID format
        if (character.id.includes('-') || character.id.length > 10) {
          withLongIds++;
          console.log(`Character ${character.name} has long ID: ${character.id}`);
        } else {
          withShortIds++;
        }

        // Check image data
        if (character.imageData && character.imageData.buffer) {
          withImageData++;
        } else {
          withoutImageData++;
          console.log(`⚠️ Character ${character.name} (${character.id}) is missing image data`);
        }
      }

      console.log('\n--- VERIFICATION RESULTS ---');
      console.log(`Total characters: ${characters.length}`);
      console.log(`Characters with image data: ${withImageData}`);
      console.log(`Characters without image data: ${withoutImageData}`);
      console.log(`Characters with long IDs: ${withLongIds}`);
      console.log(`Characters with short IDs: ${withShortIds}`);

      if (withoutImageData > 0) {
        console.log('\n⚠️ Some characters are missing image data. Run import script to fix this.');
      }

      if (withLongIds > 0) {
        console.log('\n⚠️ Some characters still have long IDs. Run convert-ids script to fix this.');
      }

      if (withoutImageData === 0 && withLongIds === 0) {
        console.log('\n✅ All checks passed! Your setup is correct.');
      }
    } catch (error) {
      console.error('❌ Error during verification:', error);
    } finally {
      // Close the database connection
      mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
  });
