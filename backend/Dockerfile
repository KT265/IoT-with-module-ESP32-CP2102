# Sử dụng Python phiên bản gọn nhẹ (Slim)
FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Ngăn Python ghi file .pyc và bật chế độ in log trực tiếp ra console
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Cài đặt các thư viện cần thiết
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn backend vào container
COPY . .

# Google Cloud Run tự động cấp biến môi trường PORT (mặc định 8080)
ENV PORT=8080

# Chạy FastAPI thông qua Uvicorn
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}