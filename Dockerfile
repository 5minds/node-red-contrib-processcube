FROM node:20 as builder


COPY ./externaltask /src/externaltask

WORKDIR /src/externaltask

RUN npm install


FROM nodered/node-red:latest

COPY --from=builder /src/externaltask /src/externaltask

RUN npm install /src/externaltask/
