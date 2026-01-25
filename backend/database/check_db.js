const Database = require('./db');

async function checkSchema() {
    const db = new Database();
    try {
        console.log('Checking Schema...');

        const tables = ['sales', 'payments', 'products', 'customers', 'users', 'settings'];

        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} ---`);
            const columns = await db.query(`PRAGMA table_info(${table})`);
            columns.forEach(col => {
                console.log(`${col.name.padEnd(20)} | ${col.type.padEnd(15)} | Nullable: ${col.notnull === 0}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.close();
    }
}

checkSchema();
