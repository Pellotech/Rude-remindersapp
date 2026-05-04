import { storage } from "../storage";
import { pool } from "../db";

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const FREE_MONTHLY_LIMIT = 15;
const PREMIUM_MONTHLY_LIMIT = 120;
const FREE_TIER_DURATION_MONTHS = 6;

export function getMonthlyResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function getFreeTierExpiryDate(createdAt: Date | string | null | undefined): Date | null {
  if (!createdAt) return null;
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) return null;
  return new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth() + FREE_TIER_DURATION_MONTHS,
    start.getUTCDate(),
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds(),
  ));
}

export function isFreeTrialExpired(createdAt: Date | string | null | undefined): boolean {
  const expiry = getFreeTierExpiryDate(createdAt);
  if (!expiry) return false;
  return Date.now() >= expiry.getTime();
}

function formatExpiryDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function checkMonthlyReminderLimit(userId: string): Promise<{hasExceeded: boolean, currentCount: number, limit: number, resetDate: string, trialExpired?: boolean}> {
  try {
    const isPremium = await isUserPremium(userId);
    const limit = isPremium ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
    const resetDate = getMonthlyResetDate();
    const currentMonth = getCurrentMonthKey();

    if (!isPremium) {
      const user = await storage.getUser(userId);
      if (user && isFreeTrialExpired(user.createdAt)) {
        console.log(`⏳ User ${userId} free tier expired (createdAt=${user.createdAt})`);
        return { hasExceeded: true, currentCount: 0, limit, resetDate, trialExpired: true };
      }
    }

    const result = await pool.query(
      `SELECT COALESCE((monthly_reminder_usage->$1)::int, 0) AS count FROM users WHERE id = $2`,
      [currentMonth, userId]
    );

    const currentCount = result.rows.length > 0 ? result.rows[0].count : 0;

    console.log(`Free tier reminder count: ${currentCount}, limit: ${limit}, exceeded: ${currentCount >= limit}`);
    return { hasExceeded: currentCount >= limit, currentCount, limit, resetDate };
  } catch (error) {
    console.error('Error checking monthly limit:', error);
    return { hasExceeded: false, currentCount: 0, limit: FREE_MONTHLY_LIMIT, resetDate: getMonthlyResetDate() };
  }
}

export { checkMonthlyReminderLimit as checkFreeUserMonthlyLimit };

