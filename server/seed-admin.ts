
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedAdminUser() {
  const email = 'letmeknow6@icloud.com';
  const password = '1236';
  
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (existingUser) {
      // Update existing user with password
      await db.update(users)
        .set({ passwordHash })
        .where(eq(users.email, email));
      
      console.log(`✅ Password updated for ${email}`);
    } else {
      // Create new user
      await db.insert(users).values({
        id: `admin-${Date.now()}`,
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active'
      });
      
      console.log(`✅ Admin user created: ${email}`);
    }
    
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}\n`);
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
  }
  
  process.exit(0);
}

seedAdminUser();
