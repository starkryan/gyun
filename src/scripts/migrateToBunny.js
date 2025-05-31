/**
 * Migration script to move image data from MongoDB to Bunny.net
 *
 * This script:
 * 1. Finds all characters in the database
 * 2. For each character, uploads the image data to Bunny.net
 * 3. Updates the character record with the Bunny.net URLs
 * 4. Always removes binary image data from MongoDB to save space
 *
 * Usage:
 *   node src/scripts/migrateToBunny.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');
const bunnyStorage = require('../services/bunnyStorageService');
const Character = require('../models/Character');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create a temporary directory for processing
const tempDir = path.join(os.tmpdir(), 'bunny-migration');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  migrateImages();
})
.catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

/**
 * Main migration function
 */
async function migrateImages() {
  try {
    // Get all characters
    const characters = await Character.find();
    console.log(`Found ${characters.length} characters to process`);

    let success = 0;
    let failed = 0;

    // Process each character
    for (const character of characters) {
      console.log(`\nProcessing character: ${character.id} - ${character.name}`);

      try {
        // Skip if already has Bunny.net URLs and no image data
        if (character.imageUrl && character.imageUrl.includes('bunny') &&
            !character.imageData && !character.backgroundImageData) {
          console.log(`  Character ${character.id} already migrated, skipping.`);
          success++;
          continue;
        }

        // Process profile image if exists
        if (character.imageData) {
          console.log(`  Processing profile image for ${character.id}...`);

          // Write buffer to temp file
          const tempImagePath = path.join(tempDir, `${character.id}-profile.webp`);
          fs.writeFileSync(tempImagePath, character.imageData);

          // Upload to Bunny.net
          const imageUrl = await bunnyStorage.processAndUploadCharacterImage(
            tempImagePath,
            character.id,
            false, // not a background image
            { width: 400, height: 400 }
          );

          // Update character with new URL
          character.imageUrl = imageUrl;
          console.log(`  ✅ Profile image uploaded: ${imageUrl}`);

          // Delete temp file
          fs.unlinkSync(tempImagePath);

          // Always remove binary data from MongoDB
          character.imageData = undefined;
          character.imageContentType = undefined;
          console.log('  🗑️ Removed binary profile image data from MongoDB');
        }

        // Process background image if exists
        if (character.backgroundImageData) {
          console.log(`  Processing background image for ${character.id}...`);

          // Write buffer to temp file
          const tempBgPath = path.join(tempDir, `${character.id}-background.webp`);
          fs.writeFileSync(tempBgPath, character.backgroundImageData);

          // Upload to Bunny.net
          const bgImageUrl = await bunnyStorage.processAndUploadCharacterImage(
            tempBgPath,
            character.id,
            true, // is a background image
            { width: 1200, height: 800 }
          );

          // Update character with new URL
          character.backgroundImageUrl = bgImageUrl;
          console.log(`  ✅ Background image uploaded: ${bgImageUrl}`);

          // Delete temp file
          fs.unlinkSync(tempBgPath);

          // Always remove binary data from MongoDB
          character.backgroundImageData = undefined;
          character.backgroundImageContentType = undefined;
          console.log('  🗑️ Removed binary background image data from MongoDB');
        }

        // Save the updated character
        await character.save();
        console.log(`  ✅ Character ${character.id} updated successfully`);
        success++;
      } catch (error) {
        console.error(`  ❌ Error processing character ${character.id}:`, error.message);
        failed++;
      }
    }

    // Print summary
    console.log('\n==== Migration Summary ====');
    console.log(`Total characters: ${characters.length}`);
    console.log(`Successfully processed: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log('Binary data removed from MongoDB');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    // Clean up temp directory
    fs.rmdirSync(tempDir, { recursive: true });
    console.log('Removed temporary directory');

    console.log('\nMigration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}
