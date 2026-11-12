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

// Battery simulation
#define BATTERY_DRAIN_INTERVAL_MS 600000  // 10 minutes
#define BATTERY_ADC_PIN A0  // ADC pin for battery voltage (optional hardware)

// Advertising packet counter for alternating packet types
// Ratio: 8 iBeacon packets : 1 Custom Manufacturer Data : 1 Eddystone-TLM
#define ADVERTISING_RATIO 10
#define CUSTOM_DATA_SLOT 8  // Slot 8 out of 10: Custom Manufacturer Data
#define TLM_SLOT 9          // Slot 9 out of 10: Eddystone-TLM telemetry

// Forward declarations
class BeaconServerCallbacks;
class ConfigCharCallbacks;

// BLE objects
NimBLEAdvertising* pAdvertising = nullptr;
NimBLEServer* pServer = nullptr;
bool configModeActive = false;
unsigned long configModeStart = 0;

// Packet counter for alternating advertisement types
uint32_t packetCounter = 0;
unsigned long lastAdvertisingSwitch = 0;
bool isCustomDataActive = false;

// Eddystone-TLM advertising count (since power-on)
uint32_t tlmAdvCount = 0;

// Battery simulation state
unsigned long lastBatteryUpdate = 0;

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

// ==================== Battery Management ====================

/**
 * Read battery level from ADC (optional hardware feature)
 * For ESP32-C3 Super Mini with battery divider circuit
 * Returns: battery percentage 0-100
 */
int readBatteryFromADC() {
    // Read ADC value (12-bit resolution on ESP32-C3: 0-4095)
    int adcValue = analogRead(BATTERY_ADC_PIN);
    
    // Convert ADC to voltage (3.3V reference, 12-bit ADC)
    // Note: Adjust divider ratio based on actual resistor values
    float voltage = (adcValue / 4095.0f) * 3.3f;
    
    // Convert voltage to percentage
    // Li-Po battery: 3.0V = 0%, 4.2V = 100%
    int percentage = constrain(map(adcValue, 3686, 5160, 0, 100), 0, 100);
    // 3686 = 3.0V * 4095 / 3.3V
    // 5160 = 4.2V * 4095 / 3.3V
    
    return percentage;
}

/**
 * Simulate battery drain over time (for testing without real battery)
 * Decreases battery level by 1% every BATTERY_DRAIN_INTERVAL_MS
 */
void updateBatterySimulation() {
    unsigned long now = millis();
    
    if (now - lastBatteryUpdate >= BATTERY_DRAIN_INTERVAL_MS) {
        if (beaconConfig.battery_level > 0) {
            beaconConfig.battery_level--;
            saveConfig();  // Persist to NVS
            Serial.printf("[BATT] Battery simulated drain: %d%%\n", beaconConfig.battery_level);
        }
        lastBatteryUpdate = now;
    }
}

/**
 * Update battery level (choose simulation or ADC based on hardware)
 * For USB-powered testing: uses simulation
 * For battery-powered: uncomment ADC reading below
 */
void updateBatteryLevel() {
    // Option 1: Battery drain simulation (default for testing)
    updateBatterySimulation();
    
    // Option 2: Real ADC reading (uncomment for battery-powered hardware)
    // beaconConfig.battery_level = readBatteryFromADC();
}

// ==================== Advertising Functions ====================

/**
 * Configure common advertising parameters (interval, TX power)
 */
void configureAdvertisingInterval() {
    // Validate interval is within BLE spec bounds (20ms - 10000ms)
    uint16_t interval_ms = beaconConfig.advertising_interval_ms;
    if (interval_ms < 20) interval_ms = 20;
    if (interval_ms > 10000) interval_ms = 10000;

    // Convert to BLE advertising units (1 unit = 0.625ms)
    uint16_t interval_units = (uint16_t)(interval_ms * 1.6f);

    pAdvertising->setMinInterval(interval_units);
    pAdvertising->setMaxInterval(interval_units);

    Serial.printf("[BEACON] Advertising interval: %d ms (%d units)\n", interval_ms, interval_units);
}

/**
 * Start iBeacon advertising
 * Standard Apple iBeacon format with Company ID 0x004C
 */
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
    configureAdvertisingInterval();

    pAdvertising->start();
    isCustomDataActive = false;
    Serial.println("[BEACON] iBeacon advertising started");
}

