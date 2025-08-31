# Desktop App Setup Guide

This guide explains how to create and deploy a desktop application version of MicroView AI that can run on Raspberry Pi and other systems.

## 🖥️ **Overview**

The desktop app is built using **Electron**, which wraps your Next.js web application in a native desktop environment. This provides:

- **Native desktop experience** with menus and system integration
- **Direct hardware access** for motor control via GPIO
- **Offline capability** (when configured)
- **System tray integration** and auto-start options
- **Cross-platform compatibility** (Windows, macOS, Linux, Raspberry Pi)

## 🚀 **Quick Start**

### 1. Install Dependencies

```bash
# Install Electron and build tools
npm install --save-dev electron electron-builder electron-is-dev concurrently wait-on

# Install additional dependencies
npm install --save-dev @types/node
```

### 2. Development Mode

```bash
# Start the desktop app in development mode
npm run electron-dev
```

This will:
- Start the Next.js development server
- Wait for it to be ready
- Launch the Electron app

### 3. Build for Production

```bash
# Build for current platform
npm run electron-pack

# Build for Linux (including Raspberry Pi)
npm run electron-pack-linux

# Build for ARM architecture (Raspberry Pi)
npm run electron-pack-arm
```

## 📁 **Project Structure**

```
microview-ai/
├── electron/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for security
│   └── assets/
│       └── icon.png     # App icon
├── src/
│   ├── app/             # Next.js app
│   ├── components/      # React components
│   ├── hooks/
│   │   └── useDesktopMotorControl.ts  # Desktop-specific motor control
│   └── lib/
│       └── motor-control.ts           # Motor control library
├── package.json         # Updated with Electron scripts
└── next.config.js       # Next.js configuration
```

## 🔧 **Configuration**

### Electron Configuration

The `package.json` includes Electron Builder configuration:

```json
{
  "build": {
    "appId": "com.microview.ai",
    "productName": "MicroView AI",
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64", "armv7l"]
        },
        {
          "target": "deb",
          "arch": ["x64", "armv7l"]
        }
      ],
      "category": "Science"
    }
  }
}
```

### Next.js Configuration

Update `next.config.js` for static export:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable server-side features for static export
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
```

## 🍓 **Raspberry Pi Setup**

### 1. Install Node.js on Raspberry Pi

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install System Dependencies

```bash
# Install required packages
sudo apt update
sudo apt install -y \
  libgtk-3-0 \
  libnotify4 \
  libnss3 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  libatspi2.0-0 \
  libdrm2 \
  libgbm1 \
  libasound2

# For ARM builds
sudo apt install -y \
  libgconf-2-4 \
  libcanberra-gtk-module
```

### 3. Build for Raspberry Pi

```bash
# Clone the repository
git clone https://github.com/mcggEz/microview-ai.git
cd microview-ai

# Install dependencies
npm install

# Build for ARM architecture
npm run electron-pack-arm
```

### 4. Install the App

```bash
# Install the .deb package
sudo dpkg -i dist/MicroView-AI-1.0.0-armv7l.deb

# Or run the AppImage
chmod +x dist/MicroView-AI-1.0.0-armv7l.AppImage
./dist/MicroView-AI-1.0.0-armv7l.AppImage
```

## 🔌 **Hardware Integration**

### GPIO Access

The desktop app can directly access GPIO pins for motor control:

```javascript
// In electron/main.js
const { exec } = require('child_process')

