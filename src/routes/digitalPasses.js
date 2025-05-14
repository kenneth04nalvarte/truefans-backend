const express = require('express');
const router = express.Router();
const DigitalPass = require('../models/DigitalPass');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Generate a digital pass
router.post('/generate', async (req, res) => {
    try {
        const { userId, restaurantId } = req.body;
        
        // Check if user and restaurant exist
        const user = await User.findById(userId);
        const restaurant = await Restaurant.findById(restaurantId);
        
        if (!user || !restaurant) {
            return res.status(404).json({ message: 'User or restaurant not found' });
        }

        // Generate unique pass ID
        const passId = crypto.randomBytes(16).toString('hex');

        // Create digital pass
        const digitalPass = new DigitalPass({
            user: userId,
            restaurant: restaurantId,
            passId
        });

        await digitalPass.save();

        // Generate pass data for wallet
        const passData = {
            passId,
            restaurantName: restaurant.name,
            restaurantLogo: restaurant.digitalWallet.logo,
            primaryColor: restaurant.digitalWallet.primaryColor,
            secondaryColor: restaurant.digitalWallet.secondaryColor,
            customMessage: restaurant.digitalWallet.customMessage,
            user: {
                name: `${user.firstName} ${user.lastName}`,
                email: user.email
            },
            createdAt: digitalPass.createdAt,
            expiresAt: digitalPass.expiresAt
        };

        // Send email with pass data
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Your Digital Pass for ${restaurant.name}`,
            html: `
                <h1>Welcome to ${restaurant.name}'s Loyalty Program!</h1>
                <p>Here's your digital pass:</p>
                <div style="background-color: ${restaurant.digitalWallet.cardBackground}; 
                           color: ${restaurant.digitalWallet.cardTextColor};
                           padding: 20px;
                           border-radius: 10px;
                           text-align: center;">
                    <img src="${restaurant.digitalWallet.logo}" alt="Restaurant Logo" style="max-width: 200px;">
                    <h2>${restaurant.name}</h2>
                    <p>${restaurant.digitalWallet.customMessage}</p>
                    <p>Pass ID: ${passId}</p>
                    <p>Valid until: ${new Date(digitalPass.expiresAt).toLocaleDateString()}</p>
                </div>
                <p>To add this pass to your digital wallet, click the button below:</p>
                <a href="${process.env.APP_URL}/add-to-wallet/${passId}" 
                   style="background-color: ${restaurant.digitalWallet.primaryColor}; 
                          color: white; 
                          padding: 10px 20px; 
                          text-decoration: none; 
                          border-radius: 5px;">
                    Add to Wallet
                </a>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({
            message: 'Digital pass created and email sent successfully',
            passData
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get pass details
router.get('/:passId', async (req, res) => {
    try {
        const pass = await DigitalPass.findOne({ passId: req.params.passId })
            .populate('user')
            .populate('restaurant');

        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        res.json(pass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update pass status (e.g., when visiting)
router.put('/:passId/visit', async (req, res) => {
    try {
        const pass = await DigitalPass.findOne({ passId: req.params.passId });

        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        pass.visits += 1;
        pass.lastVisit = new Date();
        await pass.save();

        res.json({ message: 'Visit recorded successfully', pass });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Generate wallet pass file
router.get('/:passId/wallet', async (req, res) => {
    try {
        const pass = await DigitalPass.findOne({ passId: req.params.passId })
            .populate('restaurant');

        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        // Generate pass file based on platform (iOS/Android)
        const platform = req.query.platform || 'ios';
        const passFile = generatePassFile(pass, platform);

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename="pass.pkpass"`);
        res.send(passFile);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Helper function to generate pass file
function generatePassFile(pass, platform) {
    // This is a simplified version. In a real implementation, you would:
    // 1. Use a proper pass generation library
    // 2. Include proper signing and certificates
    // 3. Handle different platforms appropriately
    const passData = {
        formatVersion: 1,
        passTypeIdentifier: 'pass.com.restaurant.loyalty',
        serialNumber: pass.passId,
        teamIdentifier: process.env.APPLE_TEAM_ID,
        organizationName: pass.restaurant.name,
        description: 'Restaurant Loyalty Pass',
        logoText: pass.restaurant.name,
        foregroundColor: pass.restaurant.digitalWallet.cardTextColor,
        backgroundColor: pass.restaurant.digitalWallet.cardBackground,
        labelColor: pass.restaurant.digitalWallet.secondaryColor,
        barcode: {
            message: pass.passId,
            format: 'PKBarcodeFormatQR',
            messageEncoding: 'iso-8859-1'
        },
        storeCard: {
            primaryFields: [
                {
                    key: 'points',
                    label: 'Visits',
                    value: pass.visits
                }
            ],
            secondaryFields: [
                {
                    key: 'lastVisit',
                    label: 'Last Visit',
                    value: pass.lastVisit ? new Date(pass.lastVisit).toLocaleDateString() : 'Never'
                }
            ]
        }
    };

    return JSON.stringify(passData);
}

module.exports = router; 