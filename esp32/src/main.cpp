#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <math.h>

#define PIN_SENSOR 35

// =========================
// REDE WI-FI COM INTERNET
// =========================
const char* ssid = "TP_LINK";
const char* password = "geladeira";

// URL do backend no Render   https://wattwise-vqjl.onrender.com/routes/leituras
const char* serverUrl = "https://wattwise-vqjl.onrender.com/api/leituras";
// =========================
// CONFIGURAÇÕES DE ENERGIA
// =========================
float tensaoRede = 127.0;      // coloque 127.0 ou 220.0 conforme sua rede
float tarifaKwh = 0.85;        // valor aproximado do kWh
float fatorPotencia = 1.0;     // para carga resistiva, pode deixar 1.0

// =========================
// SENSOR SCT-013
// =========================
#define ADC_RESOLUTION 4095.0
#define ADC_VREF 3.3
#define NUM_AMOSTRAS 2000

float fatorCalibracao = 100.0;

unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 10000; // 10 segundos

void conectarWiFi() {
  Serial.println();
  Serial.println("Conectando ao Wi-Fi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int tentativas = 0;

  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(1000);
    Serial.print(".");
    tentativas++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi conectado com sucesso!");
    Serial.print("Rede: ");
    Serial.println(ssid);

    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Falha ao conectar no Wi-Fi.");
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
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desconectado. Tentando reconectar...");
    conectarWiFi();
    return;
  }

  float potencia = corrente * tensaoRede * fatorPotencia;

  float tempoHoras = intervaloEnvio / 3600000.0;
  float consumoKwh = (potencia * tempoHoras) / 1000.0;

  float valorEstimado = consumoKwh * tarifaKwh;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"corrente\":";
  json += String(corrente, 3);
  json += ",";
  json += "\"potencia\":";
  json += String(potencia, 2);
  json += ",";
  json += "\"consumo_kwh\":";
  json += String(consumoKwh, 8);
  json += ",";
  json += "\"valor_estimado\":";
  json += String(valorEstimado, 6);
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
  Serial.println("WattWise - ESP32 conectado ao Render");
  Serial.println("SCT-013 no GPIO 35");
  Serial.println("Enviando corrente, potencia e consumo");
  Serial.println("====================================");

  conectarWiFi();
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