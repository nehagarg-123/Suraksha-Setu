// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
const result = dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (result.error) {
  console.warn('⚠️ Warning: Could not load .env file:', result.error.message);
  console.warn('💡 Make sure .env file exists in the backend/ directory');
} else {
  console.log('✅ Environment variables loaded from .env file');
}

// Log SMTP configuration status at startup
console.log('📧 SMTP Configuration Check:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('   SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
console.log('   Email Enabled:', Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import bodyParser from 'body-parser';
import cors from 'cors';

// Import MongoDB connection (now env vars are loaded)
import './db.js';

import authRouter from './routes/auth.js';
import incidentsRouter from './routes/incidents.js';
import earlyWarningsRouter from './routes/earlyWarnings.js';
import sheltersRouter from './routes/shelters.js';
import resourcesRouter from './routes/resources.js';
import volunteersRouter from './routes/volunteers.js';
import hazardZonesRouter from './routes/hazardZones.js';
import damageReportsRouter from './routes/damageReports.js';
import reliefDistributionRouter from './routes/reliefDistribution.js';
import compensationClaimsRouter from './routes/compensationClaims.js';
import feedbackRouter from './routes/feedback.js';
import respondersRouter from './routes/responders.js';
import alertsRouter from './routes/alerts.js';
import reportsRouter from './routes/reports.js';

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Health-check
app.get('/', (req, res) => {
  res.send({ status: 'backend running' });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/early-warnings', earlyWarningsRouter);
app.use('/api/shelters', sheltersRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/volunteers', volunteersRouter);
app.use('/api/hazard-zones', hazardZonesRouter);
app.use('/api/damage-reports', damageReportsRouter);
app.use('/api/relief-distribution', reliefDistributionRouter);
app.use('/api/compensation-claims', compensationClaimsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/responders', respondersRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);

// Create HTTP server & Socket.IO instance
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
});

// Attach IO instance to app so routes can emit events
app.set('io', io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log('✅ Backend listening on port', PORT);
  console.log('✅ Health check: http://localhost:' + PORT);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Port', PORT, 'is already in use!');
    console.error('💡 Solutions:');
    console.error('   1. Kill the process using port', PORT + ':');
    console.error('      Windows: netstat -ano | findstr :' + PORT);
    console.error('      Then: taskkill /PID <PID> /F');
    console.error('   2. Or change the port in .env: PORT=4001');
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});