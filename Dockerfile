FROM node:20 as builder


COPY ./externaltask /src/externaltask

WORKDIR /src/externaltask

RUN npm install


FROM nodered/node-red:latest

COPY --from=builder /src/externaltask /src/externaltask

RUN npm install node-red-contrib-graphql
RUN npm install openapi-red
RUN npm install node-red-contrib-postgresql


RUN npm install /src/externaltask/
