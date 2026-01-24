const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Bulk import products (CSV/JSON)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'Products array is required' });
        }

        const db = new Database();
        const results = {
            success: [],
            failed: []
        };

        for (const product of products) {
            try {
                const { name, sku, barcode, price, cost, stock, category, brand, tire_size, description, min_stock } = product;

                // Validate required fields
                if (!name || !sku || price === undefined || stock === undefined) {
                    results.failed.push({
                        product,
                        error: 'Missing required fields (name, sku, price, stock)'
                    });
                    continue;
                }

                // Check if SKU already exists
                const existing = await db.get('SELECT id FROM products WHERE sku = ?', [sku]);
                if (existing) {
                    results.failed.push({
                        product,
                        error: `SKU ${sku} already exists`
                    });
                    continue;
                }

                // Insert product
                await db.run(
                    `INSERT INTO products (name, sku, barcode, price, cost, stock, category, brand, tire_size, description, min_stock) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, sku, barcode || null, price, cost || 0, stock, category || null, brand || null, tire_size || null, description || null, min_stock || 0]
                );

                results.success.push({ name, sku });
            } catch (error) {
                results.failed.push({
                    product,
                    error: error.message
                });
            }
        }

        res.json({
            message: `Import completed: ${results.success.length} successful, ${results.failed.length} failed`,
            results
        });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
