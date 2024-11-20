FROM node:22
ENV NODE_ENV production

WORKDIR /app

COPY . .

RUN yarn
RUN yarn build --production=false

CMD ["node", "./dist/"]
