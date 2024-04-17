FROM node:20 as builder


COPY ./node-red-contrib-processcube /src/node-red-contrib-processcube

WORKDIR /src/node-red-contrib-processcube

RUN npm install


FROM nodered/node-red:latest

RUN npm install node-red-contrib-graphql
RUN npm install openapi-red
RUN npm install node-red-contrib-postgresql

COPY --from=builder /src/node-red-contrib-processcube /src/node-red-contrib-processcube

RUN npm install /src/node-red-contrib-processcube/
