FROM node:20 as builder

COPY ./ /src/node-red-contrib-processcube

WORKDIR /src/node-red-contrib-processcube

RUN npm install

FROM nodered/node-red:latest

WORKDIR /data

COPY --from=builder /src/node-red-contrib-processcube /src/node-red-contrib-processcube

COPY nodered/package.json package.json
RUN npm install


ENTRYPOINT ["./node_modules/.bin/node-red", "--flowFile", "/nodered/node-red-contrib-processcube-flows.json", "--settings", "/nodered/settings.js"]
