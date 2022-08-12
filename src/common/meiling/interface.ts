export enum OAuth2ErrorResponseType {
  INVALID_REQUEST = 'invalid_request',
  INVALID_CLIENT = 'invalid_client',
  INVALID_GRANT = 'invalid_grant',
  UNAUTHORIZED_CLIENT = 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',
  INVALID_SCOPE = 'invalid_scope',
}

export interface MeilingV1OAuthOpenIDData {
  sub: string;
  iss: string;
  aud: string;
  nonce?: string;
  auth_time: string;
  iat: number;
  exp: number;
  name: string;
  preferred_username: string;
  picture: string;

  family_name?: string;
  given_name?: string;
  middle_name?: string;
  nickname?: string;

  email?: string;
  email_verified?: boolean;

  phone?: string;
  phone_verified?: boolean;
}

export interface MeilingV1OAuthAccessTokenInfo {
  access_token: string;
  token_type: string;
  expires_in: string;
  scope: string;
}