export async function atomicIncrementAndCheck(userId: string, count: number = 1): Promise<{allowed: boolean, newCount: number, limit: number, resetDate: string, trialExpired?: boolean}> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockResult = await client.query(
      `SELECT monthly_reminder_usage, created_at FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { allowed: false, newCount: 0, limit: FREE_MONTHLY_LIMIT, resetDate: getMonthlyResetDate() };
    }

    const isPremium = await isUserPremium(userId);
    const limit = isPremium ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
    const resetDate = getMonthlyResetDate();
    const currentMonth = getCurrentMonthKey();

    if (!isPremium && isFreeTrialExpired(lockResult.rows[0].created_at)) {
      await client.query('ROLLBACK');
      console.log(`⏳ User ${userId} free tier expired (createdAt=${lockResult.rows[0].created_at})`);
      return { allowed: false, newCount: 0, limit, resetDate, trialExpired: true };
    }

    const monthlyUsage: Record<string, number> = (lockResult.rows[0].monthly_reminder_usage as Record<string, number>) || {};
    const currentCount = monthlyUsage[currentMonth] || 0;

    console.log(`Free tier reminder count: ${currentCount}, limit: ${limit}, adding: ${count}, allowed: ${currentCount + count <= limit}`);
    if (currentCount + count > limit) {
      await client.query('ROLLBACK');
      return { allowed: false, newCount: currentCount, limit, resetDate };
    }

    monthlyUsage[currentMonth] = currentCount + count;

    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    Object.keys(monthlyUsage).forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, month - 1, 1);
      if (monthDate < cutoffDate) {
        delete monthlyUsage[monthKey];
      }
    });

    await client.query(
      `UPDATE users SET monthly_reminder_usage = $1 WHERE id = $2`,
      [JSON.stringify(monthlyUsage), userId]
    );

    await client.query('COMMIT');
    return { allowed: true, newCount: currentCount + count, limit, resetDate };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in atomicIncrementAndCheck:', error);
    return { allowed: true, newCount: 0, limit: FREE_MONTHLY_LIMIT, resetDate: getMonthlyResetDate() };
  } finally {
    client.release();
  }
}

export async function incrementMonthlyReminderCount(userId: string, count: number = 1): Promise<void> {
  await atomicIncrementAndCheck(userId, count);
}

/**
 * Check if a user has premium subscription access
 * @param userId - User ID to check
 * @returns Promise<boolean> - True if user has premium access
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return false;
    
    // Check if user's email is in the premium whitelist (always premium)
    if (user.email) {
      const isWhitelisted = await storage.isEmailWhitelisted(user.email);
      if (isWhitelisted) {
        console.log(`✅ User ${userId} has premium via whitelist`);
        return true;
      }
    }
    
    // Check if user has active premium subscription
    // BOTH conditions must be true: status is 'active' AND plan is 'premium'
    const hasActivePremium = user.subscriptionStatus === 'active' && user.subscriptionPlan === 'premium';
    
    // If subscription has an end date, verify it hasn't expired
    if (user.subscriptionEndsAt) {
      const subscriptionEndDate = new Date(user.subscriptionEndsAt);
      const now = new Date();
      const isNotExpired = subscriptionEndDate > now;
      
      if (!isNotExpired) {
        console.log(`⏰ User ${userId} subscription expired at ${subscriptionEndDate}`);
        return false; // Subscription expired, user is now free tier
      }
    }
    
    // Final check: must have active subscription
    if (hasActivePremium) {
      console.log(`✅ User ${userId} has active premium subscription`);
    } else {
      console.log(`📋 User ${userId} is free tier (status: ${user.subscriptionStatus}, plan: ${user.subscriptionPlan})`);
    }
    
    return hasActivePremium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false; // Default to free if check fails
  }
}

/**
 * Check if a user has premium access, returning user data as well
 * @param userId - User ID to check
 * @returns Promise<{isPremium: boolean, user: User | null}>
 */
export async function getUserPremiumStatus(userId: string) {
  try {
    const user = await storage.getUser(userId);
    if (!user) return { isPremium: false, user: null, source: 'not_found' };
    
    const isPremium = await isUserPremium(userId);
    
    // Determine the source of premium access
    let source = 'free';
    if (isPremium) {
      if (user.email && await storage.isEmailWhitelisted(user.email)) {
        source = 'whitelist';
      } else if (user.subscriptionStatus === 'active' || user.subscriptionPlan === 'premium') {
        source = 'subscription';
      }
    }
    
    return { isPremium, user, source };
  } catch (error) {
    console.error('Error getting user premium status:', error);
    return { isPremium: false, user: null, source: 'error' };
  }
}

// Helper function to add an email to the whitelist
export async function addEmailToWhitelist(email: string, addedBy: string): Promise<boolean> {
  return await storage.addEmailToWhitelist(email, addedBy);
}

// Helper function to remove an email from the whitelist
export async function removeEmailFromWhitelist(email: string): Promise<boolean> {
  return await storage.removeEmailFromWhitelist(email);
}

// Helper function to get all whitelisted emails (for admin purposes)
export async function getWhitelistedEmails(): Promise<string[]> {
  return await storage.getWhitelistEmails();
}

/**
 * Cleanup expired subscriptions
 * This runs as a backup in case RevenueCat webhooks fail
 * Should be called periodically (e.g., daily via cron job)
 */
export async function cleanupExpiredSubscriptions(): Promise<{cleaned: number, errors: number}> {
  let cleaned = 0;
  let errors = 0;
  
  try {
    // Get all users with subscriptionEndsAt set
    const allUsers = await storage.getAllUsers();
    
    const now = new Date();
    
    for (const user of allUsers) {
      try {
        // Skip whitelisted users (they have permanent premium)
        if (user.email && await storage.isEmailWhitelisted(user.email)) {
          continue;
        }
        
        // Check if subscription has expired
        if (user.subscriptionEndsAt) {
          const expiryDate = new Date(user.subscriptionEndsAt);
          
          if (expiryDate <= now && user.subscriptionStatus === 'active') {
            // Subscription expired but still marked as active - downgrade to free
            console.log(`🧹 Cleaning up expired subscription for user ${user.id} (expired ${expiryDate})`);
            
            await storage.updateUser(user.id, {
              subscriptionStatus: 'expired',
              subscriptionPlan: 'free',
              revenueCatEntitlements: {},
            });
            
            cleaned++;
          }
        }
      } catch (error) {
        console.error(`Error cleaning up user ${user.id}:`, error);
        errors++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`✅ Subscription cleanup complete: ${cleaned} users downgraded to free tier`);
    }
    
    return { cleaned, errors };
  } catch (error) {
    console.error('Error in cleanupExpiredSubscriptions:', error);
    return { cleaned, errors };
  }
}