const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireCashier, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Create new sale
router.post('/', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { items, payment_method, payment_received, discount_amount = 0, payment_deadline } = req.body;
        const cashier_id = req.user.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        if (!payment_method) {
            return res.status(400).json({ error: 'Payment method is required' });
        }

        const db = new Database();

        // Get VAT rate from settings (before transaction)
        const vatSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['vat_rate'])
            || await db.get('SELECT value FROM settings WHERE key = ?', ['tax_rate']); // Fallback
        const vatRate = parseFloat(vatSetting?.value || 0) / 100;

        let subtotal = 0;
        const saleItems = [];

        // Validate items and calculate totals (before transaction)
        for (const item of items) {
            const { product_id, quantity } = item;

            if (!product_id || !quantity || quantity <= 0) {
                return res.status(400).json({ error: 'Invalid item data' });
            }

            // Get product details
            const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
            if (!product) {
                return res.status(400).json({ error: `Product with ID ${product_id} not found` });
            }

            // Check stock availability
            if (product.stock < quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}` });
            }

            const itemTotal = product.price * quantity;
            subtotal += itemTotal;

            saleItems.push({
                product_id,
                quantity,
                unit_price: product.price,
                total_price: itemTotal
            });
        }

        // Check for column existence for backward compatibility
        const hasVatAmount = await db.hasColumn('sales', 'vat_amount');
        const hasCustomerId = await db.hasColumn('sales', 'customer_id');
        const hasStatus = await db.hasColumn('sales', 'status');
        const hasAmountPaid = await db.hasColumn('sales', 'amount_paid');
        const hasPaymentDeadline = await db.hasColumn('sales', 'payment_deadline');
        const hasPaymentsTable = await db.hasTable('payments');

        // Calculate VAT and total
        const vat_amount = (subtotal - discount_amount) * vatRate;
        const total_amount = subtotal - discount_amount + vat_amount;

        // Handle payment and status
        const { customer_id, amount_paid: initial_paid } = req.body;
        const amount_paid = initial_paid ? parseFloat(initial_paid) : total_amount;
        const status = amount_paid < total_amount ? 'pending' : 'completed';

        // Calculate change (only if fully paid)
        const change_given = (status === 'completed' && payment_received) ? Math.max(0, payment_received - total_amount) : 0;

        // Use transaction for atomic operations
        try {
            // Check if using Turso
            const isUsingTurso = db.client !== undefined;

            if (isUsingTurso) {
                // Turso: Execute operations sequentially (each execute is atomic)
                // Construct dynamic insert for sales
                let salesColumns = ['cashier_id', 'total_amount', hasVatAmount ? 'vat_amount' : 'tax_amount', 'discount_amount', 'payment_method', 'payment_received', 'change_given'];
                let salesParams = [cashier_id, total_amount, vat_amount, discount_amount, payment_method, payment_received, change_given];

                if (hasCustomerId) {
                    salesColumns.push('customer_id');
                    salesParams.push(customer_id);
                }
                if (hasAmountPaid) {
                    salesColumns.push('amount_paid');
                    salesParams.push(amount_paid);
                }
                if (hasStatus) {
                    salesColumns.push('status');
                    salesParams.push(status);
                }
                if (hasPaymentDeadline && payment_deadline) {
                    salesColumns.push('payment_deadline');
                    salesParams.push(payment_deadline);
                }

                const placeholders = salesParams.map(() => '?').join(', ');
                const saleResult = await db.run(
                    `INSERT INTO sales (${salesColumns.join(', ')}) VALUES (${placeholders})`,
                    salesParams
                );

                const sale_id = saleResult.id;

                // Add initial payment to payments table if it exists
                if (hasPaymentsTable && amount_paid > 0) {
                    await db.run(
                        'INSERT INTO payments (sale_id, amount, payment_method, notes) VALUES (?, ?, ?, ?)',
                        [sale_id, amount_paid, payment_method, 'Initial payment']
                    );
                }

                // Insert sale items and update stock
                for (const item of saleItems) {
                    await db.run(
                        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                        [sale_id, item.product_id, item.quantity, item.unit_price, item.total_price]
                    );

                    await db.run(
                        'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [item.quantity, item.product_id]
                    );
                }

                // Get complete sale data for response
                const sale = await db.get(`
                    SELECT s.*, u.full_name as cashier_name, c.name as customer_name 
                    FROM sales s 
                    JOIN users u ON s.cashier_id = u.id 
                    LEFT JOIN customers c ON s.customer_id = c.id 
                    WHERE s.id = ?
                `, [sale_id]);

                const saleItemsWithProducts = await db.query(`
                    SELECT si.*, p.name as product_name, p.barcode 
                    FROM sale_items si 
                    JOIN products p ON si.product_id = p.id 
                    WHERE si.sale_id = ?
                `, [sale_id]);

                res.status(201).json({
                    sale,
                    items: saleItemsWithProducts,
                    receipt_data: {
                        subtotal,
                        discount_amount,
                        tax_amount: vat_amount,
                        total_amount,
                        payment_received,
                        change_given
                    }
                });
            } else {
                // Local SQLite: Use explicit transaction
                await db.run('BEGIN TRANSACTION');

                try {
                    // Construct dynamic insert for sales
                    let salesColumns = ['cashier_id', 'total_amount', hasVatAmount ? 'vat_amount' : 'tax_amount', 'discount_amount', 'payment_method', 'payment_received', 'change_given'];
                    let salesParams = [cashier_id, total_amount, vat_amount, discount_amount, payment_method, payment_received, change_given];

                    if (hasCustomerId) {
                        salesColumns.push('customer_id');
                        salesParams.push(customer_id);
                    }
                    if (hasAmountPaid) {
                        salesColumns.push('amount_paid');
                        salesParams.push(amount_paid);
                    }
                    if (hasStatus) {
                        salesColumns.push('status');
                        salesParams.push(status);
                    }
                    if (hasPaymentDeadline && payment_deadline) {
                        salesColumns.push('payment_deadline');
                        salesParams.push(payment_deadline);
                    }

                    const placeholders = salesParams.map(() => '?').join(', ');
                    const saleResult = await db.run(
                        `INSERT INTO sales (${salesColumns.join(', ')}) VALUES (${placeholders})`,
                        salesParams
                    );

                    const sale_id = saleResult.id;

                    // Add initial payment to payments table if it exists
                    if (hasPaymentsTable && amount_paid > 0) {
                        await db.run(
                            'INSERT INTO payments (sale_id, amount, payment_method, notes) VALUES (?, ?, ?, ?)',
                            [sale_id, amount_paid, payment_method, 'Initial payment']
                        );
                    }

                    // Insert sale items and update stock
                    for (const item of saleItems) {
                        await db.run(
                            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                            [sale_id, item.product_id, item.quantity, item.unit_price, item.total_price]
                        );

                        await db.run(
                            'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [item.quantity, item.product_id]
                        );
                    }

                    await db.run('COMMIT');

                    // Get complete sale data for response
                    const sale = await db.get(`
                        SELECT s.*, u.full_name as cashier_name, c.name as customer_name 
                        FROM sales s 
                        JOIN users u ON s.cashier_id = u.id 
                        LEFT JOIN customers c ON s.customer_id = c.id 
                        WHERE s.id = ?
                    `, [sale_id]);

                    const saleItemsWithProducts = await db.query(`
                        SELECT si.*, p.name as product_name, p.barcode 
                        FROM sale_items si 
                        JOIN products p ON si.product_id = p.id 
                        WHERE si.sale_id = ?
                    `, [sale_id]);

                    res.status(201).json({
                        sale,
                        items: saleItemsWithProducts,
                        receipt_data: {
                            subtotal,
                            discount_amount,
                            tax_amount: vat_amount,
                            total_amount,
                            payment_received,
                            change_given
                        }
                    });
                } catch (error) {
                    // Rollback transaction on error (local SQLite only)
                    await db.run('ROLLBACK');
                    throw error;
                }
            }
        } catch (error) {
            console.error('Create sale transaction error:', error);
            throw error;
        } finally {
            await db.close();
        }
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(400).json({ error: error.message || 'Internal server error' });
    }
});

// Get sales history
router.get('/', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { page = 1, limit = 20, start_date, end_date, cashier_id, customer_id } = req.query;
        const offset = (page - 1) * limit;
        const user = req.user;

        const db = new Database();
        let sql = `
            SELECT s.*, u.full_name as cashier_name,
                   (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count
            FROM sales s 
            JOIN users u ON s.cashier_id = u.id 
            WHERE 1=1
        `;
        let params = [];

        // Non-admin users can only see their own sales
        if (user.role !== 'admin') {
            sql += ' AND s.cashier_id = ?';
            params.push(user.id);
        } else if (cashier_id) {
            sql += ' AND s.cashier_id = ?';
            params.push(cashier_id);
        }

        if (customer_id) {
            sql += ' AND s.customer_id = ?';
            params.push(customer_id);
        }

        if (start_date) {
            sql += ' AND DATE(s.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND DATE(s.created_at) <= ?';
            params.push(end_date);
        }

        sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const sales = await db.query(sql, params);

        // Fetch items for each sale
        const salesWithItems = await Promise.all(sales.map(async (sale) => {
            const items = await db.query(`
                SELECT si.*, p.name as product_name, p.brand, p.tire_size
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            `, [sale.id]);
            return { ...sale, items };
        }));

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM sales s WHERE 1=1';
        let countParams = [];

        if (user.role !== 'admin') {
            countSql += ' AND s.cashier_id = ?';
            countParams.push(user.id);
        } else if (cashier_id) {
            countSql += ' AND s.cashier_id = ?';
            countParams.push(cashier_id);
        }

        if (customer_id) {
            countSql += ' AND s.customer_id = ?';
            countParams.push(customer_id);
        }

        if (start_date) {
            countSql += ' AND DATE(s.created_at) >= ?';
            countParams.push(start_date);
        }

        if (end_date) {
            countSql += ' AND DATE(s.created_at) <= ?';
            countParams.push(end_date);
        }

        const countResult = await db.get(countSql, countParams);
        const total = countResult.total;

        res.json({
            sales: salesWithItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sale details by ID
router.get('/:id', authenticateToken, requireCashier, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const db = new Database();

        // Get sale with cashier info
        let sql = `
            SELECT s.*, u.full_name as cashier_name 
            FROM sales s 
            JOIN users u ON s.cashier_id = u.id 
            WHERE s.id = ?
        `;
        let params = [id];

        // Non-admin users can only see their own sales
        if (user.role !== 'admin') {
            sql += ' AND s.cashier_id = ?';
            params.push(user.id);
        }

        const sale = await db.get(sql, params);

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Get sale items with product details
        const items = await db.query(`
            SELECT si.*, p.name as product_name, p.barcode 
            FROM sale_items si 
            JOIN products p ON si.product_id = p.id 
            WHERE si.sale_id = ?
        `, [id]);

        res.json({ sale, items });
    } catch (error) {
        console.error('Get sale details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sales summary/statistics (admin only)
router.get('/reports/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { start_date, end_date, cashier_id } = req.query;
        const db = new Database();

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (start_date) {
            whereClause += ' AND DATE(created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(created_at) <= ?';
            params.push(end_date);
        }

        if (cashier_id) {
            whereClause += ' AND cashier_id = ?';
            params.push(cashier_id);
        }

        // Check for column existence for backward compatibility
        const hasVatAmount = await db.hasColumn('sales', 'vat_amount');
        const taxColumn = hasVatAmount ? 'vat_amount' : 'tax_amount';

        // Get summary statistics (backward compatible with both tax_amount and vat_amount)
        const summary = await db.get(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                SUM(${taxColumn}) as total_tax,
                SUM(discount_amount) as total_discounts,
                AVG(total_amount) as average_sale
            FROM sales ${whereClause}
        `, params);

        // Get sales by payment method
        const paymentMethods = await db.query(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(total_amount) as total
            FROM sales ${whereClause}
            GROUP BY payment_method
        `, params);

        // Get top selling products
        const topProducts = await db.query(`
            SELECT 
                p.name,
                p.barcode,
                SUM(si.quantity) as total_sold,
                SUM(si.total_price) as total_revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            ${whereClause.replace('WHERE 1=1', 'WHERE 1=1')}
            GROUP BY p.id, p.name, p.barcode
            ORDER BY total_sold DESC
            LIMIT 10
        `, params);

        // Get daily sales (last 30 days or date range)
        const dailySales = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as sales_count,
                SUM(total_amount) as daily_revenue
            FROM sales ${whereClause}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        res.json({
            summary,
            payment_methods: paymentMethods,
            top_products: topProducts,
            daily_sales: dailySales
        });
    } catch (error) {
        console.error('Get sales summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sales reports by period (admin only)
router.get('/reports/:period', authenticateToken, requireAdmin, async (req, res) => {
    let db;
    try {
        const { period } = req.params;
        db = new Database();

        console.log(`Fetching reports for period: ${period}`);

        // Validate period
        if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
            return res.status(400).json({ error: 'Invalid period. Use: daily, weekly, monthly, or yearly' });
        }

        const { start_date, end_date } = req.query;
        let dateFilter = '';
        let params = [];

        if (start_date) {
            dateFilter += ' AND DATE(created_at) >= ?';
            params.push(start_date);
        }
        if (end_date) {
            dateFilter += ' AND DATE(created_at) <= ?';
            params.push(end_date);
        }

        // Check for column existence for backward compatibility
        const hasVatAmount = await db.hasColumn('sales', 'vat_amount');
        const taxColumn = hasVatAmount ? 'vat_amount' : 'tax_amount';

        // Get sales data grouped by period
        let salesData = [];
        try {
            if (period === 'daily') {
                salesData = await db.query(`
                    SELECT 
                        DATE(created_at) as period,
                        COUNT(*) as sales_count,
                        SUM(total_amount) as revenue,
                        SUM(${taxColumn}) as tax_collected,
                        SUM(discount_amount) as discounts_given,
                        AVG(total_amount) as avg_sale_amount
                    FROM sales
                    WHERE 1=1 ${dateFilter} 
                    GROUP BY DATE(created_at)
                    ORDER BY period DESC
                    LIMIT 50
                `, params);
            } else if (period === 'weekly') {
                salesData = await db.query(`
                    SELECT 
                        strftime('%Y-W%W', created_at) as period,
                        COUNT(*) as sales_count,
                        SUM(total_amount) as revenue,
                        SUM(${taxColumn}) as tax_collected,
                        SUM(discount_amount) as discounts_given,
                        AVG(total_amount) as avg_sale_amount
                    FROM sales
                    WHERE 1=1 ${dateFilter} 
                    GROUP BY strftime('%Y-W%W', created_at)
                    ORDER BY period DESC
                    LIMIT 50
                `, params);
            } else if (period === 'monthly') {
                salesData = await db.query(`
                    SELECT 
                        strftime('%Y-%m', created_at) as period,
                        COUNT(*) as sales_count,
                        SUM(total_amount) as revenue,
                        SUM(${taxColumn}) as tax_collected,
                        SUM(discount_amount) as discounts_given,
                        AVG(total_amount) as avg_sale_amount
                    FROM sales 
                    WHERE 1=1 ${dateFilter}
                    GROUP BY strftime('%Y-%m', created_at)
                    ORDER BY period DESC
                    LIMIT 50
                `, params);
            } else if (period === 'yearly') {
                salesData = await db.query(`
                    SELECT 
                        strftime('%Y', created_at) as period,
                        COUNT(*) as sales_count,
                        SUM(total_amount) as revenue,
                        SUM(${taxColumn}) as tax_collected,
                        SUM(discount_amount) as discounts_given,
                        AVG(total_amount) as avg_sale_amount
                    FROM sales 
                    WHERE 1=1 ${dateFilter}
                    GROUP BY strftime('%Y', created_at)
                    ORDER BY period DESC
                    LIMIT 50
                `, params);
            }
        } catch (queryError) {
            console.error('Sales data query error:', queryError);
            salesData = [];
        }

        console.log(`Sales data:`, salesData);

        // Get simple product performance
        let productPerformance = [];
        try {
            // First try to get from sale_items if they exist
            const saleItemsCount = await db.query('SELECT COUNT(*) as count FROM sale_items');
            if (saleItemsCount[0].count > 0) {
                productPerformance = await db.query(`
                    SELECT 
                        p.name,
                        p.sku,
                        p.brand,
                        SUM(si.quantity) as units_sold,
                        SUM(si.total_price) as revenue
                    FROM sale_items si
                    JOIN products p ON si.product_id = p.id
                    GROUP BY p.id, p.name, p.sku, p.brand
                    ORDER BY units_sold DESC
                    LIMIT 10
                `);
            } else {
                // Fallback: get top products by stock (most popular items)
                productPerformance = await db.query(`
                    SELECT 
                        name,
                        sku,
                        brand,
                        stock as units_sold,
                        (price * stock) as revenue
                    FROM products 
                    WHERE stock > 0
                    ORDER BY stock DESC
                    LIMIT 10
                `);
            }
        } catch (queryError) {
            console.error('Product performance query error:', queryError);
            productPerformance = [];
        }

        console.log(`Product performance:`, productPerformance);

        // Get payment method breakdown
        let paymentBreakdown = [];
        try {
            paymentBreakdown = await db.query(`
                SELECT 
                    payment_method,
                    COUNT(*) as transaction_count,
                    SUM(total_amount) as total_amount
                FROM sales 
                GROUP BY payment_method
                ORDER BY total_amount DESC
            `);
        } catch (queryError) {
            console.error('Payment breakdown query error:', queryError);
            paymentBreakdown = [];
        }

        console.log(`Payment breakdown:`, paymentBreakdown);

        const response = {
            period,
            sales_data: salesData,
            product_performance: productPerformance,
            payment_breakdown: paymentBreakdown,
            generated_at: new Date().toISOString()
        };

        console.log(`Sending response:`, response);
        res.json(response);
    } catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        // Close database connection
        if (db) {
            try {
                await db.close();
            } catch (closeError) {
                console.error('Error closing database:', closeError);
            }
        }
    }
});

// Test endpoint to verify database connection
router.get('/test', authenticateToken, requireAdmin, async (req, res) => {
    let db;
    try {
        db = new Database();
        const result = await db.query('SELECT COUNT(*) as count FROM sales');
        res.json({
            success: true,
            sales_count: result[0].count,
            message: 'Database connection working'
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (db) {
            try {
                await db.close();
            } catch (closeError) {
                console.error('Error closing database:', closeError);
            }
        }
    }
});

// Get pending sales (for dashboard)
router.get('/pending', authenticateToken, requireCashier, async (req, res) => {
    try {
        const db = new Database();
        const user = req.user;

        let sql = `
            SELECT s.*, u.full_name as cashier_name, c.name as customer_name, c.phone as customer_phone,
                   (s.total_amount - s.amount_paid) as balance_due,
                   s.created_at
            FROM sales s
            JOIN users u ON s.cashier_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.status = 'pending' AND (s.total_amount - s.amount_paid) > 0.01
        `;
        let params = [];

        // Non-admin users can only see their own pending sales
        if (user.role !== 'admin') {
            sql += ' AND s.cashier_id = ?';
            params.push(user.id);
        }

        sql += ' ORDER BY s.created_at DESC';

        const pendingSales = await db.query(sql, params);

        // Fetch items for each pending sale
        const salesWithItems = await Promise.all(pendingSales.map(async (sale) => {
            const items = await db.query(`
                SELECT si.*, p.name as product_name, p.brand, p.tire_size
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            `, [sale.id]);
            return { ...sale, items };
        }));

        res.json(salesWithItems);
    } catch (error) {
        console.error('Get pending sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get product history (who bought it, when, how many)
router.get('/product/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = new Database();

        const history = await db.query(`
            SELECT 
                si.quantity,
                si.unit_price,
                s.created_at,
                u.full_name as cashier_name,
                c.name as customer_name
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN users u ON s.cashier_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE si.product_id = ?
            ORDER BY s.created_at DESC
        `, [id]);

        res.json(history);
    } catch (error) {
        console.error('Get product history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
