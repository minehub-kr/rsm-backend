import { Server, ServerInvitation } from '@prisma/client';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FastifyRequestWithUser } from '../..';
import { prisma } from '../../../..';
import { APIError, sendError } from '../../../../common/error';
import { getServerInfo } from '../../../../common/server';
import { generateToken } from '../../../../common/token';
import invitationHandler from './handler';

const invitationsHandler = (app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) => {
  app.get('/', async (_req, rep) => {
    const req = _req as FastifyRequestWithUser;

    const invitations = await prisma.serverInvitation.findMany({
      where: {
        createdBy: req.isAdmin
          ? undefined
          : {
              sub: req.user.sub,
            },
      },
    });

    rep.send(
      await Promise.all(
        invitations.map(async (j) => ({
          ...j,
          createdBySub: undefined,
          serverUid: undefined,
          server: await getServerInfo(
            (await prisma.server.findUnique({
              where: {
                uid: j.serverUid,
              },
            })) as Server,
          ),
        })),
      ),
    );
  });

  app.post('/', async (_req, rep) => {
    const req = _req as FastifyRequestWithUser;

    const body = req.body as any;
    if (!body || !body.serverId || typeof body.serverId !== 'string') {
      return sendError(rep, APIError.INVALID_REQUEST, 'missing serverId');
    }

    const serverId = body.serverId as string;
    const sub = req.user.sub;

    const server = await prisma.server.findFirst({
      where: {
        owners: req.isAdmin
          ? undefined
          : {
              some: {
                sub,
              },
            },
        uid: serverId,
      },
    });

    if (!server) {
      return sendError(rep, APIError.NOT_FOUND);
    }

    let expiresAt: Date | undefined = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime())) expiresAt = new Date(new Date().setMinutes(new Date().getMinutes() + 30));

    const token = generateToken();

    await prisma.serverInvitation.create({
      data: {
        server: {
          connect: {
            uid: server.uid,
          },
        },
        expiresAt,
        createdBy: {
          connect: {
            sub: req.user.sub,
          },
        },
        token,
      },
    });

    rep.send({
      token,
    });
  });

  app.register(invitationHandler, { prefix: '/:token' });
  done();
};

export default invitationsHandler;
