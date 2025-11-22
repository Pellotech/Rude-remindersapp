import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
}

const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function getApplePublicKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        return reject(err);
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        return reject(new Error('No signing key found'));
      }
      resolve(signingKey);
    });
  });
}

export async function verifyAppleToken(identityToken: string): Promise<AppleIdTokenPayload> {
  try {
    // Decode the token header to get the kid (key ID)
    const decoded = jwt.decode(identityToken, { complete: true });
    
    if (!decoded || typeof decoded === 'string' || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid token format - no kid found');
    }

    const kid = decoded.header.kid;

    // Get Apple's public key for this kid
    const publicKey = await getApplePublicKey(kid);

    // Verify and decode the token
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      // Note: audience should match your app's bundle ID or client ID
      // For native iOS app, this is typically the bundle ID
    }) as AppleIdTokenPayload;

    // Additional validation
    if (!payload.sub) {
      throw new Error('Token missing required sub claim');
    }

    // Check expiration (jwt.verify already checks this, but double-check)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token has expired');
    }

    console.log('✅ Apple token verified successfully:', {
      sub: payload.sub,
      email: payload.email,
      iss: payload.iss,
      aud: payload.aud
    });

    return payload;
  } catch (error: any) {
    console.error('❌ Apple token verification failed:', error);
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

export function validateAppleTokenAudience(payload: AppleIdTokenPayload, expectedAudience: string): boolean {
  // For native iOS apps, the audience should be the bundle ID
  // For web apps, it should be the client ID
  return payload.aud === expectedAudience;
}