/**
 * Send Custom Manufacturer Data packet
 * Company ID: 0xFFFF (for testing/development)
 * Payload: Battery Level (1 byte) + Firmware Version (2 bytes)
 * 
 * This is sent every 10th advertising cycle (1 out of 10 packets)
 * to provide battery status and firmware info to scanners
 */
void sendCustomManufacturerData() {
    if (!pAdvertising) return;

    pAdvertising->stop();
    pAdvertising->setScanResponse(false);

    // Build Custom Manufacturer Data
    // Format: CompanyID(2) + BatteryLevel(1) + FirmwareVersion(2) = 5 bytes
    uint8_t customData[5];
    int idx = 0;

    // Company ID 0xFFFF (little-endian) - reserved for development/testing
    customData[idx++] = 0xFF;
    customData[idx++] = 0xFF;

    // Battery level (0-100%)
    customData[idx++] = beaconConfig.battery_level;

    // Firmware version (big-endian: major.minor)
    customData[idx++] = (beaconConfig.firmware_version >> 8) & 0xFF;  // Major
    customData[idx++] = beaconConfig.firmware_version & 0xFF;          // Minor

    // Set advertisement data
    NimBLEAdvertisementData advData;
    advData.setFlags(0x04);  // LE General Discoverable, BR/EDR Not Supported
    advData.setManufacturerData(std::string((char*)customData, sizeof(customData)));

    pAdvertising->setAdvertisementData(advData);
    configureAdvertisingInterval();

    pAdvertising->start();
    isCustomDataActive = true;
    Serial.printf("[BEACON] Custom Manufacturer Data sent (Battery: %d%%, FW: v%d.%d)\n",
        beaconConfig.battery_level,
        (beaconConfig.firmware_version >> 8) & 0xFF,
        beaconConfig.firmware_version & 0xFF);
}

/**
 * Send Eddystone-TLM telemetry packet
 * Service UUID: 0xFEAA (Eddystone)
 * Frame type: 0x20 (TLM - unencrypted)
 *
 * Contains:
 * - Battery voltage (mV)
 * - Temperature (8.8 fixed-point format)
 * - Advertising count (since power-on)
 * - Uptime (0.1s resolution)
 *
 * This is sent every 10th advertising cycle (slot 9 out of 10)
 * to provide telemetry data to compatible scanners
 */
void sendEddystoneTLM() {
    if (!pAdvertising) return;

    pAdvertising->stop();
    pAdvertising->setScanResponse(false);

    // Build Eddystone-TLM service data
    // Format: FrameType(1) + Version(1) + Battery(2) + Temp(2) + AdvCount(4) + SecCount(4) = 14 bytes
    uint8_t tlmData[14];
    int idx = 0;

    // Frame type: 0x20 (TLM)
    tlmData[idx++] = EDDYSTONE_TLM_FRAME_TYPE;

    // TLM version: 0x00 (unencrypted)
    tlmData[idx++] = 0x00;

    // Battery voltage in mV (big-endian)
    // Convert 0-100% to 0-4200mV (Li-Po battery range)
    uint16_t batteryMv = beaconConfig.battery_level * 42;  // 0-100 -> 0-4200mV
    tlmData[idx++] = (batteryMv >> 8) & 0xFF;  // High byte
    tlmData[idx++] = batteryMv & 0xFF;          // Low byte

    // Temperature in 8.8 fixed-point format (big-endian)
    // Integer part in high byte, fractional part in low byte
    // For now: simulated 25.0°C = 0x1900
    // TODO: Read from actual temperature sensor when available
    float temp = 25.0f;
    uint16_t tempFixed = (uint16_t)(temp * 256.0f);  // Convert to 8.8 fixed-point
    tlmData[idx++] = (tempFixed >> 8) & 0xFF;  // Integer part
    tlmData[idx++] = tempFixed & 0xFF;          // Fractional part

    // Advertising count (big-endian, 4 bytes)
    tlmData[idx++] = (tlmAdvCount >> 24) & 0xFF;
    tlmData[idx++] = (tlmAdvCount >> 16) & 0xFF;
    tlmData[idx++] = (tlmAdvCount >> 8) & 0xFF;
    tlmData[idx++] = tlmAdvCount & 0xFF;
    tlmAdvCount++;  // Increment for next advertisement

    // Time since power-on in 0.1s resolution (big-endian, 4 bytes)
    uint32_t deciseconds = millis() / 100;
    tlmData[idx++] = (deciseconds >> 24) & 0xFF;
    tlmData[idx++] = (deciseconds >> 16) & 0xFF;
    tlmData[idx++] = (deciseconds >> 8) & 0xFF;
    tlmData[idx++] = deciseconds & 0xFF;

    // Set advertisement data with Eddystone service UUID
    NimBLEAdvertisementData advData;
    advData.setFlags(0x04);  // LE General Discoverable, BR/EDR Not Supported
    advData.setCompleteServices(BLEUUID((uint16_t)EDDYSTONE_SERVICE_UUID));
    advData.setServiceData(BLEUUID((uint16_t)EDDYSTONE_SERVICE_UUID), std::string((char*)tlmData, sizeof(tlmData)));

    pAdvertising->setAdvertisementData(advData);
    configureAdvertisingInterval();

    pAdvertising->start();
    isCustomDataActive = true;

    Serial.printf("[TLM] Eddystone-TLM sent (Battery: %dmV, Temp: %.1f°C, AdvCount: %lu, Uptime: %.1fs)\n",
        batteryMv,
        temp,
        (unsigned long)(tlmAdvCount - 1),
        deciseconds / 10.0f);
}

