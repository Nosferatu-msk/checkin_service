#ifndef NVS_STORAGE_H
#define NVS_STORAGE_H

#include <Arduino.h>
#include <Preferences.h>
#include "beacon_config.h"

class NVSStorage {
public:
    NVSStorage();
    void begin();
    void loadConfig(BeaconConfig& config);
    void saveConfig(const BeaconConfig& config);
    void resetToDefaults(BeaconConfig& config);
    
private:
    Preferences preferences;
    static const char* NAMESPACE_NAME;
    static const char* KEY_UUID;
    static const char* KEY_MAJOR;
    static const char* KEY_MINOR;
    static const char* KEY_TX_POWER;
    static const char* KEY_INTERVAL;
    static const char* KEY_BATTERY;
    static const char* KEY_FIRMWARE;
};

#endif // NVS_STORAGE_H
