# Use official Node.js LTS image
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"] 