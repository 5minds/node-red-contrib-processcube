FROM nodered/node-red:latest
USER root


RUN mkdir ./custom
COPY ./custom/ ./usr/src/node-red/custom/

WORKDIR /usr/src/node-red
RUN npm install ./usr/src/node-red/custom/

# COPY ./node-red-data/package.json /data/package.json
# RUN npm install

# COPY ./node-red-data/node-red-contrib-processcube-flows.json /data/node-red-contrib-processcube-flows.json


# WORKDIR /data
# COPY ./node-red-data/package.json /data
# RUN npm install
# WORKDIR /usr/src/node-red

# Copy _your_ Node-RED project files into place
# NOTE: This will only work if you DO NOT later mount /data as an external volume.
#       If you need to use an external volume for persistence then
#       copy your settings and flows files to that volume instead.
# COPY settings.js /data/settings.js
# COPY flows_cred.json /data/flows_cred.json
# COPY flows.json /data/flows.json


# COPY ./node-red-data/package.json /data/package.json
# RUN npm install

# COPY ./node-red-data/settings.js /data/settings.js
# COPY ./node-red-data/node-red-contrib-processcube-flows.json /data/node-red-contrib-processcube-flows.json

# ENTRYPOINT ["./node_modules/.bin/node-red", "--flowFile", "/data/node-red-contrib-processcube-flows.json"]
