# Git Helper Web v3.1

A React-based web application for uploading files to GitHub repositories with support for large files up to 2GB via automatic Git LFS integration.

## Quick Start

### Option 1: Double-Click Executable (Windows)
1. Download `myapp.exe` from the repository
2. Double-click to run
3. Browser opens automatically to `http://localhost:3000`
4. Login with your GitHub token and start uploading!

### Option 2: Run from Source
```bash
# Clone the repository
git clone https://github.com/Noodzakelijk-Online/039-GitHelper.git
cd 039-GitHelper

# Requires Node.js 24.22 LTS or Node.js 26.12 Current and npm 12.2.0
# Install dependencies
npm install

# Start the application
npm start
```

### Option 3: Use Launcher Scripts
- **Windows:** Double-click `START_GIT_HELPER.bat`
- **Linux/Mac:** Run `./start_git_helper.sh`

---

## Features

### Core Features
- GitHub authentication using OAuth tokens
- Repository listing and selection
- File and directory navigation
- Branch selection and navigation
- Drag and drop file upload
- Notification system for user feedback

### v3.1 Features (Latest)

#### 🚀 Auto-Enable Git LFS
When you upload a file larger than 35MB, the tool **automatically**:
1. Creates/updates `.gitattributes` in your repository
2. Configures LFS tracking for your file's extension
3. Adds common large file patterns for future uploads
4. Proceeds with the LFS upload - **no manual setup required!**

**Pre-configured LFS patterns added automatically:**
| Category | Extensions |
|----------|------------|
| Archives | `.zip`, `.7z`, `.rar`, `.tar.gz` |
| Executables | `.exe`, `.dll`, `.so`, `.dylib` |
| Documents | `.pdf`, `.psd`, `.ai` |
| Video | `.mp4`, `.mov`, `.avi`, `.mkv` |
| Audio | `.mp3`, `.wav`, `.flac` |
| Disk Images | `.iso`, `.dmg` |

#### 📦 ZIP File Extraction
- Automatically detects and extracts `.zip` files
- Uploads individual files while preserving folder structure
- Skips hidden files and macOS metadata (`__MACOSX`)
- Progress notification during extraction

#### 📁 Multi-File Selection
- Properly handles multiple file selection via drag & drop
- All selected files are uploaded correctly
- Works with both file selection and folder drops

#### 💾 Large File Support (up to 2GB)
- Files under 35MB: Direct GitHub API upload
- Files 35MB - 2GB: Automatic Git LFS upload
- SHA256 hash calculation for file integrity
- Upload progress tracking with visual indicators

---

## File Size Limits

| File Type | Size Limit | Upload Method |
|-----------|------------|---------------|
| Regular files | Up to 35 MB | Direct GitHub API |
| Large files | 35 MB - 2 GB | Git LFS (auto-enabled) |
| ZIP archives | Up to 2 GB | Extracted, individual files uploaded |

---

## Bug Fixes History

### v3.1 - Auto-Enable LFS (January 2026)
- ✅ Automatic `.gitattributes` creation for LFS tracking
- ✅ No manual LFS setup required

### v3.0 - Major Fixes (January 2026)
- ✅ ZIP file extraction implemented
- ✅ Multi-file selection fixed
- ✅ Full Git LFS upload support (actual file upload, not just pointers)

### v2.0 - Path Fixes (September 2025)
- ✅ Malformed path errors resolved
- ✅ Robust path normalization

### v1.0 - Initial Release
- Basic file upload functionality

---

## Project Structure

```
039-GitHelper/
├── myapp.exe              # Windows executable (double-click to run)
├── START_GIT_HELPER.bat   # Windows batch launcher
├── start_git_helper.sh    # Linux/Mac shell launcher
├── server.js              # Node.js server for the executable
├── package.json           # Dependencies and scripts
├── build/                 # Production build files
│   ├── index.html
│   └── static/
│       ├── css/
│       └── js/
├── src/                   # Source code
│   ├── App.js             # Main application component
│   ├── index.js           # Entry point
│   ├── index.css          # Global styles
│   └── styles/
│       └── StyledComponents.js  # UI components
├── public/                # Public assets
│   └── index.html
├── README.md              # This file
├── BUG_FIXES_SUMMARY.md   # Detailed bug fix documentation
└── LAUNCHER_README.md     # Launcher usage instructions
```

---

## Technical Details

### Dependencies
```json
{
  "@octokit/rest": "^22.0.0",
  "jszip": "^3.10.1",
  "react": "^19.1.0",
  "styled-components": "^6.1.18",
  "serve-handler": "^6.1.5",
  "open": "^10.1.0"
}
```

### How Git LFS Auto-Enable Works

1. **Detection:** When files >35MB are dropped, the tool identifies them as LFS candidates
2. **Extension Analysis:** Extracts file extensions (e.g., `.zip`, `.exe`)
3. **Gitattributes Update:** Creates or updates `.gitattributes` with LFS tracking patterns
4. **LFS Batch API:** Requests upload URL from GitHub's LFS batch endpoint
5. **File Upload:** Uploads actual file content to LFS storage
6. **Verification:** Confirms upload success with LFS server
7. **Pointer Creation:** Creates LFS pointer file in the repository

### Architecture

The application follows a component-based architecture:

1. **`index.js`** - Application initialization and mounting
2. **`App.js`** - Business logic, state management, and API calls
3. **`StyledComponents.js`** - UI components with GitHub dark theme styling

The styling uses styled-components with GitHub's dark theme colors:
- Background: `#0d1117`
- Text: `#c9d1d9`
- Accent: `#238636` (green for actions)

---

## Usage Guide

### Authentication
1. Generate a GitHub Personal Access Token with `repo` scope
2. Click "Login with GitHub" in the application
3. Enter your token when prompted

### Uploading Files
1. Select a repository from the sidebar
2. Navigate to the desired directory
3. Drag and drop files onto the drop zone
4. Enter a commit message
5. Click "Upload"

### Uploading Large Files (>35MB)
1. Simply drag and drop - LFS is configured automatically!
2. The tool will show "Setting up Git LFS for this repository..."
3. Files are uploaded to LFS storage
4. LFS pointer files are created in the repository

### Uploading ZIP Files
1. Drag and drop a `.zip` file
2. The tool automatically extracts contents
3. All files are listed in the upload modal
4. Folder structure is preserved

---

## Troubleshooting

### "LFS upload failed" Error
- Ensure your GitHub token has `repo` scope
- Check your LFS storage quota (1GB free per account)
- Verify the repository allows LFS

### "Malformed path" Error
- This should be fixed in v3.0+
- If it persists, ensure file names don't contain special characters

### Files Not Uploading
- Check file size (max 2GB)
- Ensure you're authenticated
- Verify repository write permissions

### Executable Doesn't Start
- Ensure port 3000 is not in use
- Try running as administrator
- Check Windows Defender/antivirus settings

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## License

This project is open source and available under the MIT License.

---

**Version:** 3.1  
**Status:** Production Ready  
**Max File Size:** 2GB with auto-enabled Git LFS  
**Last Updated:** January 2026
