FROM nodered/node-red:4.0.2

RUN npm install node-red-debugger@^1.1.1

COPY ./ /src/node-red-contrib-processcube/

RUN npm install /src/node-red-contrib-processcube/

ENTRYPOINT ["./entrypoint.sh"]
