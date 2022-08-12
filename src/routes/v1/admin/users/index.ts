import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../../..';
import { sendError, APIError } from '../../../../common/error';

const adminUsersPlugin = (app: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void => {
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

    const users = await prisma.user.findMany({
      where: prismaQuery,
    });

    rep.send(users);
  });

  app.register(adminUserPlugin, { prefix: '/:userId' });

  done();
};

const adminUserPlugin = (app: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void => {
  app.addHook('onRequest', async (req, rep) => {
    const userId = (req.params as any).userId;
    if (!userId) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error();
    }

    const user = await prisma.user.findUnique({
      where: {
        sub: userId,
      },
    });
    if (!user) {
      sendError(rep, APIError.NOT_FOUND);
      throw new Error();
    }

    (req as any).user = user;
  });

  app.get('/', (req, rep) => {
    const user = (req as any).user;
    rep.send(user);
  });

  app.put('/', async (req, rep) => {
    const user = (req as any).user;
    const body = (req.body as any) || {};

    const moddedUser = await prisma.user.updateMany({
      where: {
        sub: user.sub,
      },
      data: {
        ...body,
      },
    });

    rep.status(201).send(moddedUser);
  });

  done();
};

export default adminUsersPlugin;
