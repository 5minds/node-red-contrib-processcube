FROM node:20 as builder

COPY ./ /src/node-red-contrib-processcube

WORKDIR /src/node-red-contrib-processcube

RUN npm install

FROM nodered/node-red:latest

WORKDIR /data

COPY --from=builder /src/node-red-contrib-processcube /src/node-red-contrib-processcube

RUN npm install /src/node-red-contrib-processcube/

COPY nodered/package.json package.json
RUN npm install

COPY nodered/node-red-contrib-processcube-flows.json node-red-contrib-processcube-flows.json

ENTRYPOINT ["./node_modules/.bin/node-red", "--flowFile", "/data/node-red-contrib-processcube-flows.json"]
