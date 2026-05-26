#define BLYNK_TEMPLATE_ID "..."
#define BLYNK_TEMPLATE_NAME "..."
#define BLYNK_AUTH_TOKEN "..."

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <BlynkSimpleEsp32.h>
#include <DHT.h>

//KẾT NỐI WIFI & API
char ssid[] = "Xiaomi 14";
char pass[] = "kuneneechan";
const String weatherApiKey = "..."; // Thay bằng API Key của bạn từ OpenWeatherMap
const String city = "...";
const String countryCode = "...";

#define RELAY_PIN   26  
#define PIR_PIN     25  
#define SOIL_PIN    32  
#define DHT_PIN     15  
#define LDR_PIN     34   

#define PUMP_ERROR_VPIN V7
#define DHTTYPE DHT11
DHT dht(DHT_PIN, DHTTYPE);

//BIẾN TOÀN CỤC
float t = 0.0, h = 0.0;
int soilPercent = 0, ldrValue = 0, pirValue = 0;
int autoMode = 1; 

// Biến Thời tiết & Logic
bool willRainSoon = false;
int triggerThreshold = 40; // Ngưỡng khô mặc định để bắt đầu bơm (40%)
int targetThreshold = 60;  // Ngưỡng đủ ẩm để dừng bơm (60%)

// Biến cho Máy trạng thái Bơm (Pulse Pumping)
int pumpState = 0; // 0: Nghỉ, 1: Đang Bơm, 2: Chờ nước ngấm, 3: Lỗi ngập úng
unsigned long pumpCycleStart = 0;
int currentCycle = 0;
const int MAX_CYCLES = 5;         // Tối đa 5 chu kỳ bơm
const int PUMP_TIME_MS = 5000;    // Bơm 5 giây
const int ABSORB_TIME_MS = 5000;  // Chờ ngấm 5 giây

//HÀM 1: LẤY DỰ BÁO THỜI TIẾT (3-6H TỚI)
void fetchWeatherForecast() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "http://api.openweathermap.org/data/2.5/forecast?q=" + city + "," + countryCode + "&cnt=2&appid=" + weatherApiKey + "&units=metric";
    
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String payload = http.getString();
      JsonDocument doc; 
      deserializeJson(doc, payload);
      
      willRainSoon = false;
      for (int i = 0; i < 2; i++) {
        String weather = doc["list"][i]["weather"][0]["main"];
        if (weather == "Rain" || weather == "Thunderstorm" || weather == "Drizzle") {
          willRainSoon = true;
          break;
        }
      }
      Serial.printf("[Cloud] Du bao 6h toi: %s\n", willRainSoon ? "CO MUA (Lock Bom)" : "TROI DEP");
    }
    http.end();
  }
}

