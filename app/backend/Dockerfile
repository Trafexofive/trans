FROM node:20-slim

WORKDIR /usr/src/app

# Copy package manager files first to leverage Docker cache
COPY package*.json ./

# Explicitly clean old modules before installing
RUN rm -rf node_modules && npm install --no-optional

# Copy the rest of the application source code
COPY . .

CMD ["npm", "run", "server"]
