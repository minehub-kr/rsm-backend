export interface RegexConfig {
  pattern: string;
  flags: string;
}

export function parseRegexConfig(config: RegexConfig) {
  return new RegExp(config.pattern, config.flags);
}

export interface Config {
  oauth2: {
    userinfo: string;
    tokeninfo: string;
    permissions: {
      required: string[];
    };
  };
  fastify: {
    listen: number | string;
    unixSocket?: {
      chown?: {
        uid?: number;
        gid?: number;
      };
      chmod?: number;
    };
    proxy?: {
      allowedHosts?: string[];
    };
  };
  admin: {
    tokens: string[];
  };
}