//HÀM 2: ĐỌC CẢM BIẾN & IN TERMINAL (2s/lần)
void readSensorsAndDebug() {
  t = dht.readTemperature();
  h = dht.readHumidity();
  
  if (isnan(t) || isnan(h)) { t = 0; h = 0; }

  ldrValue = analogRead(LDR_PIN);
  pirValue = digitalRead(PIR_PIN);
  
  int soilRaw = analogRead(SOIL_PIN);
  soilPercent = map(soilRaw, 4095, 1500, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  Serial.println("----------------------------------------");
  Serial.printf("[Sensor] Nhiet: %.1fC | Am khi: %.1f%% | Dat: %d%%\n", t, h, soilPercent);
  Serial.printf("[Sensor] Sang: %d (%s) | PIR: %d\n", ldrValue, (ldrValue < 2000) ? "Nang gat" : "Ram mat", pirValue);
  Serial.printf("[Mode] Auto: %s\n", autoMode ? "ON" : "OFF");
  
  // Tính toán ngưỡng động (Trọng số môi trường)
  // Nóng > 32 độ, độ ẩm < 50%, ánh sáng gắt (< 2000) -> Tăng ngưỡng bơm (Bơm sớm hơn)
  if (t > 32.0 && h < 50.0 && ldrValue < 2000) {
    triggerThreshold = 55;
    Serial.println("[SAI Logic] Troi rat nong va hanh -> TANG MUC UU TIEN TUOI!");
  } else {
    triggerThreshold = 40;
  }
}

//HÀM 3: LOGIC BƠM (2s/lần)
void handleAutoMode() {
  if (autoMode == 0) {
    pumpState = 0; 
    currentCycle = 0; 
    Blynk.virtualWrite(PUMP_ERROR_VPIN, 0); // Reset đèn báo lỗi khi chuyển sang Manual
    return;
  }

  // 1. ĐIỀU KIỆN CHẶN (BLOCKERS)
  if (willRainSoon) {
    if (pumpState == 1) { digitalWrite(RELAY_PIN, LOW); pumpState = 0; }
    Serial.println("[Auto] BLOCK: Sap co mua, tam dung tuoi!");
    return;
  }

  if (soilPercent >= targetThreshold) {
    if (pumpState != 0) {
      Serial.println("[Auto] Dat da du am. Ket thuc chu trinh tuoi.");
      digitalWrite(RELAY_PIN, LOW);
      Blynk.virtualWrite(V0, 0);
      pumpState = 0; currentCycle = 0;
    }
    return;
  }

  if (pumpState == 3) {
    // Trạng thái LỖI: Đã bơm 5 lần mà đất vẫn khô
    digitalWrite(RELAY_PIN, LOW);
    Blynk.virtualWrite(V0, 0);
    Blynk.virtualWrite(PUMP_ERROR_VPIN, 1); // BẬT ĐÈN BÁO LỖI TRÊN APP
    return; // Dừng mọi hoạt động bơm tự động cho đến khi reset
  }

  // 2. STATE MACHINE BƠM NHẤP NHẢ 
  if (soilPercent < triggerThreshold && pumpState == 0) {
    Serial.println("[Auto] Dat kho. BAT DAU CHU TRINH TUOI!");
    pumpState = 1; 
    currentCycle = 1;
    digitalWrite(RELAY_PIN, HIGH);
    Blynk.virtualWrite(V0, 1);
    pumpCycleStart = millis();
  }
  
  else if (pumpState == 1) { // Đang bơm
    if (millis() - pumpCycleStart >= PUMP_TIME_MS) {
      digitalWrite(RELAY_PIN, LOW);
      Blynk.virtualWrite(V0, 0);
      pumpState = 2; // Chuyển sang pha chờ ngấm
      pumpCycleStart = millis();
      Serial.printf("[Auto] Chu ky %d: Nghung bom, cho nuoc ngam...\n", currentCycle);
    }
  }
  
  else if (pumpState == 2) { // Chờ nước ngấm
    if (millis() - pumpCycleStart >= ABSORB_TIME_MS) {
      if (soilPercent >= targetThreshold) {
        pumpState = 0; currentCycle = 0;
        Blynk.virtualWrite(PUMP_ERROR_VPIN, 0); // Xóa lỗi nếu thành công
        Serial.println("[Auto] Thanh cong! Dat da am.");
      } else if (currentCycle >= MAX_CYCLES) {
        pumpState = 3; // CHÍNH THỨC BÁO LỖI
        Serial.println("[Auto] !!! LOI NGUY HIEM: Bom 5 lan van kho !!!");
        Blynk.logEvent("pump_error", "Cảnh báo: Bơm 5 lần thất bại. Kiểm tra nguồn nước ngay!");
        Blynk.virtualWrite(PUMP_ERROR_VPIN, 1); 
      } else {
        // ... (tiếp tục bơm chu kỳ mới) ...
        pumpState = 1;
        currentCycle++;
        digitalWrite(RELAY_PIN, HIGH);
        Blynk.virtualWrite(V0, 1);
        pumpCycleStart = millis();
        Serial.printf("[Auto] Chu ky %d: Tiep tuc bom...\n", currentCycle);
      }
    }
  }
}

//HÀM 4: GỬI DATA LÊN BLYNK (5 phút/lần)
void sendToBlynk() {
  Blynk.virtualWrite(V2, t);
  Blynk.virtualWrite(V3, h);
  Blynk.virtualWrite(V5, (ldrValue < 2000) ? 1 : 0);
  Serial.println("[Blynk] Da dong bo du lieu len Cloud.");
}
void sendSoilandPirtoBlynk(){
    Blynk.virtualWrite(V4, soilPercent);
    Blynk.virtualWrite(V6, pirValue);
}

//ĐIỀU KHIỂN TỪ APP
BLYNK_WRITE(V0) { if (autoMode == 0) digitalWrite(RELAY_PIN, param.asInt()); }
BLYNK_WRITE(V1) { 
  autoMode = param.asInt(); 
  if (autoMode == 1) {
    pumpState = 0; 
    currentCycle = 0;
    Blynk.virtualWrite(PUMP_ERROR_VPIN, 0); 
    Serial.println("[System] Da reset trang thai bom, bat dau theo doi lai.");
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  digitalWrite(RELAY_PIN, LOW);
  dht.begin();
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  fetchWeatherForecast();
  timer.setInterval(2000L, readSensorsAndDebug);
  timer.setInterval(2000L, handleAutoMode);     
  timer.setInterval(2000L, sendSoilandPirtoBlynk); 
  timer.setInterval(300000L, sendToBlynk);
  timer.setInterval(1800000L, fetchWeatherForecast);
}

void loop() {
  Blynk.run();
  timer.run();
}