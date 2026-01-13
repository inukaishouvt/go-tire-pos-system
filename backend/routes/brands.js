const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireCashier } = require('../middleware/auth');

const router = express.Router();

// Get all brands
router.get('/', authenticateToken, requireCashier, async (req, res) => {
    try {
        const db = new Database();

        // Get unique brands from products table
        const brands = await db.query(
            `SELECT DISTINCT brand FROM products 
             WHERE brand IS NOT NULL AND brand != '' 
             ORDER BY brand`
        );

        // Extract brand names into array
        const brandList = brands.map(b => b.brand);

        res.json(brandList);
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new brand (implicitly by creating/updating product)
// This endpoint is for validation purposes
router.post('/', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { brand } = req.body;

        if (!brand || brand.trim() === '') {
            return res.status(400).json({ error: 'Brand name is required' });
        }

        const db = new Database();

        // Check if brand already exists
        const existing = await db.get(
            'SELECT brand FROM products WHERE brand = ? LIMIT 1',
            [brand.trim()]
        );

        if (existing) {
            return res.json({
                success: true,
                brand: brand.trim(),
                message: 'Brand already exists'
            });
        }

        // Brand will be added when product is created
        res.json({
            success: true,
            brand: brand.trim(),
            message: 'Brand validated and ready to use'
        });
    } catch (error) {
        console.error('Add brand error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
