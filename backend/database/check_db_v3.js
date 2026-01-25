const Database = require('./db');
const fs = require('fs');
const path = require('path');

async function checkSchema() {
    const db = new Database();
    const result = {};

    try {
        const tables = ['sales', 'payments'];

        for (const table of tables) {
            try {
                const columns = await db.query(`PRAGMA table_info(${table})`);
                result[table] = columns;
            } catch (e) {
                result[table] = { error: e.message };
            }
        }

        fs.writeFileSync(path.join(__dirname, 'schema_output.json'), JSON.stringify(result, null, 2));
        console.log('Schema dump written to schema_output.json');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await db.close();
    }
}

checkSchema();
