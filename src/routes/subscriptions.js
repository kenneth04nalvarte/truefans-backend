const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');

// Create subscription
router.post('/create', async (req, res) => {
    try {
        const { restaurantId, paymentMethodId } = req.body;
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Create Stripe customer if not exists
        let customer;
        if (!restaurant.stripeCustomerId) {
            customer = await stripe.customers.create({
                payment_method: paymentMethodId,
                email: req.body.email,
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            restaurant.stripeCustomerId = customer.id;
            await restaurant.save();
        } else {
            customer = await stripe.customers.retrieve(restaurant.stripeCustomerId);
        }

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: process.env.STRIPE_PRICE_ID }], // $15/month price ID
            expand: ['latest_invoice.payment_intent'],
        });

        // Save subscription to database
        const newSubscription = new Subscription({
            restaurant: restaurantId,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
        await newSubscription.save();

        // Update restaurant subscription status
        restaurant.subscriptionStatus = 'active';
        await restaurant.save();

        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            status: subscription.status
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update subscription
router.put('/:id', async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const stripeSubscription = await stripe.subscriptions.update(
            subscription.stripeSubscriptionId,
            { cancel_at_period_end: req.body.cancel }
        );

        subscription.status = stripeSubscription.status;
        await subscription.save();

        res.json({ message: 'Subscription updated successfully', subscription });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get subscription status
router.get('/:id', async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId
        );

        res.json({
            status: stripeSubscription.status,
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 