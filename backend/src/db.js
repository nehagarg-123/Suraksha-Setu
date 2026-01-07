import mongoose from 'mongoose';
// dotenv.config() is called in app.js before this file is imported

// MongoDB connection string
const MONGODB_URI = 
  process.env.MONGODB_URI || 
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/suraksha_setu';

// Connection options
const options = {
  // Remove deprecated options - mongoose 8.x handles these automatically
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('   Database:', mongoose.connection.name);
    console.log('   Connection URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    console.log('   Collections will be created automatically when data is saved');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Please ensure MongoDB is running and the connection string is correct');
  });

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

export default mongoose;