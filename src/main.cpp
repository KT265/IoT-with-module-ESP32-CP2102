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
}