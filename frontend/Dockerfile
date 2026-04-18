FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# 🔥 IMPORTANT
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
