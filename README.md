# IoT-with-module-ESP32-CP2102-Topic-Application-of-IoT-in-breeding-and-managing-natural-enemies
🌱 Smart Farm V2 Pro Max: Nông Nghiệp Sinh Thái & Quản Lý Thiên Địch

📌 Giới thiệu dự án (Project Overview)

Bạn quá mệt mỏi với việc hệ thống tưới tự động cứ "mù quáng" xả nước dù trời đang mưa ngập mặt? Bạn muốn bảo vệ những chú bọ rùa ("thiên địch") khỏi cái nóng cháy da thịt?

Dự án "Ứng dụng IoT trong ươm trồng và quản lý thiên địch" không chỉ là một chiếc công tắc hẹn giờ rẻ tiền. Đây là một hệ thống khép kín biết "suy nghĩ" với:

Khả năng gọi API dự báo thời tiết để từ chối tưới khi trời sắp mưa.

Cơ chế bơm nhấp nhả (Pulse Pumping) và Fail-safe tự động khóa động cơ khi cạn bồn nước.

Tính năng Trọng số môi trường, tự động tăng cường tưới để bù đắp bốc hơi khi trời quá nóng.

🛠 Vũ khí phần cứng (Hardware Modules)

Hệ thống sử dụng linh kiện phổ thông nhưng được quy hoạch chân tín hiệu (Pin Mapping) cực kỳ khắt khe:

Vi điều khiển ESP32 (38-pin): Bộ não lõi kép xử lý đa luồng, tích hợp Wi-Fi.

DHT11: Đo nhiệt độ & độ ẩm không khí (Tính toán mức độ bốc hơi).

Quang trở (LDR): Đo cường độ ánh sáng (Cắm vào chân ADC1 để chống nhiễu Wi-Fi).

Cảm biến độ ẩm đất: Đo lượng nước trong giá thể (Kích hoạt tưới).

Cảm biến chuyển động PIR (HC-SR501): Phát hiện xâm nhập, chim chuột phá hoại khu vực của thiên địch.

Module Relay 5V & Bơm chìm mini: Cơ cấu chấp hành.

Mạch hạ áp Buck LM2596: Đảm bảo nguồn 5V/3A ổn định, chống hiện tượng sụt áp (Panic Reset) khi bơm khởi động.

💻 Công cụ & Nền tảng (Software Stack)

Môi trường lập trình: PlatformIO trên Visual Studio Code (Tối ưu C/C++, quản lý thư viện tự động).

Đám mây (Cloud IoT): Blynk IoT (Giao tiếp qua Virtual Pins).

API Khí tượng: OpenWeatherMap API (Dự báo thời tiết 3-6 giờ tới).

Thư viện chính: BlynkSimpleEsp32, ArduinoJson v7, DHT sensor library.

🧠 Luồng Logic cốt lõi (The Core Logic)

Hệ thống loại bỏ hoàn toàn hàm delay() gây treo máy, sử dụng kiến trúc Đa luồng giả lập (Timer Interrupts):

Weather Risk Assessment (Mỗi 30 phút): Gọi API OpenWeatherMap. Nếu 6 giờ tới có "Rain", "Thunderstorm", bật cờ khóa bơm tự động.

Environmental Priority (Mỗi 2 giây):
Nếu nhiệt độ > 32°C, độ ẩm khí < 50% và nắng gắt -> Tự động đẩy ngưỡng bắt đầu tưới từ 40% lên 55% để cứu cây và làm mát vi khí hậu cho thiên địch.

Pulse Pumping & Fail-safe (Máy trạng thái):

Tưới 5 giây -> Nghỉ 5 giây chờ nước thẩm thấu -> Đọc lại cảm biến.

Nếu lặp lại quá 5 chu kỳ (25 giây) mà đất không ẩm lên -> Đứt ống hoặc cạn nước -> Kích hoạt State 3 (Lỗi), khóa Relay vĩnh viễn và đẩy Push Notification về app.

🚀 Hướng dẫn cài đặt & Sử dụng (How to Run)

Bước 1: Chuẩn bị môi trường

Cài đặt Visual Studio Code và Extension PlatformIO IDE.

Clone repository này về máy

Mở thư mục project bằng VS Code. PlatformIO sẽ tự động tải các thư viện khai báo trong platformio.ini.

Bước 2: Cấu hình Đám mây & API

Đăng ký tài khoản OpenWeatherMap, lấy API_KEY.

Đăng ký tài khoản Blynk IoT, tạo một Device mới và lấy BLYNK_TEMPLATE_ID, BLYNK_TEMPLATE_NAME, BLYNK_AUTH_TOKEN.

Mở file src/main.cpp và thay thế các thông tin bí mật của bạn:

#define BLYNK_TEMPLATE_ID   "TMPLxxxxxx"
#define BLYNK_AUTH_TOKEN    "Your_Blynk_Token"
char ssid[] = "Your_WiFi_Name";
char pass[] = "Your_WiFi_Password";
const String weatherApiKey = "Your_OWM_API_Key";


Bước 3: Cấu hình Blynk Datastreams

Tạo các Virtual Pins trên Web Dashboard của Blynk:

V0 (Integer): Điều khiển Relay (Bơm).

V1 (Integer): Chuyển chế độ Auto/Manual.

V2, V3 (Double): Nhiệt độ, Độ ẩm không khí.

V4 (Integer): Độ ẩm đất (%).

V5, V6 (Integer): Ánh sáng (0/1), PIR (0/1).

V7 (Integer): Cờ báo lỗi bơm (Fail-safe).

Bước 4: Biên dịch và Nạp Code

Kết nối mạch ESP32 với máy tính.

Nhấn nút Build (dấu tick 🗸) ở thanh trạng thái dưới cùng của PlatformIO để biên dịch.

Nhấn nút Upload (mũi tên ➔) để nạp code vào ESP32.

Mở Serial Monitor (baud rate 115200) để quan sát luồng debug.

💡 Tips: Nếu tải về bị lỗi thư viện gạch chân đỏ, hãy nhấn icon Thùng rác (Clean) dưới thanh trạng thái, sau đó Build lại từ đầu.

Chúc các bạn xây dựng thành công một hệ sinh thái nông nghiệp thông minh!