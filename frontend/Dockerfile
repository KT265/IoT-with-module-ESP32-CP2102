# Stage 1: Build mã nguồn React sang thư mục dist
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Sử dụng Nginx Alpine siêu nhẹ (~20MB) để phục vụ Web
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cổng mặc định của Google Cloud Run
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]