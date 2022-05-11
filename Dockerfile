FROM mhart/alpine-node:14

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

WORKDIR /app

COPY . .

# RUN mv package-prod.json package.json
# RUN mv production/.npmrc .npmrc 

RUN yarn --frozen-lockfile

RUN yarn build:prod

EXPOSE 3000

CMD ["yarn", "start:prod"]
