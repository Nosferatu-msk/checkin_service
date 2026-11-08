#include "nvs_storage.h"

const char* NVSStorage::NAMESPACE_NAME = "beacon";
const char* NVSStorage::KEY_UUID = "uuid";
const char* NVSStorage::KEY_MAJOR = "major";
const char* NVSStorage::KEY_MINOR = "minor";
const char* NVSStorage::KEY_TX_POWER = "tx_power";
const char* NVSStorage::KEY_INTERVAL = "interval";
const char* NVSStorage::KEY_BATTERY = "battery";
const char* NVSStorage::KEY_FIRMWARE = "firmware";

NVSStorage::NVSStorage() {}

void NVSStorage::begin() {
    preferences.begin(NAMESPACE_NAME, false);
}

void NVSStorage::loadConfig(BeaconConfig& config) {
    // Load UUID
    size_t uuid_len = preferences.getBytesLength(KEY_UUID);
    if (uuid_len == 16) {
        preferences.getBytes(KEY_UUID, config.uuid, 16);
    } else {
        memcpy(config.uuid, DEFAULT_CONFIG.uuid, 16);
    }
    
    // Load other values with defaults
    config.major = preferences.getUInt(KEY_MAJOR, DEFAULT_CONFIG.major);
    config.minor = preferences.getUInt(KEY_MINOR, DEFAULT_CONFIG.minor);
    config.tx_power = preferences.getInt(KEY_TX_POWER, DEFAULT_CONFIG.tx_power);
    config.advertising_interval_ms = preferences.getUInt(KEY_INTERVAL, DEFAULT_CONFIG.advertising_interval_ms);
    config.battery_level = preferences.getUInt(KEY_BATTERY, DEFAULT_CONFIG.battery_level);
    config.firmware_version = preferences.getUInt(KEY_FIRMWARE, DEFAULT_CONFIG.firmware_version);
}

void NVSStorage::saveConfig(const BeaconConfig& config) {
    preferences.putBytes(KEY_UUID, config.uuid, 16);
    preferences.putUInt(KEY_MAJOR, config.major);
    preferences.putUInt(KEY_MINOR, config.minor);
    preferences.putInt(KEY_TX_POWER, config.tx_power);
    preferences.putUInt(KEY_INTERVAL, config.advertising_interval_ms);
    preferences.putUInt(KEY_BATTERY, config.battery_level);
    preferences.putUInt(KEY_FIRMWARE, config.firmware_version);
}

void NVSStorage::resetToDefaults(BeaconConfig& config) {
    preferences.clear();
    memcpy(&config, &DEFAULT_CONFIG, sizeof(BeaconConfig));
    saveConfig(config);
}
