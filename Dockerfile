FROM node:20 as builder


COPY ./ /src/node-red-contrib-processcube

WORKDIR /src/node-red-contrib-processcube

RUN npm install


FROM nodered/node-red:latest

RUN npm install node-red-contrib-graphql
RUN npm install openapi-red@1.2.5
RUN npm install node-red-contrib-postgresql
RUN npm install node-red-contrib-uibuilder

COPY --from=builder /src/node-red-contrib-processcube /src/node-red-contrib-processcube

RUN npm install /src/node-red-contrib-processcube/
