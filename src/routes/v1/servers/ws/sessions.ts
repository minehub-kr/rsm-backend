import { Server as MCSVServer } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { SocketStream } from 'fastify-websocket';
import { v4 as uuidv4 } from 'uuid';
import { registerHandler, checkSafeToSend } from './handler';

export enum WSSessionType {
  SERVER = 'server',
  CLIENT = 'client',
}

export interface SessionData {
  conn: SocketStream;
  id: string;
  ip: string;
}

interface SessionsByServer {
  [id: string]: undefined | Record<WSSessionType, SessionData[] | undefined>;
}

export const sessions: SessionsByServer = {};

export function housekeepWSSessions(server: MCSVServer | string, type?: WSSessionType): void {
  const uid = typeof server === 'string' ? server : server.uid;
  if (sessions[uid] === undefined) return;

  if (type) {
    (sessions[uid] as any)[type] = ((sessions[uid] as any)[type] as SessionData[]).filter((n) =>
      checkSafeToSend(n.conn),
    );
  } else {
    housekeepWSSessions(server, WSSessionType.CLIENT);
    housekeepWSSessions(server, WSSessionType.SERVER);
  }

  return;
}

export function getWSSessions(server: MCSVServer | string, type?: WSSessionType): SessionData[] {
  const uid = typeof server === 'string' ? server : server.uid;

  const serverSessions = sessions[uid];
  if (!serverSessions) return [];

  const res = [];
  if (type) {
    res.push(...(serverSessions[type] ?? []));
  } else {
    res.push(...getWSSessions(WSSessionType.CLIENT));
    res.push(...getWSSessions(WSSessionType.SERVER));
  }

  return res;
}

export function getWSSessionById(
  server: MCSVServer | string,
  id: string,
  type?: WSSessionType,
): SessionData | undefined {
  const res = getWSSessions(server, type);
  const result = res.find((n) => n.id === id);

  return result;
}

export function addWSSession(
  server: MCSVServer | string,
  type: WSSessionType,
  conn: SocketStream,
  req: FastifyRequest,
): void {
  const uid = typeof server === 'string' ? server : server.uid;

  if (!sessions[uid]) {
    sessions[uid] = {
      [WSSessionType.CLIENT]: [],
      [WSSessionType.SERVER]: [],
      [type]: [conn],
    };
  }

  const uuid = uuidv4();
  const sessionData: SessionData = {
    id: uuid,
    conn,
    ip: req.ip,
  };

  registerHandler(server, type, sessionData);

  (sessions[uid] as any)[type]?.push(sessionData);
}
