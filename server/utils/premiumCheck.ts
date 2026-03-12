import { storage } from "../storage";

/**
 * Get the current month key for tracking monthly usage
 * @returns string - Format: "YYYY-MM"
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const FREE_MONTHLY_LIMIT = 15;
const PREMIUM_MONTHLY_LIMIT = 120;

export function getMonthlyResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function checkMonthlyReminderLimit(userId: string): Promise<{hasExceeded: boolean, currentCount: number, limit: number, resetDate: string}> {
  try {
    const { storage } = await import("../storage");
    const user = await storage.getUser(userId);
    const resetDate = getMonthlyResetDate();

    if (!user) {
      return { hasExceeded: false, currentCount: 0, limit: FREE_MONTHLY_LIMIT, resetDate };
    }

    const isPremium = await isUserPremium(userId);
    const limit = isPremium ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;

    const currentMonth = getCurrentMonthKey();
    const monthlyUsage: Record<string, number> = (user.monthlyReminderUsage as Record<string, number>) || {};
    const currentMonthUsage = monthlyUsage[currentMonth] || 0;

    return {
      hasExceeded: currentMonthUsage >= limit,
      currentCount: currentMonthUsage,
      limit,
      resetDate
    };
  } catch (error) {
    console.error('Error checking monthly limit:', error);
    return { hasExceeded: false, currentCount: 0, limit: FREE_MONTHLY_LIMIT, resetDate: getMonthlyResetDate() };
  }
}

export { checkMonthlyReminderLimit as checkFreeUserMonthlyLimit };

export async function incrementMonthlyReminderCount(userId: string, count: number = 1): Promise<void> {
  try {
    const { storage } = await import("../storage");
    const user = await storage.getUser(userId);

    if (!user) return;

    const currentMonth = getCurrentMonthKey();
    const monthlyUsage: Record<string, number> = (user.monthlyReminderUsage as Record<string, number>) || {};
    monthlyUsage[currentMonth] = (monthlyUsage[currentMonth] || 0) + count;

    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    Object.keys(monthlyUsage).forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, month - 1, 1);
      if (monthDate < cutoffDate) {
        delete monthlyUsage[monthKey];
      }
    });

    await storage.updateUser(userId, { monthlyReminderUsage: monthlyUsage });
  } catch (error) {
    console.error('Error incrementing monthly reminder count:', error);
  }
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