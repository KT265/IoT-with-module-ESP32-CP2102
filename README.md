# 🌱 AgroLogic: Smart Farming & Ecological Microclimate Management with AI

[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Database%20%7C%20Auth%20%7C%20Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![ESP32](https://img.shields.io/badge/ESP32-Arduino%20Framework-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TailwindCSS-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Gemini AI](https://img.shields.io/badge/AI%20Engine-Google%20Gemini%203.6%20Flash-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)

> **Hệ sinh thái Nông nghiệp Thông minh & Quản lý Vi khí hậu Tự động** kết hợp giữa IoT Phần cứng (ESP32), Cơ sở dữ liệu đám mây thời gian thực (Serverless Firebase) và Trí tuệ nhân tạo (Google Gemini AI) để tối ưu hóa chu trình tưới tiêu, dự báo dịch bệnh nông học và bảo vệ môi trường sinh thái.

---

## 📌 1. Điểm nổi bật của dự án (Key Features)

- **⚡ Kiến trúc Serverless 100% (0đ chi phí vận hành):** Loại bỏ hoàn toàn máy chủ trung gian. Dữ liệu truyền trực tiếp giữa ESP32 $\leftrightarrow$ Firebase Realtime Database $\leftrightarrow$ Web App với độ trễ dưới 100ms.
- **🔐 Đa người dùng & Phân quyền bảo mật (Multi-tenant Security):**
  - Đăng nhập 1 chạm bằng **Google Authentication**.
  - **Firebase Security Rules** bảo vệ độc lập: Người dùng chỉ xem/sửa được dữ liệu của chính mình.
  - **Chế độ Khách (Guest View 1 chạm):** Cho phép chia sẻ đường link (`?view=UID`) để bạn bè xem thời gian thực thông số cảm biến và thời tiết mà không sợ lộ API Key hay bị can thiệp vào máy bơm.
- **🧠 Bộ não AI Nông nghiệp (Google Gemini AI Engine):**
  - Tự động phân tích đa chiều: *Thông số cảm biến thực tế + Hồ sơ cây trồng (loại cây, giai đoạn sinh trưởng) + Dự báo thời tiết 5-7 ngày tới*.
  - Tự động phát hiện rủi ro dịch bệnh (sương mai, bọ trĩ, thán thư...) và đề xuất cách chăm sóc sinh học.
  - **Tự động đẩy ngưỡng tưới thông minh (Dynamic Trigger/Target)** xuống chip ESP32.
- **🛡️ Cơ chế Bơm nhấp nhả (Pulse Pumping) & Khóa an toàn phần cứng (Fail-safe):**
  - Bơm 5 giây $\rightarrow$ Nghỉ 5 giây chờ nước ngấm $\rightarrow$ Đo lại cảm biến.
  - Tự động ngắt và khóa động cơ vĩnh viễn sau 5 chu kỳ nếu đất không ẩm (chống cháy bơm khi cạn nước hoặc đứt ống).
- **📶 Cấu hình Wi-Fi & Bắt cặp thiết bị tiện lợi (Captive Portal WiFiManager):**
  - Cắm nguồn ESP32 $\rightarrow$ Kết nối Wi-Fi cấu hình `SmartFarm_Setup` $\rightarrow$ Nhập mật khẩu Wi-Fi và dán mã **User UID** $\rightarrow$ Tự động lưu vào bộ nhớ Flash (NVS Preferences).

---

## 🛠️ 2. Quy hoạch phần cứng (Hardware Pinout)

| Linh kiện | Chân cắm ESP32 | Chức năng |
| :--- | :--- | :--- |
| **DHT11** | `GPIO 15` | Đo nhiệt độ & độ ẩm không khí |
| **Cảm biến Độ ẩm đất (Capacitive/Resistive)** | `GPIO 32` (ADC1) | Đo lượng nước trong giá thể trồng |
| **Quang trở (LDR Module)** | `GPIO 34` (ADC1) | Đo cường độ ánh sáng (Nắng gắt / Râm mát) |
| **Cảm biến PIR (HC-SR501)** | `GPIO 25` | Phát hiện chuyển động (Xâm nhập khu vực thiên địch) |
| **Relay 5V + Bơm mini** | `GPIO 26` | Đóng/ngắt máy bơm tưới tiêu |
| **Mạch Buck LM2596** | Cấp nguồn 5V/3A | Ổn định nguồn điện, chống sụt áp khi khởi động bơm |

---

## 🏗️ 3. Sơ đồ luồng dữ liệu (Architecture Diagram)

```text
       ┌─────────────────────────────────────────────────────────┐
       │                FIREBASE CLOUD INFRASTRUCTURE            │
       │  - Authentication: Google Sign-in & Anonymous Auth      │
       │  - Realtime Database: /users/{UID}/[telemetry, control] │
       │  - Hosting: Web App Client-side                         │
       └─────────────────────────┬───────────────────────────────┘
                                 ▲
            ┌────────────────────┴────────────────────┐
            │                                         │
 [Realtime Stream & Telemetry]             [Google SDK / Client REST]
            │                                         │
            ▼                                         ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│        ESP32 HARDWARE        │          │       REACT WEB DASHBOARD    │
│ - WiFiManager + NVS Flash    │          │ - AgroLogic Design System    │
│ - Pulse Pumping & Fail-safe  │          │ - Gemini 3.6 Flash Engine    │
│ - Sensors: DHT, Soil, LDR    │          │ - OpenWeatherMap 7-Day Sync  │
│ - Anonymous Auth Session     │          │ - 1-Click Guest Share Link   │
└──────────────────────────────┘          └──────────────────────────────┘

---
## 📂 4. Cấu trúc thư mục dự án (Project Structure)
---
├── src/
│   └── main.cpp                  # Firmware ESP32 (Firebase RTDB + WiFiManager)
├── platformio.ini                # Cấu hình nạp code & thư viện PlatformIO
├── frontend/
│   ├── index.html                # Single Page Entrypoint
│   ├── package.json              # Quản lý thư viện React, Vite, Firebase
│   ├── vite.config.js            # Cấu hình Vite Build Tool
│   ├── tailwind.config.js        # Cấu hình Theme màu AgroLogic
│   ├── firebase.json             # Cấu hình Firebase Hosting
│   └── src/
│       ├── App.jsx               # Component trung tâm quản lý State & Route
│       ├── services/
│       │   └── firebase.js       # Khởi tạo Firebase SDK & Database Service
│       └── components/
│           ├── layout/           # Header, Sidebar, AuthModal, Toast
│           ├── dashboard/        # SensorCard, AiControlCard, PumpStationCard
│           ├── analytics/        # MetricChart (Chart.js), ForecastTable
│           └── settings/         # ConnectionSettings, FarmProfileSettings
└── README.md
