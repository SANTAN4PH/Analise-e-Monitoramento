#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

#define PIN_SENSOR 35

// =========================
// REDE WI-FI CRIADA PELO ESP32
// =========================
const char* apSSID = "WattWise_ESP32";
const char* apPassword = "12345678";

// IP do computador conectado na rede do ESP32.
// Confira no Windows com ipconfig.
// Geralmente será 192.168.4.2.
const char* serverUrl = "http://192.168.4.2:3000/leituras";

// =========================
// SENSOR SCT-013
// =========================
#define ADC_RESOLUTION 4095.0
#define ADC_VREF 3.3
#define NUM_AMOSTRAS 2000

float fatorCalibracao = 30.0;

unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 5000;

void criarRedeWiFi() {
  Serial.println();
  Serial.println("Criando rede Wi-Fi do ESP32...");

  WiFi.mode(WIFI_AP);

  bool status = WiFi.softAP(apSSID, apPassword);

  if (status) {
    Serial.println("Rede criada com sucesso!");
    Serial.print("Nome da rede: ");
    Serial.println(apSSID);

    Serial.print("Senha: ");
    Serial.println(apPassword);

    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("Erro ao criar rede Wi-Fi.");
  }
}

float lerCorrenteRMS() {
  long somaADC = 0;

  for (int i = 0; i < NUM_AMOSTRAS; i++) {
    somaADC += analogRead(PIN_SENSOR);
    delayMicroseconds(200);
  }

  float mediaADC = somaADC / (float)NUM_AMOSTRAS;

  float somaQuadrados = 0;

  for (int i = 0; i < NUM_AMOSTRAS; i++) {
    int leituraADC = analogRead(PIN_SENSOR);

    float sinalCorrigido = leituraADC - mediaADC;
    somaQuadrados += sinalCorrigido * sinalCorrigido;

    delayMicroseconds(200);
  }

  float adcRMS = sqrt(somaQuadrados / NUM_AMOSTRAS);
  float tensaoRMS = (adcRMS * ADC_VREF) / ADC_RESOLUTION;
  float correnteRMS = tensaoRMS * fatorCalibracao;

  return correnteRMS;
}

void enviarLeitura(float corrente) {
  HTTPClient http;

  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"corrente\":";
  json += String(corrente, 3);
  json += "}";

  Serial.println();
  Serial.print("Enviando para: ");
  Serial.println(serverUrl);

  Serial.print("JSON: ");
  Serial.println(json);

  int httpResponseCode = http.POST(json);

  Serial.print("Codigo HTTP: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    String resposta = http.getString();
    Serial.print("Resposta do servidor: ");
    Serial.println(resposta);
  } else {
    Serial.print("Erro no envio: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SENSOR, ADC_11db);

  Serial.println();
  Serial.println("====================================");
  Serial.println("WattWise - ESP32 Access Point");
  Serial.println("SCT-013 no GPIO 35");
  Serial.println("Enviando corrente para o backend");
  Serial.println("====================================");

  criarRedeWiFi();
}

void loop() {
  float corrente = lerCorrenteRMS();

  Serial.print("Corrente RMS: ");
  Serial.print(corrente, 3);
  Serial.println(" A");

  if (millis() - ultimoEnvio >= intervaloEnvio) {
    ultimoEnvio = millis();
    enviarLeitura(corrente);
  }

  delay(1000);
}