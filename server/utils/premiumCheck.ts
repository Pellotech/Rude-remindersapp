import { storage } from "../storage";

/**
 * Get the current month key for tracking monthly usage
 * @returns string - Format: "YYYY-MM"
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check if a free user has exceeded their monthly reminder limit
 * @param userId - User ID to check
 * @returns Promise<{hasExceeded: boolean, currentCount: number, limit: number}>
 */
export async function checkFreeUserMonthlyLimit(userId: string): Promise<{hasExceeded: boolean, currentCount: number, limit: number}> {
  try {
    const { storage } = await import("../storage");
    const user = await storage.getUser(userId);
    
    if (!user) {
      return { hasExceeded: false, currentCount: 0, limit: 12 };
    }

    // Check if user is premium (no limits for premium users)
    const isPremium = await isUserPremium(userId);
    if (isPremium) {
      return { hasExceeded: false, currentCount: 0, limit: -1 }; // -1 indicates unlimited
    }

    const currentMonth = getCurrentMonthKey();
    const monthlyUsage = user.monthlyReminderUsage || {};
    const currentMonthUsage = monthlyUsage[currentMonth] || 0;
    const limit = 12;

    return {
      hasExceeded: currentMonthUsage >= limit,
      currentCount: currentMonthUsage,
      limit
    };
  } catch (error) {
    console.error('Error checking monthly limit:', error);
    return { hasExceeded: false, currentCount: 0, limit: 12 };
  }
}

/**
 * Increment the monthly reminder count for a free user
 * @param userId - User ID
 * @returns Promise<void>
 */
export async function incrementMonthlyReminderCount(userId: string): Promise<void> {
  try {
    const { storage } = await import("../storage");
    const user = await storage.getUser(userId);
    
    if (!user) return;

    // Don't track for premium users
    const isPremium = await isUserPremium(userId);
    if (isPremium) return;

    const currentMonth = getCurrentMonthKey();
    const monthlyUsage = user.monthlyReminderUsage || {};
    monthlyUsage[currentMonth] = (monthlyUsage[currentMonth] || 0) + 1;

    // Clean up old months (keep only last 3 months)
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
    
    // Check if user has active premium subscription
    const hasActivePremium = user.subscriptionStatus === 'active' || user.subscriptionPlan === 'premium';
    
    // If subscription has an end date, check if it's still valid
    if (hasActivePremium && user.subscriptionEndsAt) {
      const subscriptionEndDate = new Date(user.subscriptionEndsAt);
      const now = new Date();
      return subscriptionEndDate > now;
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
    if (!user) return { isPremium: false, user: null };
    
    const isPremium = await isUserPremium(userId);
    return { isPremium, user };
  } catch (error) {
    console.error('Error getting user premium status:', error);
    return { isPremium: false, user: null };
  }
}