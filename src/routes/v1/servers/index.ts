import { Server } from '@prisma/client';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FastifyRequestWithUser } from '..';
import { prisma } from '../../..';
import { APIError, sendError } from '../../../common/error';
import { getServerInfo } from '../../../common/server';
import serverQueryActionsPlugin from './actions';
import invitationsHandler from './invitations';
import serverWebsocketPlugin from './ws';
import { runPacket } from './ws/handler';
import { isServerOnline } from './ws/process';

interface ServerCreateBody {
  name?: string;
}

const serversPlugin = (app: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void => {
  app.get('/', async (_req, rep) => {
    const req = _req as FastifyRequestWithUser;

    const user = req.user;

    const servers = await prisma.server.findMany({
      where: {
        ...(user ? {
          owners: {
            some: {
              sub: user.sub,
            },
          },
        } : {})
      },
    });

    rep.send(await Promise.all(servers.map((n) => getServerInfo(n))));
  });

  app.post('/', async (_req, rep) => {
    const req = _req as FastifyRequestWithUser;
    const body = req.body as ServerCreateBody;

    const user = req.user;

    if (!user) {
      sendError(rep, APIError.INVALID_REQUEST);
      return;
    }

    if (!body) {
      sendError(rep, APIError.INVALID_REQUEST);
      return;
    }

    if (!body.name || body.name.trim().length === 0) {
      sendError(rep, APIError.INVALID_REQUEST);
      return;
    }

    const server = await prisma.server.create({
      data: {
        name: body.name,
        owners: {
          connect: [
            {
              sub: user.sub,
            },
          ],
        },
      },
    });

    rep.send(await getServerInfo(server));
  });

  app.register(serverActionsPlugin, { prefix: '/:uuid' });
  app.register(invitationsHandler, { prefix: '/invitations' });

  done();
};

interface ServerInfoUpdateQuery {
  name?: string;
}

const serverActionsPlugin = (app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) => {
  app.addHook('onRequest', async (_req, rep) => {
    const req = _req as FastifyRequestWithUser;
    const uuid = (req.params as { uuid: string }).uuid;

    const sub = req.user ? req.user.sub : '';

    const server = await prisma.server.findFirst({
      where: {
        owners: req.isAdmin
          ? undefined
          : {
              some: {
                sub,
              },
            },
        uid: uuid,
      },
    });

    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error('not found');
    }
  });

  app.get('/', async (req, rep) => {
    const uuid = (req.params as { uuid: string }).uuid;
    const server = await prisma.server.findFirst({
      where: {
        uid: uuid,
      },
    });

    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      return;
    }

    rep.send(await getServerInfo(server));
  });

  app.put('/', async (req, rep) => {
    const uuid = (req.params as { uuid: string }).uuid;
    const server = await prisma.server.findFirst({
      where: {
        uid: uuid,
      },
    });

    const body = req.body as ServerInfoUpdateQuery;
    if (!body) {
      sendError(rep, APIError.INVALID_REQUEST);
    }

    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      return;
    }

    await prisma.server.update({
      where: {
        uid: uuid,
      },
      data: {
        name: body.name,
        updatedAt: new Date(),
      },
    });

    rep.send(await getServerInfo(server));
  });

  app.delete('/', async (req, rep) => {
    const uuid = (req.params as { uuid: string }).uuid;
    const server = (await prisma.server.findFirst({
      where: {
        uid: uuid,
      },
    })) as Server;

    const isRunning = await isServerOnline(server);

    if (isRunning) return sendError(rep, APIError.INVALID_REQUEST, 'server is still on');

    await prisma.serverInvitation.deleteMany({
      where: {
        server: {
          uid: uuid,
        },
      },
    });

    await prisma.server.deleteMany({
      where: {
        uid: uuid,
      },
    });

    rep.send({ success: true });
  });

  app.get('/online', async (req, rep) => {
    const uuid = (req.params as { uuid: string }).uuid;
    const server = await prisma.server.findFirst({
      where: {
        uid: uuid,
      },
    });

    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      return;
    }

    const result = await runPacket(
      server,
      {
        to: 'mcsv',
        payload: {
          action: 'is_server_online',
        },
      },
      req,
    );

    rep.send({
      online: result.payload.response,
    });
  });

  app.register(serverQueryActionsPlugin);
  app.register(serverWebsocketPlugin, { prefix: '/ws' });

  done();
};

export default serversPlugin;
