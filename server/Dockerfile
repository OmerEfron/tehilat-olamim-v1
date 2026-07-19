FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY shared ./shared
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json

EXPOSE 3001
CMD ["npm", "start"]
