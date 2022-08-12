import { Server } from '@prisma/client';
import { prisma } from '../..';
import { isServerOnline } from '../../routes/v1/servers/ws/handler';
import { sanitizeServer } from '../sanitize';

export async function getServerInfo(server: Server): Promise<any> {
  return {
    ...sanitizeServer(server),
    online: isServerOnline(server),
  };
}
