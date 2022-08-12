import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { config, prisma } from '../../..';
import { APIError, sendError } from '../../../common/error';
import { getTokenFromRequest } from '../../../common/token';
import adminUsersPlugin from './users';
import adminServersPlugin from './servers';
import { getUser } from '../../../common/meiling';

const adminPlugin = (app: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void => {
  app.addHook('onRequest', async (req, rep) => {
    if (!config?.admin?.tokens) {
      sendError(rep, APIError.NOT_IMPLEMENTED);
      throw new Error();
    }
    const token = getTokenFromRequest(req);

    if (!token) {
      sendError(rep, APIError.TOKEN_NOT_FOUND, 'token not found');
      throw new Error();
    }

    if (!config.admin.tokens.includes(token.token)) {
      const user = await getUser(token.token);
      if (!user) {
        sendError(rep, APIError.INVALID_TOKEN, 'token is invalid');
        throw new Error();
      }

      const userDB = await prisma.user.findUnique({
        where: {
          sub: user.sub,
        },
      });

      if (!userDB || !userDB.isAdmin) {
        sendError(rep, APIError.INVALID_TOKEN, 'token is invalid');
        throw new Error();
      }
    }
  });

  app.get('/', async (req, rep) => {
    rep.send({
      at: 'admin',
    });
  });

  app.register(adminUsersPlugin, { prefix: '/users' });
  app.register(adminServersPlugin, { prefix: '/servers' });
  done();
};

export default adminPlugin;
