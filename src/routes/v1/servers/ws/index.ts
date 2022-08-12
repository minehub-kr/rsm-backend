import { Server as MCSVServer } from '@prisma/client';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FastifyRequestWithUser } from '../..';
import { prisma } from '../../../..';
import { APIError, sendError } from '../../../../common/error';
import { addWSSession, getWSSessions, housekeepWSSessions, WSSessionType } from './sessions';

interface FastifyRequestWithServer extends FastifyRequestWithUser {
  server: MCSVServer;
}

function serverWebsocketPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) {
  app.addHook('onRequest', async (req, rep) => {
    const uuid = (req.params as { uuid: string }).uuid;
    const server = await prisma.server.findUnique({
      where: {
        uid: uuid,
      },
    });

    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error('server_not_found');
    }

    (req as FastifyRequestWithServer).server = server;
  });

  app.get('/', (req, rep) => {
    rep.send({
      version: 1,
      endpoints: {
        client: '/client',
        server: '/server',
      },
    });
  });

  app.get('/client', { websocket: true }, async (conn, req) => {
    const server = (req as FastifyRequestWithServer).server;

    housekeepWSSessions(server, WSSessionType.CLIENT);
    addWSSession(server, WSSessionType.CLIENT, conn, req);
  });

  app.get('/server', { websocket: true }, async (conn, req) => {
    const server = (req as FastifyRequestWithServer).server;

    const prevSession = getWSSessions(server, WSSessionType.SERVER);
    if (prevSession.length > 0) {
      // remove sessions
      prevSession.map((n) =>
        n.conn.socket.close(
          409,
          JSON.stringify({ error: 'conflict', message: 'new server websocket session created' }),
        ),
      );
    }

    housekeepWSSessions(server, WSSessionType.SERVER);
    addWSSession(server, WSSessionType.SERVER, conn, req);
  });

  done();
}

export default serverWebsocketPlugin;
