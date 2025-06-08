/**
 * MongoDB Binary Image Data Cleanup
 *
 * This script removes all binary image data from MongoDB to ensure we're only
 * storing image URLs and not the actual binary data.
 *
 * If a character has no imageUrl, this script will NOT delete the binary data
 * to prevent data loss. You should migrate to Bunny.net first.
 *
 * Usage: node src/scripts/cleanupBinaryData.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Character = require('../models/Character');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  cleanupBinaryData();
})
.catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

/**
 * Main cleanup function
 */
async function cleanupBinaryData() {
  try {
    // Get all characters
    const characters = await Character.find();
    console.log(`Found ${characters.length} characters to process`);

    let cleaned = 0;
    let skipped = 0;
    let binaryDataFound = 0;
    let totalSize = 0;

    // Process each character
    for (const character of characters) {
      console.log(`\nChecking character: ${character.id} - ${character.name}`);

      // Check if character has binary image data
      const hasProfileData = character.imageData && character.imageData.length > 0;
      const hasBackgroundData = character.backgroundImageData && character.backgroundImageData.length > 0;

      // Skip if no binary data
      if (!hasProfileData && !hasBackgroundData) {
        console.log(`  No binary data found for character ${character.id}, skipping.`);
        skipped++;
        continue;
      }

      binaryDataFound++;
      let characterUpdated = false;

      // Calculate and log the size of binary data
      if (hasProfileData) {
        const sizeInKB = Math.round(character.imageData.length / 1024);
        totalSize += sizeInKB;
        console.log(`  Found profile image data: ${sizeInKB} KB`);

        // Only remove if we have an image URL
        if (character.imageUrl) {
          character.imageData = undefined;
          character.imageContentType = undefined;
          console.log('  ✅ Removed profile image binary data');
          characterUpdated = true;
        } else {
          console.log('  ⚠️ Character has no imageUrl, keeping binary data to prevent data loss');
        }
      }

      if (hasBackgroundData) {
        const sizeInKB = Math.round(character.backgroundImageData.length / 1024);
        totalSize += sizeInKB;
        console.log(`  Found background image data: ${sizeInKB} KB`);

        // Only remove if we have a background image URL
        if (character.backgroundImageUrl) {
          character.backgroundImageData = undefined;
          character.backgroundImageContentType = undefined;
          console.log('  ✅ Removed background image binary data');
          characterUpdated = true;
        } else {
          console.log('  ⚠️ Character has no backgroundImageUrl, keeping binary data to prevent data loss');
        }
      }

      // Save the updated character if changes were made
      if (characterUpdated) {
        await character.save();
        console.log(`  ✅ Character ${character.id} updated successfully`);
        cleaned++;
      } else {
        console.log(`  ⚠️ Character ${character.id} not updated, no changes made`);
        skipped++;
      }
    }

    // Print summary
    console.log('\n==== Cleanup Summary ====');
    console.log(`Total characters: ${characters.length}`);
    console.log(`Characters with binary data: ${binaryDataFound}`);
    console.log(`Characters cleaned: ${cleaned}`);
    console.log(`Characters skipped: ${skipped}`);
    console.log(`Total binary data found: ${totalSize} KB (${Math.round(totalSize / 1024 * 100) / 100} MB)`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    console.log('\nCleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}
