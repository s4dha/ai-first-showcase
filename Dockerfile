FROM node:18

COPY package.json package-lock.json* ./

RUN npm install

WORKDIR /app

COPY . .

RUN npm run build

RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]

