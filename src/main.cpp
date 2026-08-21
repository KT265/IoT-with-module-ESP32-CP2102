#include <WiFi.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>

// =========================================================================
// 1. CẤU HÌNH THÔNG TIN DỰ ÁN FIREBASE
// =========================================================================
#define DATABASE_URL    "https://project-grologic-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_API_KEY "AIzaSyB6hc9HPtui7GST-GWSaRcQp-N09m9Cp10" // Lấy ở mục Service accounts -> Database secrets

// Khởi tạo bộ nhớ lưu trữ Flash của ESP32
Preferences preferences;
char user_uid[64] = ""; // Biến lưu UID người dùng nhập từ WiFiManager

// Cấu hình Firebase
FirebaseData fbdo;
FirebaseData streamData;
FirebaseAuth auth;
FirebaseConfig fbConfig;

// HARDWARE PINS
#define RELAY_PIN   26  
#define PIR_PIN     25  
#define SOIL_PIN    32  
#define DHT_PIN     15  
#define LDR_PIN     34   

#define DHTTYPE DHT11
DHT dht(DHT_PIN, DHTTYPE);

// SYSTEM VARIABLES
float t = 0.0, h = 0.0;
int soilPercent = 0, ldrValue = 0, pirValue = 0;
int autoMode = 1; // 1: Auto, 0: Manual

int triggerThreshold = 40; // Ngưỡng bắt đầu bơm
int targetThreshold  = 60; // Ngưỡng ngắt bơm

// PUMP STATE MACHINE (FAIL-SAFE)
int pumpState = 0; // 0: Idle, 1: Pumping, 2: Absorbing, 3: Error
unsigned long pumpCycleStart = 0;
int currentCycle = 0;
const int MAX_CYCLES = 5;
const int PUMP_TIME_MS = 5000;
const int ABSORB_TIME_MS = 5000;

unsigned long lastTelemetrySend = 0;
unsigned long lastDebugPrint = 0;

