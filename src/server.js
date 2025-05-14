const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const securityMiddleware = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const admin = require('firebase-admin');
const mongoose = require('mongoose');

// Load environment variables
console.log('Server starting...');
dotenv.config();
console.log('Environment variables loaded');

// Initialize Firebase Admin only if credentials are available
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
        console.log('Firebase Admin initialized');
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const app = express();

// Apply security middleware (includes CORS)
securityMiddleware(app);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/users', require('./routes/users'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/digital-passes', require('./routes/digitalPass'));

// Health check endpoint with explicit CORS handling
app.options('/api/health', cors()); // Enable pre-flight for health check
app.get('/api/health', (req, res) => {
    // Log the request for debugging
    console.log('Health check requested from:', req.get('origin'));
    console.log('Request headers:', req.headers);

    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

    // Send response
    res.status(200).json({ 
        status: 'ok',
        message: 'Backend is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root route for API
app.get('/', (req, res) => {
    res.send('Minimal server is running!');
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });
}

// Test MongoDB connection
app.get('/test-mongo', async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connection successful!');
    res.send('MongoDB connection successful!');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    res.status(500).send('MongoDB connection failed: ' + err.message);
  }
});

// Error handling middleware (should be last)
app.use(errorHandler);

// For Vercel serverless deployment, export the app instead of listening
module.exports = app;