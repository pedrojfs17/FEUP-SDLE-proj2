FROM node:alpine

WORKDIR /app

COPY --chown=node:node . ./

RUN npm install --silent

CMD ["npm", "run", "start"]
