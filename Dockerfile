FROM node:latest

ADD package.json /opt/
WORKDIR /opt/
RUN npm install
ADD . /opt

CMD [ "node", "index.js" ]
