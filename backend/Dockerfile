FROM node:20-alpine

# Set timezone
ENV TZ=Asia/Jakarta
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && apk del tzdata

# Buat direktori kerja
WORKDIR /app

# Copy package.json dan install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source code
COPY . .

# Expose port backend
EXPOSE 4000

# Start server
CMD ["npm", "start"]
