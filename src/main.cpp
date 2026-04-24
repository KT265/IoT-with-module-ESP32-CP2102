<<<<<<< HEAD
#define BLYNK_TEMPLATE_ID "TMPL6SupSdeis"
#define BLYNK_TEMPLATE_NAME "Smart farm of Kune Neechan"
#define BLYNK_AUTH_TOKEN "jtAuBxXGcDpD8lyNoPXqpL6xdqYjndxB"

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <DHT.h>

#define RELAY_PIN   25
#define PIR_PIN     26
#define DHT_PIN     15
#define SOIL_PIN    35
#define LDR_PIN     34

#define DHTTYPE     DHT11
DHT dht(DHT_PIN, DHTTYPE);
BlynkTimer timer;

char ssid[] = "Mac-Stupid";
char pass[] = "02062005";

int autoMode = 0; // 0: Manual, 1: Auto

void sendDataToBlynk() {
  // Đọc DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  // Đọc Analog 
  int soilRaw = analogRead(SOIL_PIN);
  int soilPercent = map(soilRaw, 4095, 1500, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);
  int ldrValue = analogRead(LDR_PIN);
  int lightStatus;
    if (ldrValue > 2000) {
      lightStatus = 0; // sáng
    } else {
      lightStatus = 1; //tối
    }
  int pir = digitalRead(PIR_PIN);

  // --- DEBUG LÊN TERMINAL ---
  Serial.println("-----------------------");
  if (isnan(h) || isnan(t)) {
    Serial.println("[-] DHT11 Error: Khong doc duoc sensor! Check day vang (Data)");
  } else {
    Serial.printf("[+] Temp: %.1f | Humid: %.1f\n", t, h);
    Blynk.virtualWrite(V2, t); // Khớp với Datastream của ông
    Blynk.virtualWrite(V3, h);
  }
  Serial.printf("[+] LDR Raw: %d | Status: %s\n", ldrValue, lightStatus ? "SANG" : "TOI");
  Serial.printf("[+] Soil Raw: %d | Soil Percent: %d%% | PIR: %d\n", soilRaw, soilPercent, pir);

  // Gửi các giá trị còn lại lên App
  Blynk.virtualWrite(V4, soilPercent);
  Blynk.virtualWrite(V5, lightStatus);
  Blynk.virtualWrite(V6, pir);

  // Logic tự động tưới (V0 là Motor, V1 là Mode)
  if (autoMode == 1) {
    if (soilPercent < 35) { 
      digitalWrite(RELAY_PIN, HIGH);
      Blynk.virtualWrite(V0, 1);
    } else if (soilPercent > 60) { 
      digitalWrite(RELAY_PIN, LOW);
      Blynk.virtualWrite(V0, 0);
    }
  }
}

BLYNK_WRITE(V0) { if (autoMode == 0) digitalWrite(RELAY_PIN, param.asInt()); }
BLYNK_WRITE(V1) { autoMode = param.asInt(); }

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  dht.begin();
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  timer.setInterval(2000L, sendDataToBlynk);
}

void loop() {
  Blynk.run();
  timer.run();
=======
#include <Arduino.h>
#include "DHT.h"

// Định nghĩa các chân (theo sơ đồ mình đã bàn)
#define PIR_PIN 13
#define SOIL_PIN 34
#define LDR_PIN 35
#define RELAY_PIN 12
#define DHT_PIN 4
#define DHTTYPE DHT11

DHT dht(DHT_PIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  Serial.println("--- Dậy đi Kune Neechan! Đang test module đây... ---");

  pinMode(PIR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  
  dht.begin();

  // Test Relay lúc mới khởi động
  digitalWrite(RELAY_PIN, HIGH); 
  delay(1000);
  digitalWrite(RELAY_PIN, LOW);
}

void loop() {
  // 1. Đọc DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // 2. Đọc cảm biến đất và ánh sáng (Analog)
  int soilVal = analogRead(SOIL_PIN);
  int ldrVal = analogRead(LDR_PIN);

  // 3. Đọc PIR
  int pirVal = digitalRead(PIR_PIN);

  // --- In kết quả ra màn hình ---
  Serial.println("======================================");
  if (isnan(h) || isnan(t)) {
    Serial.println("[-] Lỗi DHT11 rồi! Kiểm tra lại dây DATA đi thg bạn.");
  } else {
    Serial.print("[+] Nhiệt độ: "); Serial.print(t); Serial.print("°C | ");
    Serial.print("Độ ẩm khí: "); Serial.print(h); Serial.println("%");
  }

  Serial.print("[+] Độ ẩm đất (Analog): "); Serial.println(soilVal);
  Serial.print("[+] Ánh sáng (Analog): "); Serial.println(ldrVal);

  if (pirVal == HIGH) {
    Serial.println("[!] CẢNH BÁO: Thấy đứa nào lảng vảng quanh vườn kìa!");
    digitalWrite(RELAY_PIN, HIGH); // Bật motor đuổi nó đi
  } else {
    Serial.println("[ ] Vườn tược yên bình, không thấy ai.");
    digitalWrite(RELAY_PIN, LOW); // Tắt motor
  }

  delay(3000); // Đợi 2 giây rồi lặp lại
>>>>>>> a8d7f260365042c6a50efd5944dff91f10ae936f
}