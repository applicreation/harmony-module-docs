FROM node:lts-alpine

WORKDIR /app

COPY ./app /app

RUN npm install

EXPOSE 80

CMD ["node", "index.js"]
