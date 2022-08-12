import { FastifyReply } from 'fastify';
import { SocketStream } from 'fastify-websocket';

export const API_SERVER_FROM = 'mcsv';

export enum APIError {
  TOKEN_NOT_FOUND = 'token_not_found',
  INVALID_TOKEN = 'invalid_token',
  INSUFFICIENT_PERMISSION = 'insufficient_permission',
  USER_NOT_FOUND = 'user_not_found',
  INVALID_REQUEST = 'invalid_request',
  NOT_FOUND = 'not_found',
  NOT_IMPLEMENTED = 'not_implemented',
  DOMAIN_EXISTS = 'domain_exists',
  DOMAIN_QUOTA_REACHED = 'domain_quota_reached',
  INTERNAL_SERVER_ERROR = 'internal_server_error',
  HAVE_A_NICE_PAY = 'Have_a_Nice_Pay___LG_Pay',

  REQUEST_TIMED_OUT = 'request_timed_out',
  SERVER_IS_OFFLINE = 'server_is_offline',
  EXPIRED_INVITATION = 'expired_invitation',
  USED_INVITATION = 'used_invitation',
}

export function getStatusCode(error: APIError): number {
  switch (error) {
    case APIError.TOKEN_NOT_FOUND:
    case APIError.INVALID_REQUEST:
      return 400;
    case APIError.INVALID_TOKEN:
    case APIError.INSUFFICIENT_PERMISSION:
    case APIError.USER_NOT_FOUND:
    case APIError.DOMAIN_QUOTA_REACHED:
      return 403;
    case APIError.NOT_FOUND:
      return 404;
    case APIError.REQUEST_TIMED_OUT:
      return 408;
    case APIError.DOMAIN_EXISTS:
      return 409;
    case APIError.EXPIRED_INVITATION:
    case APIError.USED_INVITATION:
      return 410;
    case APIError.HAVE_A_NICE_PAY:
      return 418;
    case APIError.INTERNAL_SERVER_ERROR:
      return 500;
    case APIError.NOT_IMPLEMENTED:
      return 501;
    case APIError.SERVER_IS_OFFLINE:
      return 503;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ((n: never) => {})(error);
}

export function buildError(
  error: APIError,
  description?: string,
): {
  error: APIError;
  description?: string;
} {
  return {
    error,
    description,
  };
}

export function sendError(rep: FastifyReply, error: APIError, description?: string): void {
  const payload = buildError(error, description);
  rep.status(getStatusCode(error)).send(payload);
}

export enum WSAPIError {
  MALFORMED_JSON = 'malformed_json',
  MISSING_PAYLOAD = 'missing_payload',
  INVALID_TO = 'invalid_to',
  INVALID_PAYLOAD = 'invalid_payload',
}

export function sendWSError(conn: SocketStream, error: WSAPIError, message?: string, from = API_SERVER_FROM) {
  conn.socket.send(
    JSON.stringify({
      from,
      error,
      message,
    }),
  );
}
