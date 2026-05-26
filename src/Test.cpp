
// #define BLYNK_TEMPLATE_ID "TMPL6SupSdeis"
// #define BLYNK_TEMPLATE_NAME "Smart farm of Kune Neechan"
// #define BLYNK_AUTH_TOKEN "jtAuBxXGcDpD8lyNoPXqpL6xdqYjndxB"

// #include <WiFi.h>
// #include <BlynkSimpleEsp32.h>
// #include <DHT.h>
// #include <HTTPClient.h>  
// #include <ArduinoJson.h>
// #include <time.h>

// #define RELAY_PIN   26
// #define PIR_PIN     25
// #define DHT_PIN     15
// #define SOIL_PIN    35
// #define LDR_PIN     34

// #define DHTTYPE     DHT11
// DHT dht(DHT_PIN, DHTTYPE);
// BlynkTimer timer;

// const String weatherApiKey = "a9931978404611f857785df32adf5dd6"; 
// const String city = "Hanoi";
// const String countryCode = "VN";

// char ssid[] = "Mac-Stupid";
// char pass[] = "02062005";

// bool isRaining = false; // Biến này để lưu trạng thái mưa
// void updateWeather() {
//   if (WiFi.status() == WL_CONNECTED) {
//     HTTPClient http;
    
//     // Đường dẫn gọi API (đơn vị Metric để lấy độ C cho chuẩn)
//     String url = "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + countryCode + "&appid=" + weatherApiKey + "&units=metric";
    
//     http.begin(url);
//     int httpCode = http.GET(); // Bắt đầu gọi web
    
//     if (httpCode > 0) {
//       String payload = http.getString();
//       DynamicJsonDocument doc(1024);
//       deserializeJson(doc, payload);
      
//       // Lấy trạng thái thời tiết chính (Main)
//       // Các trạng thái: Rain, Clouds, Clear, Drizzle, Mist...
//       String weatherMain = doc["weather"][0]["main"];
      
//       Serial.print("[Weather] Trang thai: ");
//       Serial.println(weatherMain);

//       // Nếu trạng thái thuộc nhóm "Mưa"
//       if (weatherMain == "Rain" || weatherMain == "Drizzle" || weatherMain == "Thunderstorm") {
//         isRaining = true;
//       } else {
//         isRaining = false;
//       }
//     } else {
//       Serial.println("[Weather] Loi ket noi API!");
//     }
//     http.end();
//   }
// }

// const char* ntpServer = "pool.ntp.org";
// const long  gmtOffset_sec = 7 * 3600; // Múi giờ Việt Nam là +7
// const int   daylightOffset_sec = 0;   // Việt Nam không dùng giờ mùa hè
// int scheduleHour = 17;
// int scheduleMin = 0;
// bool hasPumpedToday = false;

// int autoMode = 0; // 0: Manual, 1: Auto
// void sendDataToBlynk() {
//   // Đọc DHT11
//   float h = dht.readHumidity();
//   float t = dht.readTemperature();
  
//   // Đọc Analog 
//   int soilRaw = analogRead(SOIL_PIN);
//   int soilPercent = map(soilRaw, 4095, 1500, 0, 100);
//   soilPercent = constrain(soilPercent, 0, 100);
//   int ldrValue = analogRead(LDR_PIN);
//   int lightStatus;
//     if (ldrValue > 2000) {
//       lightStatus = 0; // sáng
//     } else {
//       lightStatus = 1; //tối
//     }
//   int pir = digitalRead(PIR_PIN);

//   // --- DEBUG LÊN TERMINAL ---
//   Serial.println("-----------------------");
//   if (isnan(h) || isnan(t)) {
//     Serial.println("[-] DHT11 Error: Khong doc duoc sensor! Check day vang (Data)");
//   } else {
//     Serial.printf("[+] Temp: %.1f | Humid: %.1f\n", t, h);
//     Blynk.virtualWrite(V2, t); // Khớp với Datastream của ông
//     Blynk.virtualWrite(V3, h);
//   }
//   Serial.printf("[+] LDR Raw: %d | Status: %s\n", ldrValue, lightStatus ? "SANG" : "TOI");
//   Serial.printf("[+] Soil Raw: %d | Soil Percent: %d%% | PIR: %d\n", soilRaw, soilPercent, pir);

//   // Gửi các giá trị còn lại lên App
//   Blynk.virtualWrite(V4, soilPercent);
//   Blynk.virtualWrite(V5, lightStatus);
//   Blynk.virtualWrite(V6, pir);

//   // Logic tự động tưới (V0 là Motor, V1 là Mode)
//   if (autoMode == 1) {
//     if (soilPercent < 35) { 
//       digitalWrite(RELAY_PIN, HIGH);
//       Blynk.virtualWrite(V0, 1);
//     } else if (soilPercent > 60) { 
//       digitalWrite(RELAY_PIN, LOW);
//       Blynk.virtualWrite(V0, 0);
//     }
//   }
// }

// BLYNK_WRITE(V0) { if (autoMode == 0) digitalWrite(RELAY_PIN, param.asInt()); }
// BLYNK_WRITE(V1) { autoMode = param.asInt(); }

// void setup() {
//   Serial.begin(115200);
//   pinMode(RELAY_PIN, OUTPUT);
//   pinMode(PIR_PIN, INPUT);
//   dht.begin();
//   Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
//   timer.setInterval(2000L, sendDataToBlynk);
//   timer.setInterval(6000L, updateWeather); 
//   configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
// }

// void loop() {
//   Blynk.run();
//   timer.run();
// }