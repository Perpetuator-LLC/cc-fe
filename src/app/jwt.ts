// Copyright (c) 2025 Perpetuator LLC
// Utility function to decode JWT token
import { JWT } from './types';

export function decodeJWT(token: string): JWT | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
}

export function createTestJWT(payload: JWT, expiresIn = 3600): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const encodedHeader = btoa(JSON.stringify(header));
  const iat = Math.floor(Date.now() / 1000);
  payload.iat = payload.iat || iat;
  payload.exp = payload.exp || iat + expiresIn; // Default expiry: 1 hour
  const encodedPayload = btoa(JSON.stringify(payload));

  // Typically a real JWT would be signed, but for testing we can just concatenate
  // the parts with a fake signature
  return `${encodedHeader}.${encodedPayload}.fake-signature`;
}
