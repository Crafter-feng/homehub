import CryptoJS from 'crypto-js';

const ENCRYPT_KEY = 'hh-tk-enc-2026'; // Should be moved to environment variable in production

export const TokenStorage = {
  /** Retrieve and decrypt the access token from localStorage */
  getAccessToken(): string | null {
    const encrypted = localStorage.getItem('accessToken');
    if (!encrypted) return null;
    try {
      return CryptoJS.AES.decrypt(encrypted, ENCRYPT_KEY).toString(CryptoJS.enc.Utf8);
    } catch {
      return null;
    }
  },

  /** Encrypt and store the access token in localStorage */
  setAccessToken(token: string): void {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPT_KEY).toString();
    localStorage.setItem('accessToken', encrypted);
  },

  /** Retrieve and decrypt the refresh token from localStorage */
  getRefreshToken(): string | null {
    const encrypted = localStorage.getItem('refreshToken');
    if (!encrypted) return null;
    try {
      return CryptoJS.AES.decrypt(encrypted, ENCRYPT_KEY).toString(CryptoJS.enc.Utf8);
    } catch {
      return null;
    }
  },

  /** Encrypt and store the refresh token in localStorage */
  setRefreshToken(token: string): void {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPT_KEY).toString();
    localStorage.setItem('refreshToken', encrypted);
  },

  /** Remove both access and refresh tokens from localStorage */
  clearAll(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};