// Example GPIO control
function controlGPIO(pin, value) {
  exec(`gpio -g write ${pin} ${value}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`GPIO error: ${error}`)
      return
    }
    console.log(`GPIO ${pin} set to ${value}`)
  })
}
```

### Motor Control Integration

The desktop app provides direct motor control through the `useDesktopMotorControl` hook:

```typescript
import { useDesktopMotorControl } from '@/hooks/useDesktopMotorControl'

function MotorControlPanel() {
  const {
    moveTo,
    home,
    emergencyStop,
    isMoving,
    currentPosition,
    isDesktop
  } = useDesktopMotorControl()

  // Use motor control functions
  const handleHome = () => {
    home()
  }

  return (
    <div>
      {isDesktop ? (
        <button onClick={handleHome}>Home Motors</button>
      ) : (
        <p>Motor control only available in desktop app</p>
      )}
    </div>
  )
}
```

## 🎯 **Desktop Features**

### 1. Native Menus

The app includes desktop menus with keyboard shortcuts:

- **File Menu**: New Test (Ctrl+N), Open Dashboard (Ctrl+D), Exit (Ctrl+Q)
- **Motor Control Menu**: Home Motors (Ctrl+H), Emergency Stop (Ctrl+E)
- **View Menu**: Zoom controls, fullscreen, developer tools
- **Help Menu**: About dialog, documentation

### 2. System Integration

- **Auto-start**: Configure to start on boot
- **System tray**: Minimize to system tray
- **File associations**: Open image files directly
- **Print integration**: Print reports directly

### 3. Hardware Access

- **Direct GPIO control** for motor drivers
- **Camera access** for image capture
- **USB device access** for peripherals
- **Serial communication** for external devices

## 📦 **Deployment Options**

### 1. AppImage (Recommended for Raspberry Pi)

```bash
# Build AppImage
npm run electron-pack-arm

# Make executable and run
chmod +x dist/MicroView-AI-1.0.0-armv7l.AppImage
./dist/MicroView-AI-1.0.0-armv7l.AppImage
```

### 2. Debian Package

```bash
# Build .deb package
npm run electron-pack-arm

# Install
sudo dpkg -i dist/MicroView-AI-1.0.0-armv7l.deb
```

### 3. Auto-start Configuration

Create a desktop entry for auto-start:

```bash
# Create desktop entry
cat > ~/.config/autostart/microview-ai.desktop << EOF
[Desktop Entry]
Type=Application
Name=MicroView AI
Exec=/path/to/MicroView-AI-1.0.0-armv7l.AppImage
Terminal=false
Categories=Science;
EOF
```

## 🔒 **Security Considerations**

### 1. Context Isolation

The app uses Electron's context isolation for security:

```javascript
// In electron/main.js
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
  preload: path.join(__dirname, 'preload.js')
}
```

### 2. API Exposure

Only necessary APIs are exposed through the preload script:

```javascript
// In electron/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  motorCommand: (command, params) => ipcRenderer.invoke('motor-command', command, params),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  // ... other APIs
})
```

### 3. Input Validation

All motor commands are validated before execution:

```javascript
// Validate motor commands
function validateMotorCommand(command, params) {
  const validCommands = ['move_to', 'home', 'emergency_stop', 'focus_adjust']
  
  if (!validCommands.includes(command)) {
    throw new Error(`Invalid command: ${command}`)
  }
  
  // Validate parameters based on command
  // ...
}
```

## 🐛 **Troubleshooting**

### Common Issues

1. **App won't start**
   ```bash
   # Check dependencies
   ldd dist/MicroView-AI-1.0.0-armv7l.AppImage
   
   # Run with debug output
   ./dist/MicroView-AI-1.0.0-armv7l.AppImage --verbose
   ```

2. **GPIO access denied**
   ```bash
   # Add user to gpio group
   sudo usermod -a -G gpio $USER
   
   # Reboot or log out/in
   sudo reboot
   ```

3. **Camera not working**
   ```bash
   # Check camera permissions
   ls -l /dev/video*
   
   # Install camera dependencies
   sudo apt install -y v4l-utils
   ```

### Debug Mode

Run the app in debug mode:

```bash
# Development with DevTools
npm run electron-dev

# Production with DevTools
./dist/MicroView-AI-1.0.0-armv7l.AppImage --enable-logging
```

## 📈 **Performance Optimization**

### 1. Memory Management

```javascript
// In electron/main.js
app.on('ready', () => {
  // Enable garbage collection
  app.commandLine.appendSwitch('js-flags', '--expose-gc')
  
  // Monitor memory usage
  setInterval(() => {
    if (global.gc) {
      global.gc()
    }
  }, 30000)
})
```

### 2. Startup Optimization

```javascript
// Lazy load heavy modules
const heavyModule = require('./heavy-module')

// Use background processes for heavy tasks
const { spawn } = require('child_process')
const worker = spawn('node', ['worker.js'])
```

## 🔄 **Updates and Maintenance**

### 1. Auto-updater

```javascript
// In electron/main.js
const { autoUpdater } = require('electron-updater')

autoUpdater.checkForUpdatesAndNotify()
```

### 2. Logging

```javascript
// Configure logging
const log = require('electron-log')
log.transports.file.level = 'info'
log.transports.file.maxSize = 1024 * 1024
```

## 📚 **Additional Resources**

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder Documentation](https://www.electron.build/)
- [Raspberry Pi GPIO Guide](https://www.raspberrypi.org/documentation/usage/gpio/)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)

## 🆘 **Support**

For issues specific to the desktop app:

1. Check the troubleshooting section above
2. Review Electron and Next.js documentation
3. Check system requirements and dependencies
4. Verify GPIO permissions and hardware connections

The desktop app provides a professional, native experience for medical technicians while maintaining all the functionality of the web version with enhanced hardware integration capabilities.
