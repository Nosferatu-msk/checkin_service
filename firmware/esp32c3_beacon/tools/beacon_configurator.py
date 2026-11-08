"""
ESP32-C3 BLE Beacon Configurator
Utility for configuring BLE beacons from PC via BLE

Requirements: pip install bleak
Usage: python beacon_configurator.py

Compatible with nRF Connect app on Android/iOS as alternative.
"""

import asyncio
import sys
import struct
from bleak import BleakScanner, BleakClient

# BLE Service and Characteristic UUIDs
CONFIG_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc"
CHAR_UUID_UUID      = "12345678-1234-1234-1234-123456789ab1"
CHAR_MAJOR_UUID     = "12345678-1234-1234-1234-123456789ab2"
CHAR_MINOR_UUID     = "12345678-1234-1234-1234-123456789ab3"
CHAR_TX_POWER_UUID  = "12345678-1234-1234-1234-123456789ab4"
CHAR_INTERVAL_UUID  = "12345678-1234-1234-1234-123456789ab5"
CHAR_BATTERY_UUID   = "12345678-1234-1234-1234-123456789ab6"
CHAR_FIRMWARE_UUID  = "12345678-1234-1234-1234-123456789ab7"
CHAR_RESET_UUID     = "12345678-1234-1234-1234-123456789ab8"

BEACON_NAME = "CheckIn-Beacon"


def uuid_to_bytes(uuid_str: str) -> bytes:
    """Convert UUID string to 16 bytes.
    Example: '00010203-0405-0607-0809-0A0B0C0D0E0F' -> bytes
    """
    clean = uuid_str.replace("-", "")
    return bytes.fromhex(clean)


def bytes_to_uuid(data: bytes) -> str:
    """Convert 16 bytes to UUID string."""
    hex_str = data.hex().upper()
    return f"{hex_str[0:8]}-{hex_str[8:12]}-{hex_str[12:16]}-{hex_str[16:20]}-{hex_str[20:32]}"


async def scan_beacons(timeout: float = 5.0):
    """Scan for nearby BLE beacons."""
    print(f"\n🔍 Scanning for BLE devices ({timeout}s)...\n")
    
    devices = await BleakScanner.discover(timeout=timeout)
    
    beacons = []
    for d in devices:
        name = d.name or "Unknown"
        # Show all devices, highlight potential beacons
        marker = " ⚡" if "Beacon" in name or "CheckIn" in name else ""
        print(f"  {d.address}  {name}{marker}")
        if "Beacon" in name or "CheckIn" in name:
            beacons.append(d)
    
    return beacons


async def read_config(client: BleakClient):
    """Read current beacon configuration."""
    print("\n📖 Current Configuration:")
    print("-" * 40)
    
    # UUID
    uuid_data = await client.read_gatt_char(CHAR_UUID_UUID)
    uuid_str = bytes_to_uuid(uuid_data)
    print(f"  UUID:     {uuid_str}")
    
    # Major
    major_data = await client.read_gatt_char(CHAR_MAJOR_UUID)
    major = struct.unpack(">H", major_data)[0]
    print(f"  Major:    {major}")
    
    # Minor
    minor_data = await client.read_gatt_char(CHAR_MINOR_UUID)
    minor = struct.unpack(">H", minor_data)[0]
    print(f"  Minor:    {minor}")
    
    # TX Power
    tx_data = await client.read_gatt_char(CHAR_TX_POWER_UUID)
    tx_power = struct.unpack("b", tx_data)[0]
    print(f"  TX Power: {tx_power} dBm")
    
    # Interval
    int_data = await client.read_gatt_char(CHAR_INTERVAL_UUID)
    interval = struct.unpack(">H", int_data)[0]
    print(f"  Interval: {interval} ms")
    
    # Battery
    bat_data = await client.read_gatt_char(CHAR_BATTERY_UUID)
    battery = bat_data[0]
    print(f"  Battery:  {battery}%")
    
    # Firmware
    fw_data = await client.read_gatt_char(CHAR_FIRMWARE_UUID)
    fw_major = (fw_data[0] >> 4) & 0x0F
    fw_minor = fw_data[0] & 0x0F
    fw_patch = fw_data[1]
    print(f"  Firmware: v{fw_major}.{fw_minor}.{fw_patch}")
    
    print("-" * 40)
    
    return {
        "uuid": uuid_str,
        "major": major,
        "minor": minor,
        "tx_power": tx_power,
        "interval": interval,
        "battery": battery
    }


