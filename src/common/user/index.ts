import { prisma } from '../..';
import { MeilingV1OAuthOpenIDData } from '../meiling/interface';

export async function checkIsAdmin(id_token: MeilingV1OAuthOpenIDData): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      sub: id_token.sub,
      isAdmin: true,
    },
  });

  if (user === null) {
    return false;
  }

  return true;
}

export async function createUserIfNotExist(id_token: MeilingV1OAuthOpenIDData): Promise<void> {
  const user = await prisma.user.findUnique({
    where: {
      sub: id_token.sub,
    },
  });

  if (user === null) {
    await prisma.user.create({
      data: {
        sub: id_token.sub,
      },
    });
  }
}

export async function updateLastAuthorized(id_token: MeilingV1OAuthOpenIDData, saveUserData = true): Promise<void> {
  await prisma.user.update({
    where: {
      sub: id_token.sub,
    },
    data: {
      id_token: saveUserData ? (id_token as any) : undefined,
      lastAuthorized: new Date(),
    },
  });
}
