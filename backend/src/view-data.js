// Script to view all data in MongoDB
import mongoose from './db.js';
import User from './models/User.js';
import Incident from './models/Incident.js';
import Alert from './models/Alert.js';
import dotenv from 'dotenv';

dotenv.config();

async function viewData() {
  try {
    // Wait for connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
        setTimeout(() => {
          console.log('⏳ Waiting for MongoDB connection...');
        }, 1000);
      });
    }

    console.log('\n📊 MongoDB Data Viewer');
    console.log('═'.repeat(60));
    console.log('Database:', mongoose.connection.name);
    console.log('═'.repeat(60));

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    collections.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.name}`);
    });

    // View Users
    console.log('\n👥 USERS:');
    console.log('─'.repeat(60));
    const users = await User.find().lean();
    if (users.length === 0) {
      console.log('   No users found');
    } else {
      users.forEach((user, index) => {
        console.log(`\n   User ${index + 1}:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Name: ${user.name || 'N/A'}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Phone: ${user.phone || 'N/A'}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Created: ${user.created_at}`);
      });
      console.log(`\n   Total: ${users.length} user(s)`);
    }

    // View Incidents
    console.log('\n\n🚨 INCIDENTS:');
    console.log('─'.repeat(60));
    const incidents = await Incident.find().populate('reported_by', 'name email').lean();
    if (incidents.length === 0) {
      console.log('   No incidents found');
    } else {
      incidents.forEach((incident, index) => {
        console.log(`\n   Incident ${index + 1}:`);
        console.log(`   - ID: ${incident._id}`);
        console.log(`   - Type: ${incident.type || 'N/A'}`);
        console.log(`   - Severity: ${incident.severity || 'N/A'}`);
        console.log(`   - Description: ${incident.description || 'N/A'}`);
        console.log(`   - Risk Level: ${incident.risk_level}`);
        console.log(`   - Risk Score: ${incident.risk_score}`);
        console.log(`   - Location: ${incident.latitude || 'N/A'}, ${incident.longitude || 'N/A'}`);
        console.log(`   - Reported by: ${incident.reported_by ? (incident.reported_by.name || incident.reported_by.email) : 'N/A'}`);
        console.log(`   - Created: ${incident.created_at}`);
      });
      console.log(`\n   Total: ${incidents.length} incident(s)`);
    }

    // View Alerts
    console.log('\n\n⚠️  ALERTS:');
    console.log('─'.repeat(60));
    const alerts = await Alert.find().lean();
    if (alerts.length === 0) {
      console.log('   No alerts found');
    } else {
      alerts.forEach((alert, index) => {
        console.log(`\n   Alert ${index + 1}:`);
        console.log(`   - ID: ${alert._id}`);
        console.log(`   - Level: ${alert.level}`);
        console.log(`   - Message: ${alert.message}`);
        console.log(`   - Created: ${alert.created_at}`);
      });
      console.log(`\n   Total: ${alerts.length} alert(s)`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Data view complete\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error viewing data:', err.message);
    console.error(err);
    process.exit(1);
  }
}

viewData();