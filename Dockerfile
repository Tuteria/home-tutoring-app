FROM mhart/alpine-node:14

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

WORKDIR /app

COPY . .

RUN mv package-prod.json package.json

RUN yarn install

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start:prod"]
