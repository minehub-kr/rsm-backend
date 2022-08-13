import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../../..';
import { sendError, APIError } from '../../../../common/error';
import { registerAuditWebsocket } from '../../../../common/server';
import { isServerOnline } from '../../servers/ws/process';

const adminServersPlugin = (app: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void => {
  app.get('/', async (req, rep) => {
    const { query } = (req.query as any) || {};

    let prismaQuery = undefined;
    if (query !== undefined) {
      try {
        prismaQuery = JSON.parse(query);
      } catch (e) {
        sendError(rep, APIError.INVALID_REQUEST, 'invalid prisma query');
        return;
      }
    }

    const servers = await prisma.server.findMany({
      where: prismaQuery,
    });

    rep.send(servers.map(n => ({
      ...n,
      online: isServerOnline(n),
    })));
  });

  app.get('/audit', { websocket: true }, async (conn, req) => {
    registerAuditWebsocket(conn);

    conn.socket.send(
      JSON.stringify({
        hello: 'world',
        minehub_rms: 'audit_endpoint',
      }),
    );
  });

  app.register(adminServerPlugin, { prefix: '/:serverId' });

  done();
};

const adminServerPlugin = (app: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void => {
  app.addHook('onRequest', async (req, rep) => {
    const serverId = (req.params as any).serverId;
    if (!serverId) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error();
    }

    const server = await prisma.server.findUnique({
      where: {
        uid: serverId,
      },
    });
    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error();
    }

    (req as any).server = server;
  });

  app.get('/', (req, rep) => {
    const server = (req as any).server;
    rep.send(server);
  });

  app.put('/', async (req, rep) => {
    const server = (req as any).server;
    const body = (req.body as any) || {};

    const moddedServer = await prisma.server.updateMany({
      where: {
        uid: server.uid,
      },
      data: {
        ...body,
      },
    });

    rep.status(201).send(moddedServer);
  });

  done();
};

export default adminServersPlugin;
