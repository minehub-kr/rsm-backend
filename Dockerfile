FROM node:22
ENV NODE_ENV production

WORKDIR /app

COPY . .

RUN yarn --production=false
RUN yarn build
RUN generate

CMD ["node", "./dist/"]
