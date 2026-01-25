const Database = require('./db');

async function checkSchema() {
    console.log('START_SCHEMA_CHECK');
    const db = new Database();
    try {
        const tables = ['sales', 'payments']; // Focus on relevant tables

        for (const table of tables) {
            console.log(`\nTABLE: ${table}`);
            try {
                // For Turso (libsql), PRAGMA might return result in a specific way handled by db.query wrapper
                const columns = await db.query(`PRAGMA table_info(${table})`);
                if (Array.isArray(columns)) {
                    console.log(JSON.stringify(columns, null, 2));
                } else {
                    console.log('Result:', columns);
                }
            } catch (e) {
                console.log(`Error checking ${table}: ${e.message}`);
            }
        }
    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await db.close();
        console.log('END_SCHEMA_CHECK');
    }
}

checkSchema();
