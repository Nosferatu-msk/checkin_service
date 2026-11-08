#ifndef BEACON_CONFIG_H
#define BEACON_CONFIG_H

#include <Arduino.h>

// Default beacon configuration
struct BeaconConfig {
    uint8_t uuid[16];
    uint16_t major;
    uint16_t minor;
    int8_t tx_power;
    uint16_t advertising_interval_ms;
    
    // Battery simulation (for testing)
    uint8_t battery_level;
    uint16_t firmware_version;
};

// Default values
const BeaconConfig DEFAULT_CONFIG = {
    .uuid = {0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 
             0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F},
    .major = 0,
    .minor = 0,
    .tx_power = -59,  // Calibrated TX power at 1 meter
    .advertising_interval_ms = 1000,
    .battery_level = 100,
    .firmware_version = 0x0100  // v1.0.0
};

// BLE Service UUIDs
#define BEACON_CONFIG_SERVICE_UUID "12345678-1234-1234-1234-123456789abc"
#define CHAR_UUID_UUID             "12345678-1234-1234-1234-123456789ab1"
#define CHAR_MAJOR_UUID            "12345678-1234-1234-1234-123456789ab2"
#define CHAR_MINOR_UUID            "12345678-1234-1234-1234-123456789ab3"
#define CHAR_TX_POWER_UUID         "12345678-1234-1234-1234-123456789ab4"
#define CHAR_INTERVAL_UUID         "12345678-1234-1234-1234-123456789ab5"
#define CHAR_BATTERY_UUID          "12345678-1234-1234-1234-123456789ab6"
#define CHAR_FIRMWARE_UUID         "12345678-1234-1234-1234-123456789ab7"
#define CHAR_RESET_UUID            "12345678-1234-1234-1234-123456789ab8"

#endif // BEACON_CONFIG_H
