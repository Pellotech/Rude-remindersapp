import { storage } from "../storage";

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