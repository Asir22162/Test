import 'reflect-metadata';
import { DataSource } from 'typeorm';

async function main() {
  const ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: false,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  });

  try {
    await ds.initialize();
    console.log('Connected to in-memory sqlite for migration check');
    const migrations = ds.migrations?.map(m => m.name) || [];
    console.log('Migrations to run:', migrations);
    await ds.runMigrations({ transaction: 'all' });
    console.log('Migrations ran successfully');
    await ds.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Migration check failed:', err);
    try { await ds.destroy(); } catch (e) {}
    process.exit(2);
  }
}

main();
