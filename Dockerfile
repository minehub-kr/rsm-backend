FROM node:22
ENV NODE_ENV production

WORKDIR /app

COPY . .

RUN yarn
RUN yarn build

CMD ["node", "./dist/"]