const Database = require('./db');

async function migrate() {
    const db = new Database();

    try {
        console.log('🔄 Starting database migration...');

        // Check if we're connected
        const testQuery = await db.get('SELECT 1 as test');
        if (!testQuery) {
            throw new Error('Database connection failed');
        }
        console.log('✅ Database connected');

        // 1. Add vat_amount column to sales table
        console.log('\n📝 Step 1: Migrating sales table...');
        try {
            // Check if vat_amount already exists
            const salesColumns = await db.query(`PRAGMA table_info(sales)`);
            const hasVatAmount = salesColumns.some(col => col.name === 'vat_amount');

            if (!hasVatAmount) {
                console.log('  - Adding vat_amount column...');
                await db.run(`ALTER TABLE sales ADD COLUMN vat_amount DECIMAL(10, 2) DEFAULT 0`);

                // Copy data from tax_amount to vat_amount
                console.log('  - Copying data from tax_amount to vat_amount...');
                await db.run(`UPDATE sales SET vat_amount = tax_amount WHERE vat_amount IS NULL OR vat_amount = 0`);
                console.log('  ✅ vat_amount column added and migrated');
            } else {
                console.log('  ⏭️  vat_amount already exists, skipping');
            }

            // Add customer_id column
            const hasCustomerId = salesColumns.some(col => col.name === 'customer_id');
            if (!hasCustomerId) {
                console.log('  - Adding customer_id column...');
                await db.run(`ALTER TABLE sales ADD COLUMN customer_id INTEGER DEFAULT NULL`);
                console.log('  ✅ customer_id column added');
            } else {
                console.log('  ⏭️  customer_id already exists, skipping');
            }

            // Add status column
            const hasStatus = salesColumns.some(col => col.name === 'status');
            if (!hasStatus) {
                console.log('  - Adding status column...');
                await db.run(`ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed'`);
                console.log('  ✅ status column added');
            } else {
                console.log('  ⏭️  status already exists, skipping');
            }

            // Add amount_paid column
            const hasAmountPaid = salesColumns.some(col => col.name === 'amount_paid');
            if (!hasAmountPaid) {
                console.log('  - Adding amount_paid column...');
                await db.run(`ALTER TABLE sales ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0`);
                // Set amount_paid = total_amount for all completed sales
                await db.run(`UPDATE sales SET amount_paid = total_amount WHERE status = 'completed' OR status IS NULL`);
                console.log('  ✅ amount_paid column added');
            } else {
                console.log('  ⏭️  amount_paid already exists, skipping');
            }

            // Add discount_amount column
            const hasDiscountAmount = salesColumns.some(col => col.name === 'discount_amount');
            if (!hasDiscountAmount) {
                console.log('  - Adding discount_amount column...');
                await db.run(`ALTER TABLE sales ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0`);
                console.log('  ✅ discount_amount column added');
            } else {
                console.log('  ⏭️  discount_amount already exists, skipping');
            }
        } catch (error) {
            console.error('❌ Error migrating sales table:', error.message);
        }

        // 2. Create customers table if it doesn't exist
        console.log('\n📝 Step 2: Creating customers table...');
        try {
            await db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('  ✅ Customers table ensured');
        } catch (error) {
            console.error('❌ Error creating customers table:', error.message);
        }

        // 3. Create payments table if it doesn't exist
        console.log('\n📝 Step 3: Creating payments table...');
        try {
            await db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          payment_method TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id)
        )
      `);
            console.log('  ✅ Payments table ensured');
        } catch (error) {
            console.error('❌ Error creating payments table:', error.message);
        }

        // 4. Add theme_color to users table
        console.log('\n📝 Step 4: Migrating users table...');
        try {
            const usersColumns = await db.query(`PRAGMA table_info(users)`);
            const hasThemeColor = usersColumns.some(col => col.name === 'theme_color');

            if (!hasThemeColor) {
                console.log('  - Adding theme_color column...');
                await db.run(`ALTER TABLE users ADD COLUMN theme_color TEXT DEFAULT '#dc2626'`);
                console.log('  ✅ theme_color column added');
            } else {
                console.log('  ⏭️  theme_color already exists, skipping');
            }
        } catch (error) {
            console.error('❌ Error migrating users table:', error.message);
        }

        // 5. Update settings to use vat_rate instead of tax_rate
        console.log('\n📝 Step 5: Migrating settings...');
        try {
            const taxRateSetting = await db.get(`SELECT * FROM settings WHERE key = 'tax_rate'`);
            const vatRateSetting = await db.get(`SELECT * FROM settings WHERE key = 'vat_rate'`);

            if (taxRateSetting && !vatRateSetting) {
                console.log('  - Copying tax_rate to vat_rate...');
                await db.run(`INSERT INTO settings (key, value) VALUES ('vat_rate', ?)`, [taxRateSetting.value]);
                console.log('  ✅ vat_rate setting added');
            } else if (vatRateSetting) {
                console.log('  ⏭️  vat_rate already exists, skipping');
            } else {
                // Create default vat_rate if neither exists
                console.log('  - Creating default vat_rate setting...');
                await db.run(`INSERT INTO settings (key, value) VALUES ('vat_rate', '12.0')`);
                console.log('  ✅ default vat_rate setting added');
            }

            // Ensure receipt_footer exists
            const receiptFooter = await db.get(`SELECT * FROM settings WHERE key = 'receipt_footer'`);
            if (!receiptFooter) {
                console.log('  - Creating default receipt_footer setting...');
                await db.run(`INSERT INTO settings (key, value) VALUES ('receipt_footer', 'Thank you for your business!')`);
                console.log('  ✅ receipt_footer setting added');
            } else {
                console.log('  ⏭️  receipt_footer already exists, skipping');
            }
        } catch (error) {
            console.error('❌ Error migrating settings:', error.message);
        }

        // 6. Add brand and tire_size to products if they don't exist
        console.log('\n📝 Step 6: Migrating products table...');
        try {
            const productsColumns = await db.query(`PRAGMA table_info(products)`);
            const hasBrand = productsColumns.some(col => col.name === 'brand');
            const hasTireSize = productsColumns.some(col => col.name === 'tire_size');

            if (!hasBrand) {
                console.log('  - Adding brand column...');
                await db.run(`ALTER TABLE products ADD COLUMN brand TEXT DEFAULT ''`);
                console.log('  ✅ brand column added');
            } else {
                console.log('  ⏭️  brand already exists, skipping');
            }

            if (!hasTireSize) {
                console.log('  - Adding tire_size column...');
                await db.run(`ALTER TABLE products ADD COLUMN tire_size TEXT DEFAULT ''`);
                console.log('  ✅ tire_size column added');
            } else {
                console.log('  ⏭️  tire_size already exists, skipping');
            }
        } catch (error) {
            console.error('❌ Error migrating products table:', error.message);
        }

        // 7. Add payment_deadline to sales table
        console.log('\n📝 Step 7: Migrating sales table (payment_deadline)...');
        try {
            const salesColumns = await db.query(`PRAGMA table_info(sales)`);
            const hasPaymentDeadline = salesColumns.some(col => col.name === 'payment_deadline');

            if (!hasPaymentDeadline) {
                console.log('  - Adding payment_deadline column...');
                await db.run(`ALTER TABLE sales ADD COLUMN payment_deadline DATETIME DEFAULT NULL`);
                console.log('  ✅ payment_deadline column added');
            } else {
                console.log('  ⏭️  payment_deadline already exists, skipping');
            }
        } catch (error) {
            console.error('❌ Error migrating sales table (payment_deadline):', error.message);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  - Sales table: vat_amount, customer_id, status, amount_paid, payment_deadline');
        console.log('  - Customers table: Created');
        console.log('  - Payments table: Created');
        console.log('  - Users table: theme_color');
        console.log('  - Settings: vat_rate');
        console.log('  - Products table: brand, tire_size');
        console.log('\n🎉 Your database is now up to date!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

// Run migration
migrate();
