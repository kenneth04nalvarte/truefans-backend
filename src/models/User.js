const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'restaurant_owner', 'admin'],
        default: 'user'
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
    },
    phone: {
        type: String,
        required: true
    },
    birthday: {
        type: Date,
        required: true
    },
    referralSource: {
        type: String,
        required: true
    },
    walletPassId: {
        type: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    lastNotification: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Create geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', userSchema);

module.exports = User; 