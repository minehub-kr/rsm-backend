import { Server as MCSVServer } from '@prisma/client';
import { API_SERVER_FROM, sendWSError, WSAPIError } from '../../../../common/error';
import { checkSafeToSend, WSPayload } from './common';
import { getWSSessionById, getWSSessions, housekeepWSSessions, WSSessionType } from './sessions';

export function isServerOnline(server: string | MCSVServer) {
  housekeepWSSessions(server, WSSessionType.SERVER);
  const sessions = getWSSessions(server, WSSessionType.SERVER);

  return sessions.length > 0;
}

export function processBackendPayload(
  server: string | MCSVServer,
  type: WSSessionType,
  from: string,
  payload: WSPayload,
): void {
  const responseTarget = getWSSessionById(server, from, type);
  if (!responseTarget) return;

  const conn = responseTarget.conn;

  let responsePayload = {};
  if (!payload.action) return sendWSError(conn, WSAPIError.INVALID_PAYLOAD);

  if (payload.action === 'ping') {
    responsePayload = {
      action: payload.action,
      response: 'pong',
    };
  } else if (payload.action === 'get_my_id') {
    responsePayload = {
      action: payload.action,
      response: responseTarget.id,
    };
  } else if (payload.action === 'is_server_online') {
    responsePayload = {
      action: payload.action,
      response: isServerOnline(server),
    };
  } else if (payload.action === 'get_server_ip') {
    if (isServerOnline(server)) {
      const serverSession = getWSSessions(server, WSSessionType.SERVER)[0];
      responsePayload = {
        action: payload.action,
        response: serverSession.ip,
      };
    }
  }

  if (checkSafeToSend(conn)) {
    conn.socket.send(
      JSON.stringify({
        from: API_SERVER_FROM,
        to: responseTarget.id,
        payload: responsePayload,
      }),
    );
  }
}
