import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

export const newSessionId = (): string => uuid();
export const newNonce = (): string =>
  crypto.randomBytes(32).toString('base64url'); // 43-char URL-safe
