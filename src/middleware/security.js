const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply security middleware
const securityMiddleware = (app) => {
    // Enable CORS with a more permissive configuration
    app.use(cors({
        origin: function (origin, callback) {
            const allowed = [
                'https://truefans.vercel.app',
                'http://localhost:3000'
            ];
            // Allow all Vercel preview URLs
            const vercelPreview = /^https:\/\/truefans-frontend.*\.vercel\.app$/;
            if (!origin || allowed.includes(origin) || vercelPreview.test(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
    }));

    // Set security HTTP headers with less restrictive configuration
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "unsafe-none" }
    }));

    // Data sanitization against XSS
    app.use(xss());

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // Rate limiting
    app.use('/api/', limiter);
};

module.exports = securityMiddleware; 