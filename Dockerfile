FROM node:22
ENV NODE_ENV production

WORKDIR /app

COPY . .

RUN yarn --production=false
RUN cd /app && yarn build
RUN yarn generate

CMD ["node", "./dist/"]