async def write_config(client: BleakClient, uuid=None, major=None, minor=None, 
                        tx_power=None, interval=None):
    """Write beacon configuration."""
    
    if uuid is not None:
        data = uuid_to_bytes(uuid)
        await client.write_gatt_char(CHAR_UUID_UUID, data)
        print(f"  ✅ UUID set to: {uuid}")
    
    if major is not None:
        data = struct.pack(">H", major)
        await client.write_gatt_char(CHAR_MAJOR_UUID, data)
        print(f"  ✅ Major set to: {major}")
    
    if minor is not None:
        data = struct.pack(">H", minor)
        await client.write_gatt_char(CHAR_MINOR_UUID, data)
        print(f"  ✅ Minor set to: {minor}")
    
    if tx_power is not None:
        data = struct.pack("b", tx_power)
        await client.write_gatt_char(CHAR_TX_POWER_UUID, data)
        print(f"  ✅ TX Power set to: {tx_power} dBm")
    
    if interval is not None:
        data = struct.pack(">H", interval)
        await client.write_gatt_char(CHAR_INTERVAL_UUID, data)
        print(f"  ✅ Interval set to: {interval} ms")


async def reset_beacon(client: BleakClient):
    """Reset beacon to factory defaults."""
    await client.write_gatt_char(CHAR_RESET_UUID, bytes([0xAA]))
    print("  ✅ Reset command sent, beacon restarting...")


async def interactive_config(address: str):
    """Interactive configuration session."""
    print(f"\n🔗 Connecting to {address}...")
    
    async with BleakClient(address) as client:
        if not client.is_connected:
            print("  ❌ Failed to connect!")
            return
        
        print("  ✅ Connected!\n")
        
        # Read current config
        config = await read_config(client)
        
        # Interactive loop
        while True:
            print("\n📝 Commands:")
            print("  1. Set UUID")
            print("  2. Set Major")
            print("  3. Set Minor")
            print("  4. Set TX Power")
            print("  5. Set Interval")
            print("  6. Read current config")
            print("  7. Reset to defaults")
            print("  8. Quick setup (object/zone)")
            print("  0. Exit")
            
            choice = input("\n> ").strip()
            
            if choice == "1":
                uuid = input("  UUID (e.g., E2C56DB5-DFFB-48D2-B060-D0F5A71096E0): ").strip()
                await write_config(client, uuid=uuid)
            
            elif choice == "2":
                major = int(input("  Major (0-65535): ").strip())
                await write_config(client, major=major)
            
            elif choice == "3":
                minor = int(input("  Minor (0-65535): ").strip())
                await write_config(client, minor=minor)
            
            elif choice == "4":
                tx = int(input("  TX Power (-40 to +4 dBm): ").strip())
                await write_config(client, tx_power=tx)
            
            elif choice == "5":
                interval = int(input("  Interval (100-10000 ms): ").strip())
                await write_config(client, interval=interval)
            
            elif choice == "6":
                await read_config(client)
            
            elif choice == "7":
                confirm = input("  Are you sure? (y/N): ").strip().lower()
                if confirm == "y":
                    await reset_beacon(client)
                    break
            
            elif choice == "8":
                print("\n  Quick Setup:")
                print("  Default UUID: E2C56DB5-DFFB-48D2-B060-D0F5A71096E0")
                obj_id = int(input("  Object ID (Major, 0-65535): ").strip())
                zone_id = int(input("  Zone ID (Minor, 0-65535): ").strip())
                await write_config(
                    client,
                    uuid="E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
                    major=obj_id,
                    minor=zone_id,
                    tx_power=-59,
                    interval=1000
                )
                print(f"\n  ✅ Beacon configured: Object={obj_id}, Zone={zone_id}")
            
            elif choice == "0":
                print("  👋 Done!")
                break
            
            else:
                print("  ❓ Unknown command")


async def main():
    """Main entry point."""
    print("\n╔═══════════════════════════════════════╗")
    print("║   BLE Beacon Configurator v1.0       ║")
    print("║   For ESP32-C3 CheckIn Beacons       ║")
    print("╚═══════════════════════════════════════╝")
    
    if len(sys.argv) > 1:
        # Direct connect to address
        address = sys.argv[1]
        await interactive_config(address)
    else:
        # Scan first
        beacons = await scan_beacons()
        
        if not beacons:
            print("\n⚠️  No beacons found. Make sure:")
            print("  - BLE is enabled on your PC")
            print("  - Beacon is powered on")
            print("  - Beacon is within range (~10m)")
            print("\n  You can also specify address directly:")
            print("  python beacon_configurator.py <MAC_ADDRESS>")
            return
        
        print(f"\n📡 Found {len(beacons)} beacon(s)")
        
        if len(beacons) == 1:
            await interactive_config(beacons[0].address)
        else:
            print("\nSelect beacon:")
            for i, b in enumerate(beacons):
                print(f"  {i+1}. {b.address} ({b.name})")
            
            choice = int(input("\n> ")) - 1
            if 0 <= choice < len(beacons):
                await interactive_config(beacons[choice].address)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n  👋 Interrupted")
    except Exception as e:
        print(f"\n  ❌ Error: {e}")
        print("  Make sure 'bleak' is installed: pip install bleak")
