const mongoose = require('mongoose');

const digitalPassSchema = new mongoose.Schema({
    passId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    passNinjaId: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    visits: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from creation
    }
});

// Index for faster queries
digitalPassSchema.index({ userId: 1, restaurantId: 1 });
digitalPassSchema.index({ passId: 1 });
digitalPassSchema.index({ passNinjaId: 1 });

const DigitalPass = mongoose.model('DigitalPass', digitalPassSchema);

module.exports = DigitalPass; 