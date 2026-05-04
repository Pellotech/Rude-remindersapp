import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { getFullApiUrl, setAuthToken, queryClient } from '@/lib/queryClient';

export interface AppleAuthResponse {
  identityToken: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  user: string;
}

class AppleSignInService {
  /**
   * Check if Sign in with Apple is available on this device
   */
  isAvailable(): boolean {
    // Only available on native iOS
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Initiate Sign in with Apple flow
   * Returns user information including identity token, email (if provided), and name
   */
  async signIn(): Promise<AppleAuthResponse> {
    try {
      const options: SignInWithAppleOptions = {
        clientId: 'com.rudereminders.app', // Your app's bundle ID
        redirectURI: 'https://rudereminders.app/auth/apple/callback', // Your redirect URI
        scopes: 'email name', // Request email and name
        state: Math.random().toString(36).substring(7), // Random state for security
        nonce: Math.random().toString(36).substring(7), // Random nonce
      };

      const response: SignInWithAppleResponse = await SignInWithApple.authorize(options);

      console.log('✅ Apple Sign-In successful:', {
        user: response.response.user,
        email: response.response.email,
        givenName: response.response.givenName,
        familyName: response.response.familyName,
      });

      return {
        identityToken: response.response.identityToken,
        email: response.response.email || undefined,
        givenName: response.response.givenName || undefined,
        familyName: response.response.familyName || undefined,
        user: response.response.user || '',
      };
    } catch (error: any) {
      console.error('❌ Apple Sign-In error:', error);
      
      // Handle user cancellation gracefully
      if (error.code === '1001' || error.message?.includes('cancel')) {
        throw new Error('Sign in cancelled');
      }
      
      throw new Error(error.message || 'Failed to sign in with Apple');
    }
  }

  /**
   * Authenticate with backend using Apple ID token
   */
  async authenticateWithBackend(appleResponse: AppleAuthResponse): Promise<boolean> {
    try {
      const response = await fetch(getFullApiUrl('/api/auth/apple'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          identityToken: appleResponse.identityToken,
          email: appleResponse.email,
          givenName: appleResponse.givenName,
          familyName: appleResponse.familyName,
          user: appleResponse.user,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const data = await response.json();
      console.log('✅ Backend authentication successful');
      const token = data.authToken ?? data.token ?? data.accessToken;
      if (token) {
        await setAuthToken(token);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      return true;
    } catch (error: any) {
      console.error('❌ Backend authentication error:', error);
      throw error;
    }
  }

  /**
   * Complete Sign in with Apple flow (sign in + backend authentication)
   */
  async signInAndAuthenticate(): Promise<boolean> {
    const appleResponse = await this.signIn();
    return await this.authenticateWithBackend(appleResponse);
  }
}

export const appleSignInService = new AppleSignInService();
