FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start script: run migrations, seed, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/index.js"]
