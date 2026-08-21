#include <WiFi.h>
#include <WiFiManager.h> // Bắt buộc phải cài thêm thư viện này nhé thg bạn!
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Bỏ đoạn hardcode SSID và PASS đi.

// Có thể dùng broker miễn phí công cộng hoặc HiveMQ Serverless của bạn
const char* mqtt_server = "broker.hivemq.com"; 
const int   mqtt_port   = 1883;

// DEVICE ID DUY NHẤT CHO MỖI NGƯỜI DÙNG
String device_id; 

// Dynamic Topics
String telemetryTopic;
String controlTopic;
String alertTopic;

WiFiClient espClient;
PubSubClient client(espClient);

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

// XỬ LÝ NHẬN LỆNH TỪ AI TOOL (NGƯỠNG TƯỚI HOẶC BẬT TẮT THỦ CÔNG)
void callback(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  deserializeJson(doc, payload, length);

  if (doc.containsKey("mode")) {
    autoMode = (doc["mode"] == "auto") ? 1 : 0;
  }
  
  if (doc.containsKey("trigger")) {
    triggerThreshold = doc["trigger"];
    Serial.printf("[MQTT] Cap nhat nguong Trigger: %d%%\n", triggerThreshold);
  }

  if (doc.containsKey("target")) {
    targetThreshold = doc["target"];
    Serial.printf("[MQTT] Cap nhat nguong Target: %d%%\n", targetThreshold);
  }

  if (autoMode == 0 && doc.containsKey("manual_relay")) {
    int relayCmd = doc["manual_relay"];
    digitalWrite(RELAY_PIN, relayCmd ? HIGH : LOW);
    Serial.printf("[Manual] Dieu khien Relay: %d\n", relayCmd);
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("[MQTT] Dang ket noi...");
    if (client.connect(device_id.c_str())) {
      Serial.println(" Thanh cong!");
      client.subscribe(controlTopic.c_str());
    } else {
      Serial.printf(" That bai, rc=%d. Thu lai sau 3s\n", client.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  digitalWrite(RELAY_PIN, LOW);
  dht.begin();

  // wm.resetSettings(); // Bỏ comment dòng này nếu muốn xóa mật khẩu WiFi đã lưu để test lại
  // 1. Bật WiFi ở chế độ trạm (STA) tạm để lấy địa chỉ MAC cứng của chip
  WiFi.mode(WIFI_STA); 
  device_id = "farm_" + WiFi.macAddress();
  device_id.replace(":", ""); // Xóa dấu hai chấm

  // 2. Khởi tạo WiFiManager
  WiFiManager wm;
  
  // 3. Trick lỏ: Tạo một đoạn HTML in đậm cái Device ID ra
  String htmlSnippet = "<br/><hr/><h2 style=\"color:red;\">MÃ THIẾT BỊ:</h2><h3>" + device_id + "</h3><p>Hãy copy mã này nhập vào Web Tool</p><hr/>";
  WiFiManagerParameter custom_text(htmlSnippet.c_str());
  
  // Add cái dòng chữ đó vào giao diện WiFiManager
  wm.addParameter(&custom_text);

  // 4. Bung lụa WiFi Setup
  bool res = wm.autoConnect("SmartFarm_Setup");

  if(!res) {
    Serial.println("[WiFi] Ket noi THAT BAI! Mạch sẽ khởi động lại...");
    delay(3000);
    ESP.restart(); // Reset nếu treo quá lâu
  } 

  Serial.println("\n[WiFi] Da ket noi thanh cong! IP: " + WiFi.localIP().toString());

  // Lấy MAC và tạo Device ID (Để ở đây an toàn hơn vì WiFi đã chạy)
  device_id = "farm_" + WiFi.macAddress();
  device_id.replace(":", ""); // Xóa dấu : trong MAC
  
  // Khởi tạo topic động theo Device ID
  telemetryTopic = "farm/" + device_id + "/telemetry";
  controlTopic   = "farm/" + device_id + "/control";
  alertTopic     = "farm/" + device_id + "/alert";

  Serial.println("=========================================");
  Serial.println("DEVICE ID CUA BAN: " + device_id);
  Serial.println("Nhap ID nay vao AI Web Tool de ket noi!");
  Serial.println("=========================================");

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
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
        client.publish(alertTopic.c_str(), "{\"error\": \"FAIL_SAFE_TRIGGERED\"}");
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
  JsonDocument doc;
  doc["temp"] = t;
  doc["humid"] = h;
  doc["soil"] = soilPercent;
  doc["light"] = (ldrValue < 2000) ? 1 : 0;
  doc["pir"] = pirValue;
  doc["pump"] = (pumpState == 1) ? 1 : 0;
  doc["pump_state"] = pumpState;
  doc["auto_mode"] = autoMode;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(telemetryTopic.c_str(), buffer);
}

void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  readSensors();
  handlePumpLogic();

  if (millis() - lastDebugPrint >= 1000) {
    lastDebugPrint = millis();
    Serial.printf("[SENSOR] temp=%.1fC hum=%.1f%% soil=%d%% light=%d pir=%d pumpState=%d autoMode=%d\n",
                  t, h, soilPercent, ldrValue, pirValue, pumpState, autoMode);
  }

  // Gửi Telemetry mỗi 2 giây
  if (millis() - lastTelemetrySend >= 2000) {
    lastTelemetrySend = millis();
    sendTelemetry();
  }
}