import { FastifyInstance } from 'fastify';
import { isDevelopment, packageJson } from '..';
import v1Handler from './v1';

export function registerRootEndpoints(app: FastifyInstance): void {
  app.get('/', (req, rep) => {
    rep.send({
      hello: 'world',
      about: {
        name: packageJson.name,
        description: packageJson.description,
        version: isDevelopment ? packageJson.version : undefined,
        repository: isDevelopment ? packageJson.repository : undefined,
      },
    });
  });

  app.register(v1Handler, { prefix: '/v1' });
}
