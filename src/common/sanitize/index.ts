import { Server } from '.prisma/client';

export function sanitizeServer(server: Server) {
  return {
    uid: server.uid,
    name: server.name,

    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
}
