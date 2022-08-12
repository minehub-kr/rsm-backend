import { FastifyRequest } from 'fastify';
import crypto from 'crypto';

export function generateToken(length?: number, chars?: string): string {
  if (length === undefined) length = 64;
  if (chars === undefined) chars = 'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890';

  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(getCryptoSafeInteger(chars.length));
  }

  return token;
}

export function getCryptoSafeInteger(bound?: number): number {
  if (bound === undefined) bound = Number.MAX_SAFE_INTEGER;

  const array = new Uint32Array(1);
  crypto.randomFillSync(array);

  return array[0] % bound;
}

export function getTokenFromRequest(
  req: FastifyRequest,
):
  | {
      method: string;
      token: string;
    }
  | undefined {
  console.log('Query', req.query);
  if ((req.query as { token: string }).token) {
    console.log('Query', req.query);
    return {
      method: 'Bearer',
      token: (req.query as { token: string }).token,
    };
  }

  if (req.headers.authorization) {
    const method = req.headers.authorization.split(' ')[0];
    const token = req.headers.authorization.split(' ').splice(1).join(' ');
    return {
      method,
      token,
    };
  }
  return;
}
