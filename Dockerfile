FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p uploads/releases

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "src/server.js"]