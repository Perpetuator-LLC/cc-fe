// Copyright (c) 2025 Perpetuator LLC
import {
  hashValue,
  redactSensitivePatterns,
  sanitizeMessage,
  sanitizeSensitiveData,
  sanitizeSensitiveDataSync,
  sanitizeStackTrace,
  sanitizeTags,
  getSafeUrl,
  getSafeContext,
} from './trace-sanitizer';

describe('TraceSanitizer', () => {
  describe('sanitizeSensitiveDataSync', () => {
    it('should redact password fields', () => {
      const data = { username: 'testuser', password: 'secret123' };
      const result = sanitizeSensitiveDataSync(data) as Record<string, unknown>;

      expect((result['username'] as string).startsWith('[HASHED:')).toBeTrue();
      expect(result['password']).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const data = {
        access_token: 'abc123',
        refreshToken: 'def456',
        api_key: 'key123',
      };
      const result = sanitizeSensitiveDataSync(data) as Record<string, unknown>;

      expect(result['access_token']).toBe('[REDACTED]');
      expect(result['refreshToken']).toBe('[REDACTED]');
      expect(result['api_key']).toBe('[REDACTED]');
    });

    it('should hash PII fields', () => {
      const data = { email: 'test@example.com', username: 'testuser' };
      const result = sanitizeSensitiveDataSync(data) as Record<string, string>;

      expect((result['email'] as string).startsWith('[HASHED:')).toBeTrue();
      expect((result['username'] as string).startsWith('[HASHED:')).toBeTrue();
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
          password: 'secret',
          profile: {
            name: 'Test User',
          },
        },
      };
      const result = sanitizeSensitiveDataSync(data) as Record<string, Record<string, unknown>>;
      const user = result['user'] as Record<string, unknown>;
      const profile = user['profile'] as Record<string, string>;

      expect(user['password']).toBe('[REDACTED]');
      expect((user['email'] as string).startsWith('[HASHED:')).toBeTrue();
      expect(profile['name']).toBe('Test User');
    });

    it('should handle arrays', () => {
      const data = {
        users: [
          { email: 'user1@example.com', password: 'pass1' },
          { email: 'user2@example.com', password: 'pass2' },
        ],
      };
      const result = sanitizeSensitiveDataSync(data) as Record<string, Record<string, string>[]>;
      const users = result['users'] as Record<string, string>[];

      expect(users[0]['password']).toBe('[REDACTED]');
      expect((users[0]['email'] as string).startsWith('[HASHED:')).toBeTrue();
      expect(users[1]['password']).toBe('[REDACTED]');
    });

    it('should handle suffix matching for sensitive keys', () => {
      const data = {
        userPassword: 'secret',
        authToken: 'token123',
        apiSecret: 'secret123',
      };
      const result = sanitizeSensitiveDataSync(data) as Record<string, unknown>;

      expect(result['userPassword']).toBe('[REDACTED]');
      expect(result['authToken']).toBe('[REDACTED]');
      expect(result['apiSecret']).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const data = { field: null, other: undefined };
      const result = sanitizeSensitiveDataSync(data) as Record<string, unknown>;

      expect(result['field']).toBeNull();
      expect(result['other']).toBeUndefined();
    });

    it('should preserve non-sensitive fields', () => {
      const data = {
        action: 'login',
        timestamp: '2025-01-01T00:00:00Z',
        count: 42,
      };
      const result = sanitizeSensitiveDataSync(data);

      expect(result).toEqual(data);
    });

    it('should respect maxDepth option', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              password: 'secret',
            },
          },
        },
      };
      // At maxDepth=3: level1 (depth 2), level2 (depth 1), level3 (depth 0 -> MAX_DEPTH)
      const result = sanitizeSensitiveDataSync(data, { maxDepth: 3 }) as Record<string, unknown>;
      const level1 = result['level1'] as Record<string, unknown>;
      const level2 = level1['level2'] as Record<string, unknown>;

      expect(level2['level3']).toBe('[MAX_DEPTH_EXCEEDED]');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(6000);
      const result = sanitizeSensitiveDataSync({ message: longString }) as Record<string, string>;
      const message = result['message'] as string;

      expect(message.length).toBeLessThan(6000);
      expect(message).toContain('[TRUNCATED]');
    });
  });

  describe('sanitizeSensitiveData (async)', () => {
    it('should hash PII using crypto.subtle', async () => {
      const data = { email: 'test@example.com' };
      const result = (await sanitizeSensitiveData(data)) as Record<string, string>;
      const email = result['email'] as string;

      expect(email).toMatch(/^\[HASHED:[a-f0-9]{8}]$/);
    });

    it('should redact sensitive fields', async () => {
      const data = { password: 'secret', token: 'abc123' };
      const result = await sanitizeSensitiveData(data);

      expect(result).toEqual({
        password: '[REDACTED]',
        token: '[REDACTED]',
      });
    });
  });

  describe('redactSensitivePatterns', () => {
    it('should redact JWT tokens', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' +
        'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const str = `Token: ${jwt}`;
      const result = redactSensitivePatterns(str);

      expect(result).toBe('Token: [REDACTED]');
    });

    it('should redact Bearer tokens', () => {
      const str = 'Authorization: Bearer abc123xyz';
      const result = redactSensitivePatterns(str);

      expect(result).toBe('Authorization: [REDACTED]');
    });

    it('should redact API keys with prefixes', () => {
      const str = 'API Key: sk_live_abcdefghijklmnopqrstuvwxyz';
      const result = redactSensitivePatterns(str);

      expect(result).toBe('API Key: [REDACTED]');
    });

    it('should redact Basic auth headers', () => {
      const str = 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=';
      const result = redactSensitivePatterns(str);

      expect(result).toBe('Authorization: [REDACTED]');
    });

    it('should redact AWS-style keys', () => {
      const str = 'AWS Key: AKIAIOSFODNN7EXAMPLE';
      const result = redactSensitivePatterns(str);

      expect(result).toBe('AWS Key: [REDACTED]');
    });

    it('should redact Telegram bot tokens', () => {
      const str = 'Bot: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789AB';
      const result = redactSensitivePatterns(str);

      expect(result).toBe('Bot: [REDACTED]');
    });

    it('should preserve normal text', () => {
      const str = 'This is a normal message without sensitive data';
      const result = redactSensitivePatterns(str);

      expect(result).toBe(str);
    });
  });

  describe('hashValue', () => {
    it('should return consistent hash for same value', async () => {
      const hash1 = await hashValue('test@example.com');
      const hash2 = await hashValue('test@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different values', async () => {
      const hash1 = await hashValue('user1@example.com');
      const hash2 = await hashValue('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null/undefined/empty', async () => {
      expect(await hashValue(null)).toBe('[REDACTED]');
      expect(await hashValue(undefined)).toBe('[REDACTED]');
      expect(await hashValue('')).toBe('[REDACTED]');
    });

    it('should format as [HASHED:xxxxxxxx]', async () => {
      const hash = await hashValue('test');
      expect(hash).toMatch(/^\[HASHED:[a-f0-9]{8}]$/);
    });
  });

  describe('sanitizeMessage', () => {
    it('should redact sensitive patterns in messages', () => {
      const message = 'Error with token eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoidmFsdWUifQ.signature';
      const result = sanitizeMessage(message);

      expect(result).toBe('Error with token [REDACTED]');
    });
  });

  describe('sanitizeStackTrace', () => {
    it('should redact sensitive patterns in stack traces', () => {
      const stack = `Error at processToken(eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoidmFsdWUifQ.sig)
        at file.js:10`;
      const result = sanitizeStackTrace(stack);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('eyJ');
    });

    it('should handle undefined', () => {
      expect(sanitizeStackTrace(undefined)).toBeUndefined();
    });
  });

  describe('sanitizeTags', () => {
    it('should redact sensitive tag values', () => {
      const tags = { operation: 'login', password: 'secret' };
      const result = sanitizeTags(tags) as Record<string, string>;

      expect(result['operation']).toBe('login');
      expect(result['password']).toBe('[REDACTED]');
    });

    it('should hash PII tag values', () => {
      const tags = { username: 'testuser', action: 'update' };
      const result = sanitizeTags(tags) as Record<string, string>;

      expect((result['username'] as string).startsWith('[HASHED:')).toBeTrue();
      expect(result['action']).toBe('update');
    });

    it('should handle undefined', () => {
      expect(sanitizeTags(undefined)).toBeUndefined();
    });
  });

  describe('getSafeUrl', () => {
    it('should return pathname without query params', () => {
      // Note: In test environment, window.location is mocked
      const url = getSafeUrl();
      expect(typeof url).toBe('string');
      expect(url).not.toContain('?');
    });
  });

  describe('getSafeContext', () => {
    it('should return url and userAgent', () => {
      const context = getSafeContext();
      expect('url' in context).toBeTrue();
      expect('userAgent' in context).toBeTrue();
    });
  });
});
