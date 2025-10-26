#!/bin/bash

# Raspberry Pi Motor Server Setup Script
echo "Setting up Raspberry Pi Motor Control Server..."

# Update system
sudo apt update

# Install Python dependencies
pip3 install -r requirements.txt

# Create systemd service
sudo cp motor-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable motor-server.service

echo "Setup complete!"
echo "To start the service: sudo systemctl start motor-server.service"
echo "To check status: sudo systemctl status motor-server.service"
echo "To view logs: sudo journalctl -u motor-server.service -f"
