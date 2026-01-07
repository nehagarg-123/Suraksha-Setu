// Script to check database connection and list databases
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Connect to PostgreSQL (without specifying a database) to list all databases
const adminPool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: 'postgres', // Connect to default postgres database to list others
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking PostgreSQL connection...');
    console.log('   Host:', process.env.DATABASE_HOST || 'localhost');
    console.log('   Port:', process.env.DATABASE_PORT || 5432);
    console.log('   User:', process.env.DATABASE_USER || 'postgres');
    console.log('');

    // Test connection
    await adminPool.query('SELECT NOW()');
    console.log('✅ Successfully connected to PostgreSQL\n');

    // List all databases
    const result = await adminPool.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname;
    `);

    console.log('📋 Available databases:');
    console.log('─'.repeat(50));
    result.rows.forEach((row, index) => {
      const marker = row.datname === 'Surkasha Setu' ? '✅' : '  ';
      console.log(`${marker} ${index + 1}. "${row.datname}"`);
    });
    console.log('─'.repeat(50));
    console.log('');

    // Check if target database exists
    const targetDb = process.env.DATABASE_NAME || 'Surkasha Setu';
    const exists = result.rows.some(row => row.datname === targetDb);

    if (exists) {
      console.log(`✅ Database "${targetDb}" exists!`);
      
      // Try to connect to it
      const dbPool = new Pool({
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 5432,
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: targetDb,
      });

      try {
        await dbPool.query('SELECT NOW()');
        console.log(`✅ Successfully connected to database "${targetDb}"`);
        
        // Check if tables exist
        const tables = await dbPool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `);
        
        if (tables.rows.length > 0) {
          console.log('\n📊 Tables in database:');
          tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
          });
        } else {
          console.log('\n⚠️  No tables found. Run: npm run init-db');
        }
        
        await dbPool.end();
      } catch (err) {
        console.error(`❌ Cannot connect to database "${targetDb}":`, err.message);
      }
    } else {
      console.log(`❌ Database "${targetDb}" NOT FOUND!`);
      console.log('\n💡 To create it, run in psql:');
      console.log(`   CREATE DATABASE "Surkasha Setu";`);
      console.log('\n   Or use pgAdmin to create it.');
    }

    await adminPool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code === '28P01') {
      console.error('\n💡 Password authentication failed!');
      console.error('   Please check your PostgreSQL password.');
      console.error('   Create backend/.env file with correct credentials.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Cannot connect to PostgreSQL!');
      console.error('   Please ensure PostgreSQL is running.');
    }
    process.exit(1);
  }
}

checkDatabase();