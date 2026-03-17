import serial.tools.list_ports
ports = list(serial.tools.list_ports.comports())
print(f"Found {len(ports)} ports")
for p in ports:
    print(f"Device: {p.device}, Description: {p.description}, Hardware ID: {p.hwid}")
