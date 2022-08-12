import { Server as MCSVServer, Server } from '@prisma/client';
import { SocketStream } from 'fastify-websocket';
import { API_SERVER_FROM, sendWSError, WSAPIError } from '../../../../common/error';
import { WSSessionType, SessionData, housekeepWSSessions, getWSSessions, getWSSessionById, sessions } from './sessions';
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';
import { FastifyRequest } from 'fastify';

interface WSPayload {
  action: string;
  data: any;
}

export function notifyUsers(server: MCSVServer | string, type: 'join' | 'leave') {
  let action = 'server_join';

  if (type === 'join' || type === 'leave') {
    action = 'server_' + type;
  } else {
    throw new Error('INVALID TYPE (' + type + ')');
  }

  getWSSessions(server, WSSessionType.CLIENT).map((n) => {
    if (checkSafeToSend(n.conn)) {
      n.conn.socket.send(
        JSON.stringify({
          from: API_SERVER_FROM,
          payload: {
            action,
          },
        }),
      );
    }
  });
}

export function registerHandler(server: MCSVServer | string, type: WSSessionType, sess: SessionData): void {
  const conn = sess.conn;
  const id = sess.id;

  // response ping,pong requests
  conn.socket.on('ping', (data) => {
    conn.socket.pong(data);
  });

  // connection close handlers, on servers, notify users that server has leaved.
  conn.socket.on('close', () => {
    housekeepWSSessions(server, type);
    notifyUsers(server, 'leave');
  });

  // handlers for each server/client
  if (type === WSSessionType.CLIENT) {
    conn.socket.on('message', (rawMsg) => {
      let json: any;

      // parse json first.
      try {
        let msg = rawMsg.toString();
        msg = msg.trim();

        json = JSON.parse(msg);
      } catch (e) {
        console.error('parsing error occurred!', e);
        return sendWSError(conn, WSAPIError.MALFORMED_JSON);
      }

      // if it is for api_server, mcsv-api. then process it.
      // else it is going to server (default).
      if (json.to === API_SERVER_FROM) {
        return processWSPayload(server, WSSessionType.CLIENT, sess.id, json.payload);
      }

      // if payload does not exist, There is nothing to pass to server. return error.
      if (!json.payload) {
        return sendWSError(conn, WSAPIError.MISSING_PAYLOAD);
      }

      // relay the payload to all the servers.
      // (it must be one, but playing safe just in case.)
      const serverSessions = getWSSessions(server, WSSessionType.SERVER);
      serverSessions.map((n) => {
        if (checkSafeToSend(n.conn)) {
          n.conn.socket.send(
            JSON.stringify({
              from: id,
              to: json.to ?? 'server',
              payload: json.payload as WSPayload,
            }),
          );
        }
      });
    });
  } else if (type === WSSessionType.SERVER) {
    conn.socket.on('message', (rawMsg) => {
      let json: any;

      // parse the json
      try {
        let msg = rawMsg.toString();
        msg = msg.trim();

        console.log('retrieved message from server: ', msg);
        json = JSON.parse(msg);
      } catch (e) {
        console.error('parsing error occurred!', e);
        return sendWSError(conn, WSAPIError.MALFORMED_JSON);
      }

      // get payload.
      if (!json.payload) {
        return sendWSError(conn, WSAPIError.MISSING_PAYLOAD);
      }

      // server payloads can have multiple targets.
      const targets: SessionData[] = [];
      let isItForAPI = false;

      // check if destination is specified, else it is broadcast packet.
      if (json.to) {
        if (Array.isArray(json.to)) {
          const to = json.to as string[];
          const res = to.map((n) => getWSSessionById(server, n, WSSessionType.CLIENT)).filter((n) => n !== undefined);

          if (to.includes(API_SERVER_FROM)) {
            isItForAPI = true;
          }

          targets.push(...(res as SessionData[]));
        } else if (typeof json.to === 'string') {
          if (json.to === API_SERVER_FROM) {
            isItForAPI = true;
          }

          const target = getWSSessionById(server, json.to, WSSessionType.CLIENT);
          if (target) {
            console.log('found target:', target);
            targets.push(target);
          }
        }
      } else {
        targets.push(...(getWSSessions(server, WSSessionType.CLIENT).filter((n) => n !== undefined) as SessionData[]));
      }

      const payload = json.payload as WSPayload;
      if (isItForAPI) {
        processWSPayload(server, WSSessionType.SERVER, sess.id, payload);
      }

      if (targets.length === 0) return;

      targets.map((n) => {
        if (checkSafeToSend(n.conn)) {
          console.log('sending payload to: ' + n.id);
          n.conn.socket.send(
            JSON.stringify({
              from: 'server',
              to: json.to,
              payload,
              exception: json?.exception,
              error: json?.error,
            }),
          );
        }
      });
    });
  } else {
    throw new Error('invalid sessionType');
  }

  // everything is done, notify users that server had joined.
  if (type === WSSessionType.SERVER) {
    notifyUsers(server, 'join');
  }
}

