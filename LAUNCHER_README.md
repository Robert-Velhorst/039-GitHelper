# 🚀 Git Helper v3.1 - Easy Launcher Guide

This Git Helper tool includes multiple **noob-friendly** ways to start the application with just a double-click!

## 📁 Launcher Options

### Option 1: Windows Executable (Recommended for Windows)
- **`myapp.exe.zip`** - Compressed standalone executable; extract `myapp.exe` before launching it. No Node.js is required.
- Just double-click and it works!

### Option 2: Batch Script (Windows)
- **`START_GIT_HELPER.bat`** - Requires Node.js installed

### Option 3: Shell Script (Linux/Mac)
- **`start_git_helper.sh`** - Requires Node.js installed

---

## 🎯 How to Use

### Using myapp.exe (Windows Only):
1. Extract `myapp.exe` from `myapp.exe.zip`
2. **Double-click** the extracted `myapp.exe`
3. Browser opens automatically to `http://localhost:3000`
4. Login with your GitHub token
5. Start uploading files!

**Note:** No installation required! The exe includes everything needed.

### Using Batch/Shell Scripts:
1. **Double-click** the appropriate launcher
2. Wait for dependencies to install (first run only)
3. Browser opens automatically
4. Start using the tool!

---

## ✨ v3.1 Features Available

All launchers provide access to these features:

### 🔄 Auto-Enable Git LFS
- Upload files up to **2GB**
- LFS is configured **automatically** - no manual setup!
- Common file patterns pre-configured

### 📦 ZIP File Extraction
- Drop a `.zip` file and it's automatically extracted
- Individual files uploaded preserving folder structure

### 📁 Multi-File Upload
- Select multiple files at once
- All files are properly uploaded

---

## 📋 Prerequisites

### For myapp.exe:
- **None!** Just double-click and run.

### For Batch/Shell Scripts:
- **Node.js 26.12.0** and **npm 12.2.1** for the source launchers
- **Internet connection** (for first-time dependency installation)

### Installation Links:
- **Windows/Mac/Linux:** [Download Node.js](https://nodejs.org)
- **Ubuntu/Debian:** `sudo apt install nodejs npm`
- **macOS with Homebrew:** `brew install node`

---

## 🎮 First-Time Usage

### With myapp.exe:
1. Extract `myapp.exe` from `myapp.exe.zip`
2. **Double-click** the extracted `myapp.exe`
3. **Browser opens** automatically
4. **Login** with GitHub token
5. **Done!**

### With Scripts:
1. **Extract** the Git Helper files to a folder
2. **Double-click** the appropriate launcher
3. **Wait** for automatic setup (first run may take 2-3 minutes)
4. **Browser opens** automatically
5. **Login** with GitHub token and start using!

---

## 🛠️ Troubleshooting

### myapp.exe Issues:

**"Windows protected your PC" message:**
- Click "More info" → "Run anyway"
- This is normal for unsigned executables

**Port 3000 already in use:**
- Close other applications using port 3000
- Or wait a moment and try again

**Antivirus blocks the exe:**
- Add an exception for myapp.exe
- The exe is safe - it's just a packaged Node.js server

### Script Issues:

**"Node.js is not installed" Error:**
- Install Node.js from [nodejs.org](https://nodejs.org)
- Restart your computer after installation

**"Failed to install dependencies" Error:**
- Check your internet connection
- Delete `node_modules` folder and retry

**Browser doesn't open automatically:**
- Manually go to: `http://localhost:3000`

**Permission denied (Linux/Mac):**
- Run: `chmod +x start_git_helper.sh`

---

## 🎯 Advanced Users

If you prefer the command line:
```bash
npm install    # Install dependencies
npm start      # Start the application
```

Or build your own executable:
```bash
npm run build
npm run package:windows
```

---

## 📊 Comparison of Launch Methods

| Method | Requires Node.js | First Run Time | Subsequent Runs |
|--------|------------------|----------------|-----------------|
| myapp.exe (extracted from ZIP) | ❌ No | Instant | Instant |
| Batch/Shell | ✅ Yes | 2-3 minutes | ~5 seconds |
| npm start | ✅ Yes | 2-3 minutes | ~5 seconds |

---

**Now you can start the Git Helper tool with just a double-click! 🎉**

**Version:** 3.1 | **Max File Size:** 2GB with auto-enabled Git LFS
