import { Server } from '@prisma/client';
import { SocketStream } from 'fastify-websocket';
import { prisma } from '../..';
import { isServerOnline } from '../../routes/v1/servers/ws/process';
import { sanitizeServer } from '../sanitize';

const auditWebsocketConn: SocketStream[] = [];

export async function getServerInfo(server: Server): Promise<any> {
  return {
    ...sanitizeServer(server),
    online: isServerOnline(server),
  };
}

function housekeepAuditWebsocket() {
  const closed = [];

  for (const conn of auditWebsocketConn) {
    let isOpen = false;
    if (conn.socket) {
      if (conn.socket.readyState !== conn.socket.CLOSED) isOpen = true;
    }

    closed.push(conn);
  }

  for (const conn of closed) {
    const i = auditWebsocketConn.indexOf(conn);

    if (i >= 0) auditWebsocketConn.splice(i, 1);
  }
}

export function registerAuditWebsocket(conn: SocketStream) {
  conn.socket.on('ping', (data) => {
    conn.socket.pong(data);
  });

  conn.socket.on('close', () => {
    housekeepAuditWebsocket();
  });

  auditWebsocketConn.push(conn);
}

export function broadcastToAudit(server: Server | string, type: string, packet: any) {
  for (const conn of auditWebsocketConn) {
    if (conn.socket && conn.socket.readyState === conn.socket.OPEN) {
      conn.socket.send(
        JSON.stringify({
          server: typeof server === 'string' ? server : server.uid,
          type,
          packet,
        }),
      );
    }
  }
}
