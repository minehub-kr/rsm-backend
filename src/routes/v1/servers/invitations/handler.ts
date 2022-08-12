import { Server, ServerInvitation } from '@prisma/client';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FastifyRequestWithUser } from '../..';
import { prisma } from '../../../..';
import { sendError, APIError } from '../../../../common/error';
import { getServerInfo } from '../../../../common/server';

interface FastifyRequestWithInvitation extends FastifyRequestWithUser {
  invitation: ServerInvitation;
  isCreator: boolean;
}

const invitationHandler = (app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) => {
  app.addHook('onRequest', async (_req, rep) => {
    const req = _req as FastifyRequestWithUser;
    const token = (req.params as any)['token'];

    const invitation = (await prisma.serverInvitation.findUnique({
      where: {
        token,
      },
    })) as ServerInvitation;

    if (!invitation) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error('not_found');
    }

    const isCreator = req.user.sub === invitation.createdBySub || req.isAdmin;

    if (invitation.expiresAt && !isCreator) {
      if (invitation.expiresAt.getTime() < new Date().getTime()) {
        sendError(rep, APIError.EXPIRED_INVITATION);
        throw new Error('expired_invitation');
      }
    }

    if (invitation.usedAt !== null && !isCreator) {
      sendError(rep, APIError.USED_INVITATION);
      throw new Error('used_invitation');
    }

    (_req as FastifyRequestWithInvitation).invitation = invitation;
    (_req as FastifyRequestWithInvitation).isCreator = isCreator;
  });

  app.get('/', async (_req, rep) => {
    const req = _req as FastifyRequestWithInvitation;
    const invitation = req.invitation;

    const server = (await prisma.server.findUnique({
      where: {
        uid: invitation.serverUid,
      },
    })) as Server;

    rep.send({
      ...invitation,
      createdBySub: undefined,
      serverUid: undefined,
      server: await getServerInfo(server),
      isCreator: req.isCreator,
    });
  });

  app.get('/join', async (_req, rep) => {
    const req = _req as FastifyRequestWithInvitation;
    const invitation = req.invitation;

    const owners = await prisma.user.findMany({
      where: {
        ownedServers: {
          some: {
            uid: invitation.serverUid,
          },
        },
      },
    });

    const ownerSubs = owners.map((n) => n.sub);
    if (!ownerSubs.includes(req.user.sub)) {
      ownerSubs.push(req.user.sub);
    }

    await prisma.server.update({
      where: {
        uid: invitation.serverUid,
      },
      data: {
        owners: {
          connect: ownerSubs.map((n) => ({ sub: n })),
        },
      },
    });

    await prisma.serverInvitation.update({
      where: {
        token: invitation.token,
      },
      data: {
        usedAt: new Date(),
      },
    });

    rep.send({ success: true });
  });

  app.get('/revoke', async (_req, rep) => {
    const req = _req as FastifyRequestWithInvitation;
    const invitation = req.invitation;

    if (req.isCreator) {
      await prisma.serverInvitation.update({
        where: {
          token: invitation.token,
        },
        data: {
          expiresAt: new Date(0),
        },
      });

      rep.send({
        success: true,
      });
    } else {
      sendError(rep, APIError.INSUFFICIENT_PERMISSION);
    }
  });

  app.delete('/', async (_req, rep) => {
    const req = _req as FastifyRequestWithInvitation;
    const invitation = req.invitation;

    if (req.isCreator) {
      await prisma.serverInvitation.delete({
        where: {
          token: invitation.token,
        },
      });

      rep.send({ success: true });
    } else {
      return sendError(rep, APIError.INSUFFICIENT_PERMISSION);
    }
  });

  done();
};

export default invitationHandler;
