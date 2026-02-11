const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireAdmin, requireCashier } = require('../middleware/auth');

const router = express.Router();

// Get all products (with optional search and pagination)
router.get('/', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { search, category, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const db = new Database();
        let sql = 'SELECT * FROM products WHERE 1=1';
        let params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR category LIKE ? OR brand LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const products = await db.query(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        let countParams = [];
        if (search) {
            countSql += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR category LIKE ? OR brand LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            countSql += ' AND category = ?';
            countParams.push(category);
        }

        const countResult = await db.get(countSql, countParams);
        const total = countResult.total;

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get product by barcode
router.get('/barcode/:barcode', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { barcode } = req.params;
        const db = new Database();

        const product = await db.get('SELECT * FROM products WHERE barcode = ?', [barcode]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Get product by barcode error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get product by ID
router.get('/:id', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { id } = req.params;
        const db = new Database();

        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, sku, barcode, price, cost, stock = 0, category, description, min_stock = 5, brand, tire_size } = req.body;

        if (!name || !price || !sku) {
            return res.status(400).json({ error: 'Name, price, and SKU are required' });
        }

        if (price < 0) {
            return res.status(400).json({ error: 'Price cannot be negative' });
        }

        if (stock < 0) {
            return res.status(400).json({ error: 'Stock cannot be negative' });
        }

        if (cost !== undefined && cost < 0) {
            return res.status(400).json({ error: 'Cost cannot be negative' });
        }

        if (min_stock < 0) {
            return res.status(400).json({ error: 'Minimum stock cannot be negative' });
        }

        const db = new Database();

        // Check if SKU already exists
        if (sku) {
            const existingProduct = await db.get('SELECT id FROM products WHERE sku = ?', [sku]);
            if (existingProduct) {
                return res.status(400).json({ error: 'SKU already exists' });
            }
        }

        // Check if barcode already exists
        if (barcode) {
            const existingProduct = await db.get('SELECT id FROM products WHERE barcode = ?', [barcode]);
            if (existingProduct) {
                return res.status(400).json({ error: 'Barcode already exists' });
            }
        }

        const result = await db.run(
            'INSERT INTO products (name, sku, barcode, price, cost, stock, category, description, min_stock, brand, tire_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, sku, barcode, parseFloat(price), cost ? parseFloat(cost) : null, parseInt(stock), category, description, parseInt(min_stock), brand, tire_size]
        );

        if (!result.id) {
            throw new Error('Failed to retrieve new product ID');
        }

        const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [result.id]);
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, barcode, price, cost, stock, category, description, min_stock, brand, tire_size } = req.body;

        const db = new Database();

        // Check if product exists
        const existingProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if SKU already exists (excluding current product)
        if (sku && sku !== existingProduct.sku) {
            const skuExists = await db.get('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, id]);
            if (skuExists) {
                return res.status(400).json({ error: 'SKU already exists' });
            }
        }

        // Check if barcode already exists (excluding current product)
        if (barcode && barcode !== existingProduct.barcode) {
            const barcodeExists = await db.get('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode, id]);
            if (barcodeExists) {
                return res.status(400).json({ error: 'Barcode already exists' });
            }
        }

        // Validate inputs
        if (price !== undefined && price < 0) {
            return res.status(400).json({ error: 'Price cannot be negative' });
        }

        if (stock !== undefined && stock < 0) {
            return res.status(400).json({ error: 'Stock cannot be negative' });
        }

        if (cost !== undefined && cost < 0) {
            return res.status(400).json({ error: 'Cost cannot be negative' });
        }

        if (min_stock !== undefined && min_stock < 0) {
            return res.status(400).json({ error: 'Minimum stock cannot be negative' });
        }

        // Update product
        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (sku !== undefined) {
            updates.push('sku = ?');
            params.push(sku);
        }
        if (barcode !== undefined) {
            updates.push('barcode = ?');
            params.push(barcode);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            params.push(parseFloat(price));
        }
        if (cost !== undefined) {
            updates.push('cost = ?');
            params.push(cost ? parseFloat(cost) : null);
        }
        if (stock !== undefined) {
            updates.push('stock = ?');
            params.push(parseInt(stock));
        }
        if (category !== undefined) {
            updates.push('category = ?');
            params.push(category);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (min_stock !== undefined) {
            updates.push('min_stock = ?');
            params.push(parseInt(min_stock));
        }
        if (brand !== undefined) {
            updates.push('brand = ?');
            params.push(brand);
        }
        if (tire_size !== undefined) {
            updates.push('tire_size = ?');
            params.push(tire_size);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await db.run(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        res.json(updatedProduct);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = new Database();

        // Check if product exists
        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if product is used in any sales
        const salesCount = await db.get('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?', [id]);
        if (salesCount.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete product that has been sold. Consider setting stock to 0 instead.'
            });
        }

        await db.run('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update stock (for internal use during sales)
router.patch('/:id/stock', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined) {
            return res.status(400).json({ error: 'Quantity is required' });
        }

        const db = new Database();
        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const newStock = product.stock + parseInt(quantity);
        if (newStock < 0) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        await db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStock, id]);

        const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        res.json(updatedProduct);
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk import products (admin only)
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'Products array is required' });
        }

        const db = new Database();
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const product of products) {
            try {
                const { name, sku, barcode, price, cost, stock = 0, category, description, min_stock = 5, brand, tire_size } = product;

                if (!name || !price || !sku) {
                    results.failed++;
                    results.errors.push({ name: name || 'Unknown', error: 'Name, price, and SKU are required' });
                    continue;
                }

                await db.run(
                    'INSERT INTO products (name, sku, barcode, price, cost, stock, category, description, min_stock, brand, tire_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [name, sku, barcode, parseFloat(price), cost ? parseFloat(cost) : null, parseInt(stock), category, description, parseInt(min_stock), brand, tire_size]
                );
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ name: product.name || 'Unknown', error: err.message });
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
