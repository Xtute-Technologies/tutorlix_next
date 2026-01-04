# 1️⃣ Use an official Node.js image as the base
FROM node:18-alpine AS base

# 2️⃣ Set the working directory inside the container
WORKDIR /app

# 3️⃣ Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# 4️⃣ Install dependencies
RUN npm install

# 5️⃣ Copy the rest of your app source code
COPY . .
ENV NEXT_PUBLIC_API_URL=https://back.tutorlix.com/service-a/


# 6️⃣ Build the Next.js app
RUN npm run build

# 7️⃣ Use a smaller image for running the app
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10001

# Copy built files and node_modules from previous stage
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/public ./public

# 8️⃣ Expose port 10001
EXPOSE 10001

# 9️⃣ Start the app
CMD ["npm", "start"]
