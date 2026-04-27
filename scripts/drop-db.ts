import 'dotenv/config';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: 'postgres',
});

async function dropDatabase() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    console.log('📡 Connected to PostgreSQL');
    
    // Drop database if exists
    await queryRunner.query(`DROP DATABASE IF EXISTS bus_monitor`);
    console.log('🗑️ Database "bus_monitor" dropped');
    
    // Create fresh database
    await queryRunner.query(`CREATE DATABASE bus_monitor`);
    console.log('✅ Database "bus_monitor" created');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

dropDatabase();