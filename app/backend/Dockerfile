
FROM node:20-slim

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

RUN npm install --no-optional
# RUN npm i 

# lean
# RUN npm ci --only=production

COPY . .

# Define the command to run your application
# This will execute "npm run server" which is defined in your package.json
# as "node ./src/app.js"

CMD ["npm", "run", "server"]
