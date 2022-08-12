/* eslint-disable @typescript-eslint/no-var-requires */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'MinehubRSM',
      cwd: '.',
      script: 'yarn',
      args: ['start'],
      env: {
        // You should configure it here.
        NODE_ENV: 'production',

        ...process.env,
      },
    },
  ],

  deploy: {
    production: {
      user: process.env.DEPLOY_PRODUCTION_USER,
      host: process.env.DEPLOY_PRODUCTION_HOST,
      ref: 'origin/main',
      repo: 'git@github.com:minehub-kr/minehub-rsm.git',
      path: process.env.DEPLOY_PRODUCTION_PATH,
      'pre-deploy-local': `scp -Cr ./.env ${process.env.DEPLOY_PRODUCTION_USER}@${process.env.DEPLOY_PRODUCTION_HOST}:${process.env.DEPLOY_PRODUCTION_PATH}/current`,
      'post-deploy': `yarn && yarn prisma generate && yarn build && pm2 startOrRestart ecosystem.config.js`,
    },
  },
};
