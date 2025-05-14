const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    stripeSubscriptionId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'past_due'],
        default: 'active'
    },
    currentPeriodEnd: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Subscription', subscriptionSchema); 