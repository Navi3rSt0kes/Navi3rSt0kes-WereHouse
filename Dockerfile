FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY data ./data

ENV NODE_ENV=production
EXPOSE 8000

CMD ["npm", "run", "start"]
