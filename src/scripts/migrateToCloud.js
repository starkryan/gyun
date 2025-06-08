/**
 * MongoDB Migration Script - Local to Cloud
 *
 * This script migrates data from a local MongoDB instance to a cloud MongoDB (Atlas)
 * It will:
 * 1. Connect to both local and cloud MongoDB instances
 * 2. Back up all collections from the local database
 * 3. Migrate the data to the cloud database
 * 4. Verify the migration was successful
 *
 * Usage:
 *   node src/scripts/migrateToCloud.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create a readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../../backup');

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

// Connection strings
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/lomu';
const CLOUD_MONGODB_URI = process.env.MONGODB_URI;

// Mongoose connections
let localConnection = null;
let cloudConnection = null;

// Ensure the backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Created backup directory at: ${BACKUP_DIR}`);
}

/**
 * Connect to MongoDB instance
 * @param {string} uri - MongoDB connection URI
 * @param {string} name - Connection name for logging
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
async function connectToMongoDB(uri, name) {
  console.log(`Connecting to ${name} MongoDB...`);

  try {
    const connection = await mongoose.createConnection(uri, mongoOptions);
    console.log(`✅ Connected to ${name} MongoDB`);
    return connection;
  } catch (error) {
    console.error(`❌ Failed to connect to ${name} MongoDB:`, error.message);
    throw error;
  }
}

/**
 * Get all collection names from a database
 * @param {mongoose.Connection} connection - Mongoose connection
 * @returns {Promise<string[]>} Collection names
 */
async function getCollections(connection) {
  const collections = await connection.db.listCollections().toArray();
  return collections.map(collection => collection.name);
}

/**
 * Backup a collection to a JSON file
 * @param {mongoose.Connection} connection - Mongoose connection
 * @param {string} collectionName - Collection name
 * @returns {Promise<number>} Number of documents backed up
 */
async function backupCollection(connection, collectionName) {
  console.log(`Backing up collection: ${collectionName}`);

  try {
    const collection = connection.db.collection(collectionName);
    const documents = await collection.find({}).toArray();

    const backupPath = path.join(BACKUP_DIR, `${collectionName}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(documents, null, 2));

    console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
    return documents.length;
  } catch (error) {
    console.error(`❌ Failed to backup collection ${collectionName}:`, error.message);
    return 0;
  }
}

/**
 * Restore a collection from a backup file
 * @param {mongoose.Connection} connection - Mongoose connection
 * @param {string} collectionName - Collection name
 * @returns {Promise<number>} Number of documents restored
 */
async function restoreCollection(connection, collectionName) {
  console.log(`Restoring collection: ${collectionName}`);

  try {
    const backupPath = path.join(BACKUP_DIR, `${collectionName}.json`);

    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found for ${collectionName}`);
      return 0;
    }

    const documents = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    if (documents.length === 0) {
      console.log(`ℹ️ No documents to restore for ${collectionName}`);
      return 0;
    }

    const collection = connection.db.collection(collectionName);

    // Drop the collection if it exists
    await collection.drop().catch(() => {
      // Ignore error if collection doesn't exist
    });

    // Insert all documents
    const result = await collection.insertMany(documents);
    console.log(`✅ Restored ${result.insertedCount} documents to ${collectionName}`);
    return result.insertedCount;
  } catch (error) {
    console.error(`❌ Failed to restore collection ${collectionName}:`, error.message);
    return 0;
  }
}

/**
 * Verify that collections were migrated correctly
 * @param {mongoose.Connection} localConn - Local MongoDB connection
 * @param {mongoose.Connection} cloudConn - Cloud MongoDB connection
 * @param {string[]} collections - Collection names
 * @returns {Promise<boolean>} True if verification passed
 */
async function verifyMigration(localConn, cloudConn, collections) {
  console.log('\n🔍 Verifying migration...');

  let success = true;

  for (const collectionName of collections) {
    try {
      const localCollection = localConn.db.collection(collectionName);
      const cloudCollection = cloudConn.db.collection(collectionName);

      const localCount = await localCollection.countDocuments();
      const cloudCount = await cloudCollection.countDocuments();

      if (localCount === cloudCount) {
        console.log(`✅ ${collectionName}: ${cloudCount}/${localCount} documents migrated`);
      } else {
        console.error(`❌ ${collectionName}: ${cloudCount}/${localCount} documents migrated`);
        success = false;
      }
    } catch (error) {
      console.error(`❌ Failed to verify ${collectionName}:`, error.message);
      success = false;
    }
  }

  return success;
}

/**
 * Prompt the user to continue
 * @param {string} message - Prompt message
 * @returns {Promise<boolean>} True if user confirmed
 */
function confirm(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main migration function
 */
async function migrateToCloud() {
  console.log('=== MongoDB Migration - Local to Cloud ===');

  try {
    // Check if cloud MongoDB URI is set
    if (!CLOUD_MONGODB_URI) {
      console.error('❌ Cloud MongoDB URI is not set in .env file');
      return;
    }

    // Connect to MongoDB instances
    localConnection = await connectToMongoDB(LOCAL_MONGODB_URI, 'Local');
    cloudConnection = await connectToMongoDB(CLOUD_MONGODB_URI, 'Cloud');

    // Get collections from local database
    const collections = await getCollections(localConnection);
    console.log(`\nFound ${collections.length} collections: ${collections.join(', ')}`);

    // Confirm backup
    const backupConfirmed = await confirm('\nDo you want to backup the local database first?');

    // Backup collections if confirmed
    let backup = {};
    if (backupConfirmed) {
      console.log('\n📦 Backing up local database...');

      for (const collectionName of collections) {
        const count = await backupCollection(localConnection, collectionName);
        backup[collectionName] = count;
      }

      console.log('\n✅ Backup completed');
      console.log(`📁 Backup files saved to: ${BACKUP_DIR}`);
    }

    // Confirm migration
    const migrateConfirmed = await confirm('\nDo you want to migrate data to the cloud database?');

    if (!migrateConfirmed) {
      console.log('Migration canceled');
      return;
    }

    // Migrate collections
    console.log('\n🚀 Migrating data to cloud database...');

    for (const collectionName of collections) {
      await restoreCollection(cloudConnection, collectionName);
    }

    // Verify migration
    const verified = await verifyMigration(localConnection, cloudConnection, collections);

    if (verified) {
      console.log('\n✅ Migration completed successfully');
    } else {
      console.error('\n⚠️ Migration completed with errors');
    }

    console.log('\n=== Migration Summary ===');
    console.log('Local Database:', localConnection.db.databaseName);
    console.log('Cloud Database:', cloudConnection.db.databaseName);
    console.log('Collections Migrated:', collections.length);
    console.log('Backup Directory:', BACKUP_DIR);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close MongoDB connections
    if (localConnection) {await localConnection.close();}
    if (cloudConnection) {await cloudConnection.close();}
    rl.close();

    console.log('\nMigration process completed');
  }
}

// Run the migration
migrateToCloud();
