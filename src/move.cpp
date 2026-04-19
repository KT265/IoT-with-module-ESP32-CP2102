// #include <Arduino.h>

// #define RELAY_PIN 23
// const bool RELAY_ACTIVE_LOW = true;

// void setRelay(bool on) {
//   if (RELAY_ACTIVE_LOW) {
//     digitalWrite(RELAY_PIN, on ? LOW : HIGH);
//   } else {
//     digitalWrite(RELAY_PIN, on ? HIGH : LOW);
//   }
// }

// void setup() {
//   Serial.begin(115200);
//   pinMode(RELAY_PIN, OUTPUT);
//   setRelay(false);
//   delay(2000);
// }

// void loop() {
//   setRelay(true);
//   Serial.println("RELAY ON");
//   delay(5000);

//   setRelay(false);
//   Serial.println("RELAY OFF");
//   delay(5000);
// }