export async function runPayload(
  server: Server,
  payload: WSPayload,
  req: FastifyRequest | undefined = undefined,
  timeout: number | undefined = 5000,
): Promise<any> {
  return (
    await runPacket(
      server,
      {
        to: 'server',
        payload,
      },
      req,
      timeout,
    )
  ).payload;
}

export function runPacket(
  server: Server,
  packet: any,
  req: FastifyRequest | undefined = undefined,
  timeout: number | undefined = 5000,
): Promise<any> {
  return new Promise((res, rej) => {
    const uid = server.uid as string;
    const from = uuidv4();

    let timeoutNode: NodeJS.Timeout | undefined = undefined;

    const fakeConn = {
      destroyed: false,
      socket: {
        OPEN: WebSocket.OPEN,
        readyState: WebSocket.OPEN as number,
        send: (msg: string) => {
          const json = JSON.parse(msg);
          if (timeoutNode !== undefined) clearTimeout(timeoutNode);

          fakeConn.destroyed = true;
          fakeConn.socket.readyState = WebSocket.CLOSED;
          fakeConn.socket.send = () => undefined;
          housekeepWSSessions(server, WSSessionType.CLIENT);

          res(json);
        },
      },
    };

    timeoutNode =
      typeof timeout === 'number'
        ? setTimeout(() => {
            fakeConn.destroyed = true;
            fakeConn.socket.readyState = WebSocket.CLOSED;
            fakeConn.socket.send = () => undefined;
            housekeepWSSessions(server, WSSessionType.CLIENT);

            rej('timeout');
          }, timeout)
        : undefined;

    let session = sessions[uid];
    if (session === undefined) {
      sessions[uid] = {
        [WSSessionType.CLIENT]: [],
        [WSSessionType.SERVER]: [],
      };
      session = sessions[uid];
    }

    if (session && session[WSSessionType.CLIENT] === undefined) {
      (sessions[uid] as any)[WSSessionType.CLIENT] = [];
    }

    const sessionData: SessionData = {
      id: from,
      conn: fakeConn as SocketStream,
      ip: req ? req.ip : '127.0.0.1',
    };

    (sessions[uid] as any)[WSSessionType.CLIENT].push(sessionData);

    if (packet.to === 'server' || packet.to === undefined) {
      const serverSessions = getWSSessions(server, WSSessionType.SERVER);
      serverSessions.map((n) => {
        if (checkSafeToSend(n.conn)) {
          n.conn.socket.send(
            JSON.stringify({
              ...packet,
              from,
            }),
          );
        }
      });
    }

    if (packet.to === API_SERVER_FROM || packet.to === undefined) {
      if (packet.payload) {
        processWSPayload(server, WSSessionType.CLIENT, from, packet.payload);
      }
    }
  });
}

export function checkSafeToSend(conn: SocketStream) {
  return conn && !conn.destroyed && conn.socket.readyState === conn.socket.OPEN;
}

export function isServerOnline(server: string | MCSVServer) {
  housekeepWSSessions(server, WSSessionType.SERVER);
  const sessions = getWSSessions(server, WSSessionType.SERVER);

  return sessions.length > 0;
}

function processWSPayload(server: string | MCSVServer, type: WSSessionType, from: string, payload: WSPayload): void {
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
