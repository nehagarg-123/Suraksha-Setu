// Script to check MongoDB connection and verify data
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection string (same as db.js)
const MONGODB_URI = 
  process.env.MONGODB_URI || 
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/suraksha_setu';

async function checkMongoDB() {
  try {
    console.log('🔍 Checking MongoDB Connection...\n');
    console.log('   Connection URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    
    // Connect if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log('⏳ Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI);
    } else if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
    } else {
      // Connecting state, wait for it
      console.log('⏳ Waiting for connection...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);
        
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    // Wait a bit more for db to be available
    let retries = 0;
    while (!mongoose.connection.db && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!mongoose.connection.db) {
      throw new Error('Database object not available. Connection may not be fully established.');
    }

    console.log('✅ MongoDB Connected!');
    console.log('   Database Name:', mongoose.connection.name || 'Not set');
    console.log('   Host:', mongoose.connection.host || 'Not set');
    console.log('   Port:', mongoose.connection.port || 'Not set');
    console.log('   Ready State:', mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Not Connected ❌');
    
    // Get database name from connection string if not available
    const dbName = mongoose.connection.name || mongoose.connection.db?.databaseName || 'unknown';
    console.log('   Active Database:', dbName);
    
    // List all databases
    try {
      const adminDb = mongoose.connection.db.admin();
      const { databases } = await adminDb.listDatabases();
      console.log('\n📚 Available Databases:');
      databases.forEach(db => {
        const marker = db.name === dbName ? '✅' : '  ';
        console.log(`   ${marker} ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      });
    } catch (err) {
      console.log('\n⚠️  Could not list all databases (permission issue or local setup)');
    }

    // List collections in current database
    console.log('\n📁 Collections in current database:');
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      if (collections.length === 0) {
        console.log('   ⚠️  No collections found yet');
        console.log('   💡 Collections will be created automatically when you save data');
      } else {
        for (const col of collections) {
          const count = await mongoose.connection.db.collection(col.name).countDocuments();
          console.log(`   - ${col.name}: ${count} document(s)`);
        }
      }
    } catch (err) {
      console.log('   ❌ Error listing collections:', err.message);
    }

    // Check specific collections
    console.log('\n🔍 Checking specific collections:');
    const collectionNames = ['users', 'incidents', 'alerts'];
    for (const colName of collectionNames) {
      try {
        const collection = mongoose.connection.db.collection(colName);
        const count = await collection.countDocuments();
        if (count > 0) {
          const sample = await collection.findOne();
          console.log(`   ✅ ${colName}: ${count} document(s) - Sample ID: ${sample._id}`);
        } else {
          console.log(`   ⚠️  ${colName}: 0 documents (empty)`);
        }
      } catch (err) {
        console.log(`   ❌ ${colName}: Collection doesn't exist yet`);
      }
    }

    console.log('\n💡 To view all data, run: npm run view-data');
    console.log('💡 Collections are created automatically when you save your first document\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
      console.error('💡 MongoDB is not running. Please start MongoDB first.');
      console.error('   Windows: Check if MongoDB service is running');
      console.error('   Or run: mongod');
    } else if (err.message.includes('authentication')) {
      console.error('💡 Authentication failed. Check your MongoDB credentials.');
    } else {
      console.error('💡 Full error:', err);
    }
    process.exit(1);
  }
}

checkMongoDB();