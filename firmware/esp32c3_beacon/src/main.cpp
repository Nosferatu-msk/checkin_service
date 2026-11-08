/*
 * ESP32-C3 Super Mini BLE Beacon Firmware
 * 
 * Purpose: Test beacon for the attendance control system
 * Protocol: iBeacon (Apple)
 * 
 * Features:
 * - iBeacon advertisement with configurable UUID/Major/Minor
 * - BLE configuration service for remote setup (connect to configure)
 * - NVS storage for persistent configuration
 * - Dual mode: beacon advertising + config service on connect
 * 
 * Hardware: ESP32-C3 Super Mini
 * Framework: Arduino + NimBLE
 * 
 * Author: CheckIn Service Project
 * Date: 2026-11-08
 * Version: 1.0.0
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include "beacon_config.h"
#include "nvs_storage.h"

// Global state
BeaconConfig beaconConfig;
NVSStorage nvsStorage;

#define LED_BUILTIN 8
#define CONFIG_TIMEOUT_MS 30000  // 30 seconds config mode timeout

// Forward declarations
class BeaconServerCallbacks;
class ConfigCharCallbacks;

// BLE objects
NimBLEAdvertising* pAdvertising = nullptr;
NimBLEServer* pServer = nullptr;
bool configModeActive = false;
unsigned long configModeStart = 0;

// Callback storage
uint8_t storedUUID[16];
uint16_t storedMajor = 0;
uint16_t storedMinor = 0;
int8_t storedTxPower = -59;
uint16_t storedInterval = 1000;

// ==================== NVS Functions ====================

void loadConfig() {
    nvsStorage.begin();
    nvsStorage.loadConfig(beaconConfig);
}

void saveConfig() {
    nvsStorage.saveConfig(beaconConfig);
}

// ==================== Config Print ====================

void printConfig() {
    Serial.println("\n=== Beacon Configuration ===");
    Serial.print("UUID: ");
    for (int i = 0; i < 16; i++) {
        if (i == 4 || i == 6 || i == 8 || i == 10) Serial.print("-");
        Serial.printf("%02X", beaconConfig.uuid[i]);
    }
    Serial.println();
    Serial.printf("Major: %d\n", beaconConfig.major);
    Serial.printf("Minor: %d\n", beaconConfig.minor);
    Serial.printf("TX Power: %d dBm\n", beaconConfig.tx_power);
    Serial.printf("Interval: %d ms\n", beaconConfig.advertising_interval_ms);
    Serial.printf("Battery: %d%%\n", beaconConfig.battery_level);
    Serial.printf("FW: v%d.%d\n", 
        (beaconConfig.firmware_version >> 8) & 0xFF,
        beaconConfig.firmware_version & 0xFF);
    Serial.println("===========================\n");
}

// ==================== LED Control ====================

void blinkLED(int count, int delayMs) {
    for (int i = 0; i < count; i++) {
        digitalWrite(LED_BUILTIN, HIGH);
        delay(delayMs);
        digitalWrite(LED_BUILTIN, LOW);
        delay(delayMs);
    }
}

// ==================== iBeacon Advertisement ====================

void startIBeaconAdvertising() {
    if (!pAdvertising) return;
    
    pAdvertising->stop();
    pAdvertising->setScanResponse(false);
    
    // Build iBeacon manufacturer data
    // Format: CompanyID(2) + iBeaconType(2) + UUID(16) + Major(2) + Minor(2) + TXPower(1) = 25 bytes
    uint8_t mfrData[25];
    int idx = 0;
    
    // Apple Company ID (0x004C in little-endian)
    mfrData[idx++] = 0x4C;
    mfrData[idx++] = 0x00;
    
    // iBeacon type (0x0215 in big-endian)
    mfrData[idx++] = 0x02;
    mfrData[idx++] = 0x15;
    
    // Proximity UUID (16 bytes)
    for (int i = 0; i < 16; i++) {
        mfrData[idx++] = beaconConfig.uuid[i];
    }
    
    // Major (big-endian)
    mfrData[idx++] = (beaconConfig.major >> 8) & 0xFF;
    mfrData[idx++] = beaconConfig.major & 0xFF;
    
    // Minor (big-endian)
    mfrData[idx++] = (beaconConfig.minor >> 8) & 0xFF;
    mfrData[idx++] = beaconConfig.minor & 0xFF;
    
    // TX Power (signed, calibrated at 1m)
    mfrData[idx++] = (uint8_t)beaconConfig.tx_power;
    
    // Set advertisement data
    NimBLEAdvertisementData advData;
    advData.setFlags(0x04);  // LE General Discoverable, BR/EDR Not Supported
    advData.setManufacturerData(std::string((char*)mfrData, 25));
    
    pAdvertising->setAdvertisementData(advData);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMaxPreferred(0x12);
    
    pAdvertising->start();
    Serial.println("[BEACON] iBeacon advertising started");
}

// ==================== BLE Server Callbacks ====================

class BeaconServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer) override {
        Serial.println("[BLE] Client connected - entering config mode");
        configModeActive = true;
        configModeStart = millis();
        blinkLED(2, 200);
    }
    
    void onDisconnect(NimBLEServer* pServer) override {
        Serial.println("[BLE] Client disconnected - returning to beacon mode");
        configModeActive = false;
        delay(500);
        startIBeaconAdvertising();
        blinkLED(3, 100);
    }
};

// ==================== Config Characteristic Callbacks ====================

class ConfigCharCallbacks : public NimBLECharacteristicCallbacks {
public:
    void onWrite(NimBLECharacteristic* pChar) override {
        std::string uuid = pChar->getUUID().toString();
        
        // UUID characteristic
        if (uuid == "1234567812341234123412345678ab1") {
            std::string val = pChar->getValue();
            if (val.length() == 16) {
                memcpy(beaconConfig.uuid, val.data(), 16);
                Serial.print("[CFG] UUID set: ");
                for (int i = 0; i < 16; i++) {
                    if (i == 4 || i == 6 || i == 8 || i == 10) Serial.print("-");
                    Serial.printf("%02X", beaconConfig.uuid[i]);
                }
                Serial.println();
                saveConfig();
            }
        }
        // Major characteristic
        else if (uuid == "1234567812341234123412345678ab2") {
            std::string val = pChar->getValue();
            if (val.length() == 2) {
                beaconConfig.major = ((uint8_t)val[0] << 8) | (uint8_t)val[1];
                Serial.printf("[CFG] Major set: %d\n", beaconConfig.major);
                saveConfig();
            }
        }
        // Minor characteristic
        else if (uuid == "1234567812341234123412345678ab3") {
            std::string val = pChar->getValue();
            if (val.length() == 2) {
                beaconConfig.minor = ((uint8_t)val[0] << 8) | (uint8_t)val[1];
                Serial.printf("[CFG] Minor set: %d\n", beaconConfig.minor);
                saveConfig();
            }
        }
        // TX Power characteristic
        else if (uuid == "1234567812341234123412345678ab4") {
            std::string val = pChar->getValue();
            if (val.length() == 1) {
                beaconConfig.tx_power = (int8_t)val[0];
                Serial.printf("[CFG] TX Power set: %d dBm\n", beaconConfig.tx_power);
                saveConfig();
            }
        }
        // Interval characteristic
        else if (uuid == "1234567812341234123412345678ab5") {
            std::string val = pChar->getValue();
            if (val.length() == 2) {
                beaconConfig.advertising_interval_ms = ((uint8_t)val[0] << 8) | (uint8_t)val[1];
                Serial.printf("[CFG] Interval set: %d ms\n", beaconConfig.advertising_interval_ms);
                saveConfig();
            }
        }
        // Reset characteristic
        else if (uuid == "1234567812341234123412345678ab8") {
            std::string val = pChar->getValue();
            if (val.length() == 1 && (uint8_t)val[0] == 0xAA) {
                Serial.println("[CFG] Reset to defaults!");
                nvsStorage.resetToDefaults(beaconConfig);
                printConfig();
                delay(1000);
                ESP.restart();
            }
        }
    }
    
    void onRead(NimBLECharacteristic* pChar) override {
        std::string uuid = pChar->getUUID().toString();
        
        // UUID
        if (uuid == "1234567812341234123412345678ab1") {
            pChar->setValue(beaconConfig.uuid, 16);
        }
        // Major
        else if (uuid == "1234567812341234123412345678ab2") {
            uint8_t data[2] = {
                (uint8_t)((beaconConfig.major >> 8) & 0xFF),
                (uint8_t)(beaconConfig.major & 0xFF)
            };
            pChar->setValue(data, 2);
        }
        // Minor
        else if (uuid == "1234567812341234123412345678ab3") {
            uint8_t data[2] = {
                (uint8_t)((beaconConfig.minor >> 8) & 0xFF),
                (uint8_t)(beaconConfig.minor & 0xFF)
            };
            pChar->setValue(data, 2);
        }
        // TX Power
        else if (uuid == "1234567812341234123412345678ab4") {
            uint8_t data = (uint8_t)beaconConfig.tx_power;
            pChar->setValue(&data, 1);
        }
        // Interval
        else if (uuid == "1234567812341234123412345678ab5") {
            uint8_t data[2] = {
                (uint8_t)((beaconConfig.advertising_interval_ms >> 8) & 0xFF),
                (uint8_t)(beaconConfig.advertising_interval_ms & 0xFF)
            };
            pChar->setValue(data, 2);
        }
        // Battery
        else if (uuid == "1234567812341234123412345678ab6") {
            uint8_t data = beaconConfig.battery_level;
            pChar->setValue(&data, 1);
        }
        // Firmware
        else if (uuid == "1234567812341234123412345678ab7") {
            uint8_t data[2] = {
                (uint8_t)((beaconConfig.firmware_version >> 8) & 0xFF),
                (uint8_t)(beaconConfig.firmware_version & 0xFF)
            };
            pChar->setValue(data, 2);
        }
    }
};

// ==================== Setup BLE ====================

void setupBLE() {
    // Initialize NimBLE
    NimBLEDevice::init("CheckIn-Beacon");
    
    // Set TX power (ESP32-C3 supports: N0=-0dBm, P9=+9dBm)
    // For beacon use, default to low power
    esp_power_level_t powerLevel = ESP_PWR_LVL_N0;  // 0 dBm default
    if (beaconConfig.tx_power > 0) {
        powerLevel = ESP_PWR_LVL_P9;  // +9 dBm (max for C3)
    }
    NimBLEDevice::setPower(powerLevel);
    
    // Create server
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new BeaconServerCallbacks());
    
    // Create configuration service
    NimBLEService* pConfigService = pServer->createService(BEACON_CONFIG_SERVICE_UUID);
    
    // Create characteristics
    static ConfigCharCallbacks charCallbacks;
    
    // UUID (16 bytes)
    NimBLECharacteristic* pUUIDChar = pConfigService->createCharacteristic(
        CHAR_UUID_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pUUIDChar->setCallbacks(&charCallbacks);
    
    // Major (2 bytes)
    NimBLECharacteristic* pMajorChar = pConfigService->createCharacteristic(
        CHAR_MAJOR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pMajorChar->setCallbacks(&charCallbacks);
    
    // Minor (2 bytes)
    NimBLECharacteristic* pMinorChar = pConfigService->createCharacteristic(
        CHAR_MINOR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pMinorChar->setCallbacks(&charCallbacks);
    
    // TX Power (1 byte)
    NimBLECharacteristic* pTxPowerChar = pConfigService->createCharacteristic(
        CHAR_TX_POWER_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pTxPowerChar->setCallbacks(&charCallbacks);
    
    // Interval (2 bytes)
    NimBLECharacteristic* pIntervalChar = pConfigService->createCharacteristic(
        CHAR_INTERVAL_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pIntervalChar->setCallbacks(&charCallbacks);
    
    // Battery (1 byte, read only)
    NimBLECharacteristic* pBatteryChar = pConfigService->createCharacteristic(
        CHAR_BATTERY_UUID,
        NIMBLE_PROPERTY::READ
    );
    pBatteryChar->setCallbacks(&charCallbacks);
    
    // Firmware (2 bytes, read only)
    NimBLECharacteristic* pFirmwareChar = pConfigService->createCharacteristic(
        CHAR_FIRMWARE_UUID,
        NIMBLE_PROPERTY::READ
    );
    pFirmwareChar->setCallbacks(&charCallbacks);
    
    // Reset (write only)
    NimBLECharacteristic* pResetChar = pConfigService->createCharacteristic(
        CHAR_RESET_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pResetChar->setCallbacks(&charCallbacks);
    
    // Start service
    pConfigService->start();
    
    // Get advertising
    pAdvertising = NimBLEDevice::getAdvertising();
    
    // Start iBeacon advertising
    startIBeaconAdvertising();
    
    Serial.println("[BLE] Setup complete");
}

// ==================== Arduino Setup ====================

void setup() {
    Serial.begin(115200);
    delay(500);
    
    Serial.println("\n\n╔═══════════════════════════════════╗");
    Serial.println("║   ESP32-C3 BLE Beacon v1.0.0     ║");
    Serial.println("║   CheckIn Service Project         ║");
    Serial.println("╚═══════════════════════════════════╝\n");
    
    // LED
    pinMode(LED_BUILTIN, OUTPUT);
    blinkLED(2, 150);
    
    // Load config
    loadConfig();
    printConfig();
    
    // Get MAC
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_BT);
    Serial.printf("MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
        mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    // Setup BLE
    setupBLE();
    
    Serial.println("\n[READY] Beacon running!");
    Serial.println("  - Scan with nRF Connect to see iBeacon");
    Serial.println("  - Connect to 'CheckIn-Beacon' to configure");
    Serial.println("  - Settings auto-save to NVS\n");
    
    blinkLED(3, 100);
}

// ==================== Arduino Loop ====================

void loop() {
    // Status LED: slow blink when running
    static unsigned long lastBlink = 0;
    static bool ledState = false;
    
    if (millis() - lastBlink > 3000) {
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState);
        lastBlink = millis();
    }
    
    // Config mode timeout: if connected for too long, disconnect
    if (configModeActive && (millis() - configModeStart > CONFIG_TIMEOUT_MS)) {
        Serial.println("[CFG] Config mode timeout, disconnecting...");
        if (pServer) {
            pServer->disconnect(0);  // Disconnect connection ID 0
        }
        configModeActive = false;
        startIBeaconAdvertising();
    }
    
    delay(50);
}
