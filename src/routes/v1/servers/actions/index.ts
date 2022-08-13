import { Server as MCSVServer } from '@prisma/client';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FastifyRequestWithUser } from '../..';
import { prisma } from '../../../..';
import { APIError, API_SERVER_FROM, sendError } from '../../../../common/error';
import { MCSVClientV1Actions } from '../ws/actions';
import { runPacket, runPayload } from '../ws/handler';
import { isServerOnline } from '../ws/process';

interface FastifyWebsocketCommandRequestWithServer extends FastifyRequestWithUser {
  server: MCSVServer;
}

function serverQueryActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) {
  app.addHook('onRequest', async (req, rep) => {
    const uuid = (req.params as { uuid: string }).uuid;
    const server = await prisma.server.findUnique({
      where: {
        uid: uuid,
      },
    });

    if (!server) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error(APIError.NOT_FOUND);
    }
    (req as FastifyWebsocketCommandRequestWithServer).server = server;

    if (!isServerOnline(server)) {
      sendError(rep, APIError.SERVER_IS_OFFLINE);
      throw new Error(APIError.SERVER_IS_OFFLINE);
    }
  });

  app.get('/players', async (_req, rep) => {
    const req = _req as FastifyWebsocketCommandRequestWithServer;

    try {
      const result = await runPayload(req.server, {
        action: MCSVClientV1Actions.GET_PLAYERS,
        data: {},
      });

      if (result.error === 'java_exception' && result.exception) {
        rep.status(500);
      }

      rep.send(result);
    } catch (e) {
      console.error('players process error:', e);
      sendError(rep, APIError.REQUEST_TIMED_OUT, (e as Error).toString());
    }
  });

  app.get('/info', async (_req, rep) => {
    const req = _req as FastifyWebsocketCommandRequestWithServer;

    try {
      const result = await runPayload(req.server, {
        action: MCSVClientV1Actions.GET_SERVER_METADATA,
        data: {},
      });

      if (result.error === 'java_exception' && result.exception) {
        rep.status(500);
      }

      rep.send(result);
    } catch (e) {
      console.error('info process error:', e);
      sendError(rep, APIError.REQUEST_TIMED_OUT, (e as Error).toString());
    }
  });

  app.get('/performance', async (_req, rep) => {
    const req = _req as FastifyWebsocketCommandRequestWithServer;

    try {
      const result = await runPayload(req.server, {
        action: MCSVClientV1Actions.GET_SERVER_PERFORMANCE,
        data: {},
      });

      if (result.error === 'java_exception' && result.exception) {
        rep.status(500);
      }

      rep.send(result);
    } catch (e) {
      console.error('info process error:', e);
      sendError(rep, APIError.REQUEST_TIMED_OUT, (e as Error).toString());
    }
  });

  app.get('/bukkit', async (_req, rep) => {
    const req = _req as FastifyWebsocketCommandRequestWithServer;

    try {
      const result = await runPayload(req.server, {
        action: MCSVClientV1Actions.GET_BUKKIT_INFO,
        data: {},
      });

      if (result.error === 'java_exception' && result.exception) {
        rep.status(500);
      }

      rep.send(result);
    } catch (e) {
      console.error('bukkit process error:', e);
      sendError(rep, APIError.REQUEST_TIMED_OUT, (e as Error).toString());
    }
  });

  app.get('/ip', async (_req, rep) => {
    const req = _req as FastifyWebsocketCommandRequestWithServer;

    try {
      const result = await runPacket(req.server, {
        to: API_SERVER_FROM,
        payload: {
          action: 'get_server_ip',
        },
      });

      if (result.payload.error === 'java_exception' && result.payload.exception) {
        rep.status(500);
      }

      rep.send(result.payload);
    } catch (e) {
      console.error('ip process error:', e);
      sendError(rep, APIError.REQUEST_TIMED_OUT, (e as Error).toString());
    }
  });

  done();
}

export default serverQueryActionsPlugin;
