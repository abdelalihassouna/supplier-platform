const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'db_vai',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Python92',
});

async function fixTestUsers() {
  try {
    console.log('🔧 Fixing test user passwords...');
    
    // Hash passwords for test users
    const adminPassword = await bcrypt.hash('admin123', 12);
    const managerPassword = await bcrypt.hash('manager123', 12);
    
    // Update admin user
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [adminPassword, 'admin@pizzarotti.com']
    );
    
    // Update manager user
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [managerPassword, 'manager@pizzarotti.com']
    );
    
    console.log('✅ Test users updated successfully!');
    console.log('📧 Login credentials:');
    console.log('   Admin: admin@pizzarotti.com / admin123');
    console.log('   Manager: manager@pizzarotti.com / manager123');
    
  } catch (error) {
    console.error('❌ Error updating test users:', error);
  } finally {
    await pool.end();
  }
}

fixTestUsers();


// 🔧 Fixing test user passwords...
// ✅ Test users updated successfully!
// 📧 Login credentials:
//    Admin: admin@pizzarotti.com / admin123
//    Manager: manager@pizzarotti.com / manager123
