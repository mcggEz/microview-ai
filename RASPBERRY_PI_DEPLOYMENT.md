# Raspberry Pi Deployment Guide

This guide shows how to deploy your Next.js app directly on Raspberry Pi for local motor control.

## 🍓 **Why Deploy on Raspberry Pi?**

- ✅ **Direct GPIO Access**: Next.js runs on the same device as motors
- ✅ **No Network Latency**: Instant motor control
- ✅ **Offline Operation**: Works without internet
- ✅ **Real-time Control**: Direct hardware access

## 🚀 **Deployment Steps**

### 1. **Install Node.js on Raspberry Pi**

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. **Install GPIO Tools**

```bash
# Install wiringPi for GPIO control
sudo apt update
sudo apt install -y wiringpi

# Test GPIO access
gpio readall
```

### 3. **Clone and Setup Your App**

```bash
# Clone your repository
git clone https://github.com/mcggEz/microview-ai.git
cd microview-ai

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### 4. **Configure Environment Variables**

Edit `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyCkAC0Bf-v47G3rEqnjL46a79q-OefLcQ4

# Raspberry Pi Configuration
RASPBERRY_PI_MODE=true
MOTOR_ENABLED=true
```

**Important**: Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 5. **Build and Start the App**

```bash
# Build for production
npm run build

# Start the app
npm start
```

Your app will be available at `http://raspberry-pi-ip:3000`

## 🔧 **Production Deployment**

### **Option A: PM2 (Recommended)**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app with PM2
pm2 start npm --name "microview-ai" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### **Option B: Systemd Service**

Create `/etc/systemd/system/microview-ai.service`:
```ini
[Unit]
Description=MicroView AI Next.js App
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/microview-ai
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable microview-ai
sudo systemctl start microview-ai
sudo systemctl status microview-ai
```

## 🌐 **Access from Other Devices**

### **Local Network Access**

Your app will be accessible from other devices on the same network:
- **URL**: `http://raspberry-pi-ip:3000`
- **Find IP**: `hostname -I` on Raspberry Pi

### **Remote Access (Optional)**

For remote access, you can use:
- **ngrok**: `ngrok http 3000`
- **Cloudflare Tunnel**: For secure remote access
- **VPN**: Connect to your local network

## 🔌 **Hardware Connection**

### **GPIO Pin Setup**

Your motor control code uses these pins:
```typescript
const MOTOR_PINS = {
  x: { step: 17, dir: 18, enable: 27 },  // X-axis
  y: { step: 22, dir: 23, enable: 24 },  // Y-axis  
  z: { step: 25, dir: 8, enable: 7 }     // Z-axis
}
```

### **Wiring Diagram**

```
Raspberry Pi GPIO → Motor Driver → Stepper Motor
├── GPIO17 → STEP → Motor A
├── GPIO18 → DIR  → Motor A
├── GPIO27 → ENA  → Motor A
├── GPIO22 → STEP → Motor B
├── GPIO23 → DIR  → Motor B
├── GPIO24 → ENA  → Motor B
├── GPIO25 → STEP → Motor C
├── GPIO8  → DIR  → Motor C
└── GPIO7  → ENA  → Motor C
```

## 🧪 **Testing Motor Control**

### **1. Test GPIO Access**

```bash
# Test GPIO pin 17
gpio -g mode 17 out
gpio -g write 17 1
gpio -g write 17 0
```

### **2. Test Motor Control API**

```bash
# Test motor control via API
curl -X POST http://localhost:3000/api/motor-control \
  -H "Content-Type: application/json" \
  -d '{"command": "home", "params": {}}'
```

### **3. Test from Web Interface**

Open `http://raspberry-pi-ip:3000` in a browser and use the motor control interface.

## 🔒 **Security Considerations**

### **1. Firewall Setup**

```bash
# Allow only necessary ports
sudo ufw allow 3000
sudo ufw enable
```

### **2. User Permissions**

```bash
# Add user to gpio group
sudo usermod -a -G gpio $USER

# Reboot to apply changes
sudo reboot
```

### **3. Environment Variables**

Keep sensitive data in environment variables:
```bash
# Never commit .env.local to git
echo ".env.local" >> .gitignore
```

## 📊 **Monitoring and Logs**

### **PM2 Monitoring**

```bash
# View app status
pm2 status

# View logs
pm2 logs microview-ai

# Monitor resources
pm2 monit
```

### **System Monitoring**

```bash
# Monitor system resources
htop

# Check GPIO status
gpio readall

# Monitor network
netstat -tulpn | grep :3000
```

## 🔄 **Auto-restart on Failure**

### **PM2 Auto-restart**

```bash
# PM2 automatically restarts on crashes
pm2 start npm --name "microview-ai" -- start --max-memory-restart 300M
```

### **Systemd Auto-restart**

The systemd service automatically restarts on failure.

## 🚀 **Performance Optimization**

### **1. Disable Unused Services**

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

### **2. Overclock (Optional)**

```bash
# Edit config for overclocking
sudo nano /boot/config.txt

# Add these lines:
over_voltage=2
arm_freq=1750
```

### **3. Use SSD (Optional)**

For better performance, use an SSD instead of SD card.

## 🆘 **Troubleshooting**

### **Common Issues**

1. **GPIO Permission Denied**
   ```bash
   sudo usermod -a -G gpio $USER
   sudo reboot
   ```

2. **Port 3000 Already in Use**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

3. **App Won't Start**
   ```bash
   # Check logs
   pm2 logs microview-ai
   
   # Check Node.js version
   node --version
   ```

4. **Motors Not Moving**
   ```bash
   # Test GPIO manually
   gpio -g mode 17 out
   gpio -g write 17 1
   ```

## 📱 **Mobile Access**

### **Responsive Design**

Your Next.js app is already responsive and works on mobile devices. Access it from:
- **Phone**: `http://raspberry-pi-ip:3000`
- **Tablet**: `http://raspberry-pi-ip:3000`

### **PWA Features (Optional)**

Add Progressive Web App features for better mobile experience.

## ✅ **Benefits of This Approach**

- ✅ **Direct Hardware Access**: No network delays
- ✅ **Offline Operation**: Works without internet
- ✅ **Real-time Control**: Instant motor response
- ✅ **Local Network Access**: Multiple devices can control
- ✅ **Easy Deployment**: Single device setup
- ✅ **Cost Effective**: No cloud server needed

This approach gives you the best performance and reliability for motor control!
