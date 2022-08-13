import { SocketStream } from 'fastify-websocket';

export interface WSPayload {
  action: string;
  data: any;
}

export function checkSafeToSend(conn: SocketStream) {
  return conn && !conn.destroyed && conn.socket.readyState === conn.socket.OPEN;
}
