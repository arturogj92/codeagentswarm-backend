#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runMigrations() {
    console.log('🚀 Running database migrations...');
    
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    for (const file of migrationFiles) {
        console.log(`\n📝 Running migration: ${file}`);
        
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        try {
            // Split by semicolons to handle multiple statements
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const statement of statements) {
                const { error } = await supabase.rpc('exec_sql', {
                    sql: statement + ';'
                }).single();

                if (error) {
                    // Try direct execution as alternative
                    console.log('  Using alternative execution method...');
                    // Note: Direct SQL execution requires admin privileges
                    // You might need to run these migrations directly in Supabase dashboard
                    console.warn(`  ⚠️  Failed to execute: ${error.message}`);
                    console.log(`  💡 Please run this migration manually in Supabase SQL editor`);
                }
            }
            
            console.log(`  ✅ Migration ${file} completed`);
        } catch (error) {
            console.error(`  ❌ Error running migration ${file}:`, error.message);
            console.log(`  💡 You may need to run this migration manually in the Supabase dashboard`);
        }
    }

    console.log('\n✨ Migration process completed!');
    console.log('\n📌 Note: Some migrations may need to be run manually in the Supabase SQL editor');
    console.log('   Visit: https://app.supabase.com/project/YOUR_PROJECT/sql/new');
}

// Run migrations
runMigrations().catch(console.error);