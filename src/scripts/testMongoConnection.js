/**
 * MongoDB Connection Test Script
 *
 * This script tests connections to both local and cloud MongoDB instances
 * and displays detailed information about the connections.
 *
 * Usage:
 *   node src/scripts/testMongoConnection.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connection strings
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/lomu';
const CLOUD_MONGODB_URI = process.env.MONGODB_URI;

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
};

/**
 * Connect to MongoDB and show connection details
 * @param {string} uri - MongoDB connection URI
 * @param {string} name - Connection name for logging
 */
async function testConnection(uri, name) {
  console.log(`\n🧪 Testing ${name} MongoDB connection...`);
  console.log(`URI: ${uri.replace(/:[^:\/]+@/, ':****@')}`); // Hide password in logs

  try {
    const connection = await mongoose.createConnection(uri, mongoOptions);
    console.log(`✅ Connected to ${name} MongoDB successfully!`);

    // Get database details
    const dbName = connection.db.databaseName;
    console.log(`📊 Database: ${dbName}`);

    // Get database stats
    const stats = await connection.db.stats();
    console.log(`📈 Stats: ${JSON.stringify(stats, null, 2)}`);

    // List collections
    const collections = await connection.db.listCollections().toArray();
    console.log(`📚 Collections (${collections.length}):`);

    if (collections.length > 0) {
      for (const collection of collections) {
        try {
          const count = await connection.db.collection(collection.name).countDocuments();
          console.log(`   - ${collection.name}: ${count} documents`);
        } catch (error) {
          console.log(`   - ${collection.name}: Error counting documents: ${error.message}`);
        }
      }
    } else {
      console.log('   No collections found');
    }

    // Close connection
    await connection.close();
    console.log(`✅ ${name} MongoDB connection closed successfully`);

    return true;
  } catch (error) {
    console.error(`❌ ${name} MongoDB connection failed:`);
    console.error(`   Error type: ${error.name}`);
    console.error(`   Message: ${error.message}`);

    // More detailed error diagnostics
    if (uri.includes('mongodb+srv')) {
      console.error('Cloud connection error details:');
      if (error.name === 'MongoServerSelectionError') {
        console.error('  - Server selection timeout - check your network, VPN settings, or MongoDB Atlas status');
      } else if (error.message.includes('authentication failed')) {
        console.error('  - Authentication failed - check your username and password in the connection string');
      } else if (error.message.includes('timed out')) {
        console.error('  - Connection timed out - check your network or firewall settings');
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('  - DNS lookup failed - check your MongoDB host/cluster URL');
      }
    } else {
      console.error('Local connection error details:');
      if (error.name === 'MongoNetworkError') {
        console.error('  - Network error - make sure MongoDB is running locally');
        console.error('  - Run: sudo systemctl status mongodb');
      }
    }

    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== MongoDB Connection Test ===');

  let localSuccess = false;
  let cloudSuccess = false;

  try {
    // Test local connection
    localSuccess = await testConnection(LOCAL_MONGODB_URI, 'Local');

    // Test cloud connection if MONGODB_URI is set
    if (CLOUD_MONGODB_URI) {
      cloudSuccess = await testConnection(CLOUD_MONGODB_URI, 'Cloud');
    } else {
      console.error('❌ Cloud MongoDB URI is not set in .env file');
    }

    // Summary
    console.log('\n=== Connection Test Summary ===');
    console.log(`Local MongoDB: ${localSuccess ? '✅ Connected' : '❌ Failed'}`);
    console.log(`Cloud MongoDB: ${cloudSuccess ? '✅ Connected' : '❌ Failed'}`);

    // Provide next steps based on results
    console.log('\n=== Next Steps ===');

    if (localSuccess && cloudSuccess) {
      console.log('✅ Both connections successful! You can proceed with data migration.');
      console.log('   Run: node src/scripts/migrateToCloud.js');
    } else if (!localSuccess && cloudSuccess) {
      console.log('⚠️ Local MongoDB connection failed but cloud connection successful.');
      console.log('   Make sure your local MongoDB service is running:');
      console.log('   Run: sudo systemctl start mongodb');
    } else if (localSuccess && !cloudSuccess) {
      console.log('⚠️ Cloud MongoDB connection failed but local connection successful.');
      console.log('   Check your cloud MongoDB connection string in .env file.');
    } else {
      console.log('❌ Both connections failed. Please resolve connection issues before proceeding.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    // Exit process
    process.exit(0);
  }
}

// Run the main function
main();