// LẮNG NGHE LỆNH REALTIME TỪ WEB QUA FIREBASE STREAM
void streamCallback(FirebaseStream data) {
  String path = data.dataPath();
  String type = data.dataType();

  // Trường hợp 1: Web gửi cả cụm JSON (khi AI cập nhật hoặc đổi mode)
  if (type == "json") {
    FirebaseJson &json = data.jsonObject();
    FirebaseJsonData result;

    if (json.get(result, "mode")) {
      autoMode = (result.stringValue == "auto") ? 1 : 0;
      if (autoMode == 1) pumpState = 0; // Reset trạng thái khi về Auto
      Serial.printf("👉 [Firebase] Chuyen Mode: %s\n", autoMode ? "AUTO" : "MANUAL");
    }
    if (json.get(result, "trigger")) {
      triggerThreshold = result.intValue;
      Serial.printf("🎯 [Firebase] Nguong Trigger moi: %d%%\n", triggerThreshold);
    }
    if (json.get(result, "target")) {
      targetThreshold = result.intValue;
      Serial.printf("🎯 [Firebase] Nguong Target moi: %d%%\n", targetThreshold);
    }
    if (json.get(result, "manual_relay")) {
      if (autoMode == 0) {
        int rCmd = result.intValue;
        digitalWrite(RELAY_PIN, rCmd ? HIGH : LOW);
        pumpState = rCmd ? 1 : 0;
        Serial.printf("⚡ [Firebase Manual] Relay: %s\n", rCmd ? "BAT (ON)" : "TAT (OFF)");
      }
    }
  } 
  // Trường hợp 2: Web cập nhật từng biến đơn lẻ
  else {
    if (path == "/mode") {
      autoMode = (data.stringData() == "auto") ? 1 : 0;
      if (autoMode == 1) pumpState = 0;
      Serial.printf("👉 [Firebase] Chuyen Mode: %s\n", autoMode ? "AUTO" : "MANUAL");
    } else if (path == "/trigger") {
      triggerThreshold = data.intData();
      Serial.printf("🎯 [Firebase] Nguong Trigger moi: %d%%\n", triggerThreshold);
    } else if (path == "/target") {
      targetThreshold = data.intData();
      Serial.printf("🎯 [Firebase] Nguong Target moi: %d%%\n", targetThreshold);
    } else if (path == "/manual_relay") {
      if (autoMode == 0) {
        int rCmd = data.intData();
        digitalWrite(RELAY_PIN, rCmd ? HIGH : LOW);
        pumpState = rCmd ? 1 : 0;
        Serial.printf("⚡ [Firebase Manual] Relay: %s\n", rCmd ? "BAT (ON)" : "TAT (OFF)");
      }
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("[Firebase Stream] Stream timeout, dang khoi phuc...");
}

// Cờ báo hiệu có lưu cấu hình mới từ WiFiManager
bool shouldSaveConfig = false;
void saveConfigCallback() {
  shouldSaveConfig = true;
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  digitalWrite(RELAY_PIN, LOW);
  dht.begin();

  // 1. Đọc User UID đã lưu từ bộ nhớ Flash
  preferences.begin("smartfarm", false);
  String saved_uid = preferences.getString("uid", "");
  saved_uid.toCharArray(user_uid, 64);
  Serial.println("[Flash] User UID hien tai: " + String(user_uid));

  // 2. Khởi tạo WiFiManager
  WiFiManager wm;
  wm.setSaveConfigCallback(saveConfigCallback);

  // Tạo ô nhập User UID trên giao diện Web WiFiManager
  WiFiManagerParameter custom_uid_input("uid", "Nhap User UID tu Web Dashboard", user_uid, 64);
  wm.addParameter(&custom_uid_input);

  // Giao diện hướng dẫn HTML
  String htmlSnippet = "<br/><hr/><p style=\"color:green;font-weight:bold;\">Huong dan:</p><p>Dang nhap Google tren Web -> Copy ma <b>User UID</b> va dan vao o ben tren.</p><hr/>";
  WiFiManagerParameter custom_html(htmlSnippet.c_str());
  wm.addParameter(&custom_html);

  // 3. Mở cổng phát Wi-Fi AP để người dùng cài đặt
  Serial.println("[WiFi] Dang khoi chay WiFi Setup Portal...");
  bool res = wm.autoConnect("SmartFarm_Setup");

  if (!res) {
    Serial.println("[WiFi] Ket noi that bai! Khoi dong lai ESP32...");
    delay(3000);
    ESP.restart();
  }

  // 4. Nếu người dùng nhập UID mới, lưu ngay vào Flash
  if (shouldSaveConfig) {
    strcpy(user_uid, custom_uid_input.getValue());
    preferences.putString("uid", String(user_uid));
    Serial.println("[Flash] Da luu User UID moi: " + String(user_uid));
  }
  preferences.end();

  Serial.println("\n[WiFi] Da ket noi thanh cong! IP: " + WiFi.localIP().toString());
  Serial.println("=========================================");
  Serial.println("DEVICE HOAT DONG VOI USER UID: " + String(user_uid));
  Serial.println("=========================================");

  // 5. Kết nối Firebase Realtime Database
  fbConfig.api_key = FIREBASE_API_KEY;
  fbConfig.database_url = DATABASE_URL;

  // Kích hoạt đăng nhập ẩn danh cho ESP32
  if (Firebase.signUp(&fbConfig, &auth, "", "")) {
    Serial.println("[Firebase] Dang ky phien xac thuc an danh thanh cong!");
  } else {
    Serial.printf("[Firebase] Loi dang ky phien: %s\n", fbConfig.signer.signupError.message.c_str());
  }

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);

  // 6. Bật Stream lắng nghe sự kiện điều khiển của User
  if (strlen(user_uid) > 0) {
    String controlPath = "/users/" + String(user_uid) + "/control";
    if (Firebase.RTDB.beginStream(&streamData, controlPath.c_str())) {
      Firebase.RTDB.setStreamCallback(&streamData, streamCallback, streamTimeoutCallback);
      Serial.println("[Firebase] Stream control khoi tao tai: " + controlPath);
    }
  } else {
    Serial.println("⚠️ CANH BAO: Chua co User UID! Vui long ket noi vao Wi-Fi SmartFarm_Setup de nhap.");
  }
}

void readSensors() {
  t = dht.readTemperature();
  h = dht.readHumidity();
  if (isnan(t) || isnan(h)) { t = 0; h = 0; }

  ldrValue = analogRead(LDR_PIN);
  pirValue = digitalRead(PIR_PIN);
  
  int soilRaw = analogRead(SOIL_PIN);
  soilPercent = map(soilRaw, 4095, 1500, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);
}

void handlePumpLogic() {
  if (autoMode == 0) return;

  if (soilPercent >= targetThreshold) {
    if (pumpState != 0) {
      digitalWrite(RELAY_PIN, LOW);
      pumpState = 0; currentCycle = 0;
    }
    return;
  }

  if (pumpState == 3) {
    digitalWrite(RELAY_PIN, LOW);
    return; 
  }

  if (soilPercent < triggerThreshold && pumpState == 0) {
    pumpState = 1; 
    currentCycle = 1;
    digitalWrite(RELAY_PIN, HIGH);
    pumpCycleStart = millis();
  }
  else if (pumpState == 1) { 
    if (millis() - pumpCycleStart >= PUMP_TIME_MS) {
      digitalWrite(RELAY_PIN, LOW);
      pumpState = 2; 
      pumpCycleStart = millis();
    }
  }
  else if (pumpState == 2) { 
    if (millis() - pumpCycleStart >= ABSORB_TIME_MS) {
      if (soilPercent >= targetThreshold) {
        pumpState = 0; currentCycle = 0;
      } else if (currentCycle >= MAX_CYCLES) {
        pumpState = 3; // Báo lỗi kẹt bơm/hết nước
        if (strlen(user_uid) > 0) {
          Firebase.RTDB.setString(&fbdo, ("/users/" + String(user_uid) + "/alert/error").c_str(), "FAIL_SAFE_TRIGGERED");
        }
      } else {
        pumpState = 1;
        currentCycle++;
        digitalWrite(RELAY_PIN, HIGH);
        pumpCycleStart = millis();
      }
    }
  }
}

void sendTelemetry() {
  if (strlen(user_uid) == 0 || !Firebase.ready()) return;

  FirebaseJson json;
  json.set("temp", t);
  json.set("humid", h);
  json.set("soil", soilPercent);
  json.set("light", (ldrValue < 2000) ? 1 : 0);
  json.set("pir", pirValue);
  json.set("pump", (pumpState == 1 || digitalRead(RELAY_PIN) == HIGH) ? 1 : 0);
  json.set("pump_state", pumpState);
  json.set("auto_mode", autoMode);
  
  // Gửi 2 giá trị ngưỡng thực tế trong RAM chip lên để Web hiển thị
  json.set("trigger", triggerThreshold);
  json.set("target", targetThreshold);

  String telePath = "/users/" + String(user_uid) + "/telemetry";
  Firebase.RTDB.updateNode(&fbdo, telePath.c_str(), &json);
}

void loop() {
  readSensors();
  handlePumpLogic();

  if (millis() - lastDebugPrint >= 1000) {
    lastDebugPrint = millis();
    Serial.printf("[SENSOR] temp=%.1fC hum=%.1f%% soil=%d%% light=%d pir=%d pumpState=%d autoMode=%d\n",
                  t, h, soilPercent, ldrValue, pirValue, pumpState, autoMode);
  }

  // Đẩy Telemetry lên Firebase mỗi 2 giây
  if (millis() - lastTelemetrySend >= 2000) {
    lastTelemetrySend = millis();
    sendTelemetry();
  }
}