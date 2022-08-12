import axios, { AxiosResponse } from 'axios';
import { config } from '../../';
import { MeilingV1OAuthAccessTokenInfo, MeilingV1OAuthOpenIDData } from './interface';

function handleAxiosError(e: any): AxiosResponse | undefined {
  const response = e.response as AxiosResponse;
  if (response) {
    return response;
  } else {
    return undefined;
  }
}

export function generateGetVariables(data: Record<string, string>) {
  let str = '';
  for (const name in data) {
    str += `&${encodeURIComponent(name)}=${encodeURIComponent(data[name])}`;
  }
  str = str.replace(/^&/g, '?');
  return str;
}

export async function getUser(accessToken: string): Promise<MeilingV1OAuthOpenIDData | false> {
  try {
    const data = await axios.get(config.oauth2.userinfo, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });
    const tokenInfo = data.data as MeilingV1OAuthOpenIDData;

    return tokenInfo;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function getToken(accessToken: string): Promise<MeilingV1OAuthAccessTokenInfo | undefined> {
  try {
    const data = await axios.get(config.oauth2.tokeninfo, {
      params: {
        access_token: accessToken,
      },
    });
    const tokenInfo = data.data as MeilingV1OAuthAccessTokenInfo;

    return tokenInfo;
  } catch (e) {
    return;
  }
}

export async function permCheck(accessToken: string, permissions: string[]): Promise<boolean | undefined> {
  const tokenInfo = await getToken(accessToken);
  if (!tokenInfo) return;

  const scopes = tokenInfo.scope.split(' ');

  for (const permission of permissions) {
    if (!scopes.includes(permission)) {
      return false;
    }
  }

  return true;
}
