const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    qrCode: {
        type: String,
        required: true
    },
    digitalWallet: {
        logo: String,
        primaryColor: String,
        secondaryColor: String,
        cardBackground: String,
        cardTextColor: String,
        customMessage: String
    },
    currentPromotion: {
        title: String,
        description: String,
        discount: Number,
        validUntil: Date
    },
    stripeAccountId: {
        type: String
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'trial'],
        default: 'trial'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create geospatial index for location-based queries
restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema); 