/**
 * Alternate between iBeacon, Custom Manufacturer Data, and Eddystone-TLM
 * Called periodically based on advertising interval
 * Ratio: 8 iBeacon packets : 1 Custom Data : 1 Eddystone-TLM
 */
void alternateAdvertising() {
    unsigned long now = millis();
    uint16_t interval_ms = beaconConfig.advertising_interval_ms;
    if (interval_ms < 20) interval_ms = 20;

    // Check if it's time to switch advertisement type
    if (now - lastAdvertisingSwitch >= interval_ms) {
        lastAdvertisingSwitch = now;

        // Increment packet counter and determine slot
        uint8_t currentSlot = packetCounter % ADVERTISING_RATIO;
        packetCounter++;

        if (currentSlot == CUSTOM_DATA_SLOT) {
            // Slot 8: send Custom Manufacturer Data
            sendCustomManufacturerData();
        } else if (currentSlot == TLM_SLOT) {
            // Slot 9: send Eddystone-TLM telemetry
            sendEddystoneTLM();
        } else if (isCustomDataActive) {
            // After custom/TLM data, switch back to iBeacon
            startIBeaconAdvertising();
        }
        // Otherwise: iBeacon is already running, no action needed
    }
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
        packetCounter = 0;  // Reset packet counter for clean start
        lastAdvertisingSwitch = millis();  // Reset advertising timer
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
                uint16_t new_interval = ((uint8_t)val[0] << 8) | (uint8_t)val[1];
                // Validate interval bounds (20ms - 10000ms)
                if (new_interval < 20) new_interval = 20;
                if (new_interval > 10000) new_interval = 10000;
                beaconConfig.advertising_interval_ms = new_interval;
                Serial.printf("[CFG] Interval set: %d ms\n", beaconConfig.advertising_interval_ms);
                saveConfig();
                // Advertising will restart with new interval on disconnect
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

    // Initialize ADC for battery reading (if hardware available)
    analogReadResolution(12);  // 12-bit resolution (0-4095)
    analogSetAttenuation(ADC_11db);  // Full range ~0-3.3V

    // Load config
    loadConfig();
    printConfig();

    // Get MAC
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_BT);
    Serial.printf("MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
        mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    // Initialize timers
    lastBatteryUpdate = millis();
    lastAdvertisingSwitch = millis();
    packetCounter = 0;

    // Setup BLE
    setupBLE();

    Serial.println("\n[READY] Beacon running!");
    Serial.println("  - iBeacon: 8 packets, Custom Data: 1 packet, Eddystone-TLM: 1 packet (ratio 8:1:1)");
    Serial.println("  - Custom Data contains: Battery Level + Firmware Version");
    Serial.println("  - Eddystone-TLM contains: Battery mV, Temperature, Adv Count, Uptime");
    Serial.println("  - Scan with nRF Connect to see all packet types");
    Serial.println("  - Connect to 'CheckIn-Beacon' to configure");
    Serial.println("  - Battery simulation: -1% every 10 minutes\n");

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
        packetCounter = 0;  // Reset packet counter
        startIBeaconAdvertising();
    }

    // Only alternate advertising when not in config mode
    if (!configModeActive) {
        // Alternate between iBeacon and Custom Manufacturer Data
        alternateAdvertising();
        
        // Update battery level (simulation or ADC)
        updateBatteryLevel();
    }

    delay(50);
}
