import React, { useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';
import JSZip from 'jszip';
import {
  AppContainer,
  Header,
  Title,
  UserInfo,
  UserName,
  LoginButton,
  LogoutButton,
  MainContent,
  Sidebar,
  SidebarHeader,
  RepoList,
  RepoItem,
  Content,
  RepositoryHeader,
  RepoName,
  BranchSelector,
  PathNavigator,
  PathItem,
  PathSeparator,
  FileExplorer,
  FileItem,
  FileIcon,
  FileName,
  DropZone,
  DropZoneText,
  WelcomeMessage,
  Notification,
  Modal,
  ModalContent,
  ModalHeader,
  CloseButton,
  ModalBody,
  FileList,
  FileListItem,
  CommitMessageInput,
  ModalFooter,
  CancelButton,
  UploadButton
} from './styles/StyledComponents';

// Constants for file handling
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB per file
const GITHUB_BLOB_LIMIT = 35 * 1024 * 1024; // 35MB - GitHub API blob creation limit
const LFS_THRESHOLD = 35 * 1024 * 1024; // Files larger than 35MB use LFS

const App = () => {
  // State variables
  const [authenticated, setAuthenticated] = useState(false);
  const [octokit, setOctokit] = useState(null);
  const [user, setUser] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [notification, setNotification] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingZip, setProcessingZip] = useState(false);
  const [githubToken, setGithubToken] = useState(null);

  // Initialize GitHub on component mount
  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      setGithubToken(token);
      initializeGitHub(token);
    }
  }, []);

  // Initialize GitHub with token
  const initializeGitHub = async (token) => {
    try {
      const octokitInstance = new Octokit({
        auth: token
      });

      setOctokit(octokitInstance);
      setGithubToken(token);

      const { data: userData } = await octokitInstance.users.getAuthenticated();
      setUser(userData);
      setAuthenticated(true);

      await loadUserRepositories(octokitInstance);

      showNotification('success', `Logged in as ${userData.login}`);
    } catch (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('github_token');
      setAuthenticated(false);
      showNotification('error', 'Authentication failed');
    }
  };

  // Load user repositories with numeric sorting
  const loadUserRepositories = async (octokitInstance) => {
    try {
      const repos = await octokitInstance.paginate(
        octokitInstance.repos.listForAuthenticatedUser,
        {per_page: 100, sort: 'updated'}
      );
      const sortedRepos = repos.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setRepositories(sortedRepos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      showNotification('error', 'Failed to load repositories');
    }
  };

  // Utility function to normalize paths
  const normalizePath = (path) => {
    if (!path || path === '/') return '';
    const normalized = path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
    return normalized;
  };

  // Utility function to join paths properly
  const joinPaths = (...paths) => {
    const filtered = paths.filter(p => p && p !== '/');
    if (filtered.length === 0) return '';
    const joined = filtered.join('/').replace(/\/+/g, '/');
    return normalizePath(joined);
  };

  // Load repository contents
  const loadRepositoryContents = async (repo, path = '', branch) => {
    if (!octokit || !repo) return;

    try {
      const targetBranch = branch || repo.default_branch;
      setContents([]);
      const normalizedPath = normalizePath(path);

      console.log(`Loading contents for path: ${normalizedPath} on branch: ${targetBranch}`);

      const { data: contentsData } = await octokit.repos.getContent({
        owner: repo.owner.login,
        repo: repo.name,
        path: normalizedPath,
        ref: targetBranch,
        headers: {
          'If-None-Match': ''
        }
      });

      // Sort contents with numeric-aware sorting
      const sortedContents = Array.isArray(contentsData) 
        ? contentsData.sort((a, b) => {
            // Directories first, then files
            if (a.type !== b.type) {
              return a.type === 'dir' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          })
        : [contentsData];

      setContents(sortedContents);
      setCurrentPath(normalizedPath);

      const { data: branchesData } = await octokit.repos.listBranches({
        owner: repo.owner.login,
        repo: repo.name
      });

      setBranches(branchesData.map(b => b.name));
      setCurrentBranch(targetBranch);

      return true;
    } catch (error) {
      console.error('Error loading repository contents:', error);

      if (error.status === 404) {
        showNotification('error', 'Path not found in repository');
      } else if (error.status === 403) {
        showNotification('error', 'Access denied - check repository permissions');
      } else {
        showNotification('error', `Failed to load repository contents: ${error.message}`);
      }
      return false;
    }
  };

  // Handle repository selection
  const handleSelectRepository = async (repo) => {
    setSelectedRepo(repo);
    await loadRepositoryContents(repo);
  };

  // Handle branch selection
  const handleSelectBranch = async (branch) => {
    if (selectedRepo) {
      await loadRepositoryContents(selectedRepo, currentPath, branch);
    }
  };

  // Handle directory navigation
  const handleNavigate = async (item) => {
    if (item.type === 'dir') {
      await loadRepositoryContents(selectedRepo, item.path, currentBranch);
    } else {
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          path: item.path,
          ref: currentBranch
        });

        if (fileData.encoding === 'base64' && !isImageFile(fileData.name)) {
          const content = atob(fileData.content);
          console.log('File content:', content);
          showNotification('info', `Viewing file: ${item.name}`);
        } else if (isImageFile(fileData.name)) {
          const imageUrl = `data:image/png;base64,${fileData.content}`;
          console.log('Image URL:', imageUrl);
          showNotification('info', `Viewing image: ${item.name}`);
        }
      } catch (error) {
        console.error('Error loading file content:', error);
        showNotification('error', 'Failed to load file content');
      }
    }
  };

  // Check if file is an image
  const isImageFile = (filename) => {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  // Check if file is a ZIP archive
  const isZipFile = (file) => {
    return file.name.toLowerCase().endsWith('.zip') || 
           file.type === 'application/zip' ||
           file.type === 'application/x-zip-compressed';
  };

  // Extract files from ZIP archive
  const extractZipFile = async (zipFile) => {
    try {
      setProcessingZip(true);
      showNotification('info', `Extracting ${zipFile.name}...`);
      
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      const extractedFiles = [];

      const filePromises = [];
      
      zipContent.forEach((relativePath, zipEntry) => {
        // Skip directories and hidden files
        if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) {
          return;
        }

        const promise = zipEntry.async('blob').then(blob => {
          // Create a File object from the blob
          const file = new File([blob], relativePath, {
            type: blob.type || 'application/octet-stream'
          });
          // Store the relative path for proper folder structure
          file.relativePath = relativePath;
          return file;
        });
        
        filePromises.push(promise);
      });

      const files = await Promise.all(filePromises);
      extractedFiles.push(...files);

      setProcessingZip(false);
      showNotification('success', `Extracted ${extractedFiles.length} files from ${zipFile.name}`);
      
      return extractedFiles;
    } catch (error) {
      setProcessingZip(false);
      console.error('Error extracting ZIP file:', error);
      showNotification('error', `Failed to extract ZIP file: ${error.message}`);
      return [];
    }
  };

  // Check if file needs Git LFS
  const needsLFS = (file) => {
    return file.size > LFS_THRESHOLD;
  };

  // Calculate SHA256 hash for LFS
  const calculateSHA256 = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Upload file to Git LFS
  const uploadToLFS = async (file, owner, repo) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sha256 = await calculateSHA256(arrayBuffer);
      const size = file.size;

      // Step 1: Request LFS batch API for upload URL
      const batchResponse = await fetch(
        `https://github.com/${owner}/${repo}.git/info/lfs/objects/batch`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.git-lfs+json',
            'Content-Type': 'application/vnd.git-lfs+json',
            'Authorization': `token ${githubToken}`
          },
          body: JSON.stringify({
            operation: 'upload',
            transfers: ['basic'],
            objects: [{
              oid: sha256,
              size: size
            }]
          })
        }
      );

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        throw new Error(`LFS batch request failed: ${batchResponse.status} - ${errorText}`);
      }

      const batchData = await batchResponse.json();
      
      if (!batchData.objects || batchData.objects.length === 0) {
        throw new Error('No LFS upload URL received');
      }

      const lfsObject = batchData.objects[0];

      // Check if file already exists in LFS
      if (lfsObject.actions && lfsObject.actions.upload) {
        // Step 2: Upload the actual file to LFS storage
        const uploadAction = lfsObject.actions.upload;
        const uploadHeaders = {
          'Content-Type': 'application/octet-stream',
          ...uploadAction.header
        };

        const uploadResponse = await fetch(uploadAction.href, {
          method: 'PUT',
          headers: uploadHeaders,
          body: arrayBuffer
        });

        if (!uploadResponse.ok) {
          throw new Error(`LFS upload failed: ${uploadResponse.status}`);
        }

        // Step 3: Verify the upload if verify action exists
        if (lfsObject.actions.verify) {
          const verifyAction = lfsObject.actions.verify;
          const verifyResponse = await fetch(verifyAction.href, {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.git-lfs+json',
              'Content-Type': 'application/vnd.git-lfs+json',
              ...verifyAction.header
            },
            body: JSON.stringify({
              oid: sha256,
              size: size
            })
          });

          if (!verifyResponse.ok) {
            console.warn('LFS verify failed, but upload may still be successful');
          }
        }
      }

      // Return LFS pointer content
      return {
        sha256,
        size,
        pointerContent: `version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${size}\n`
      };
    } catch (error) {
      console.error('LFS upload error:', error);
      throw error;
    }
  };

  // Auto-enable LFS for repository by creating/updating .gitattributes
  const autoEnableLFS = async (owner, repo, branch, fileExtensions) => {
    try {
      showNotification('info', 'Setting up Git LFS for this repository...');
      
      // Get unique file extensions that need LFS
      const uniqueExtensions = [...new Set(fileExtensions)];
      
      // Generate .gitattributes content for LFS tracking
      const lfsPatterns = uniqueExtensions.map(ext => `*${ext} filter=lfs diff=lfs merge=lfs -text`);
      
      // Also add common large file patterns
      const commonPatterns = [
        '*.zip filter=lfs diff=lfs merge=lfs -text',
        '*.7z filter=lfs diff=lfs merge=lfs -text',
        '*.rar filter=lfs diff=lfs merge=lfs -text',
        '*.tar.gz filter=lfs diff=lfs merge=lfs -text',
        '*.exe filter=lfs diff=lfs merge=lfs -text',
        '*.dll filter=lfs diff=lfs merge=lfs -text',
        '*.so filter=lfs diff=lfs merge=lfs -text',
        '*.dylib filter=lfs diff=lfs merge=lfs -text',
        '*.pdf filter=lfs diff=lfs merge=lfs -text',
        '*.psd filter=lfs diff=lfs merge=lfs -text',
        '*.ai filter=lfs diff=lfs merge=lfs -text',
        '*.mp4 filter=lfs diff=lfs merge=lfs -text',
        '*.mov filter=lfs diff=lfs merge=lfs -text',
        '*.avi filter=lfs diff=lfs merge=lfs -text',
        '*.mkv filter=lfs diff=lfs merge=lfs -text',
        '*.mp3 filter=lfs diff=lfs merge=lfs -text',
        '*.wav filter=lfs diff=lfs merge=lfs -text',
        '*.flac filter=lfs diff=lfs merge=lfs -text',
        '*.iso filter=lfs diff=lfs merge=lfs -text',
        '*.dmg filter=lfs diff=lfs merge=lfs -text'
      ];
      
      let existingContent = '';
      let existingFileSha = null;
      
      // Try to get existing .gitattributes file
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner,
          repo,
          path: '.gitattributes',
          ref: branch
        });
        
        if (existingFile.content) {
          existingContent = atob(existingFile.content);
          existingFileSha = existingFile.sha;
        }
      } catch (e) {
        // File doesn't exist, we'll create it
        console.log('.gitattributes does not exist, will create it');
      }
      
      // Parse existing patterns to avoid duplicates
      const existingPatterns = existingContent.split('\n').filter(line => line.trim());
      const existingPatternSet = new Set(existingPatterns.map(p => p.split(' ')[0]));
      
      // Add new patterns that don't already exist
      const newPatterns = [];
      
      for (const pattern of [...lfsPatterns, ...commonPatterns]) {
        const patternKey = pattern.split(' ')[0];
        if (!existingPatternSet.has(patternKey)) {
          newPatterns.push(pattern);
          existingPatternSet.add(patternKey);
        }
      }
      
      if (newPatterns.length === 0) {
        console.log('LFS already configured for all required file types');
        return true;
      }
      
      // Combine existing and new content
      const finalContent = existingContent.trim() 
        ? existingContent.trim() + '\n' + newPatterns.join('\n') + '\n'
        : '# Git LFS tracking (auto-configured by Git Helper)\n' + newPatterns.join('\n') + '\n';
      
      // Create or update .gitattributes file
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: '.gitattributes',
        message: 'Auto-configure Git LFS tracking for large files',
        content: btoa(finalContent),
        branch: branch,
        ...(existingFileSha ? { sha: existingFileSha } : {})
      });
      
      showNotification('success', 'Git LFS has been enabled for this repository');
      return true;
      
    } catch (error) {
      console.error('Error enabling LFS:', error);
      showNotification('warning', `Could not auto-enable LFS: ${error.message}. You may need to enable it manually.`);
      return false;
    }
  };

  // Get file extension from filename
  const getFileExtension = (filename) => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  };

  // Validate file before upload
  const validateFile = (file) => {
    const errors = [];

    if (file.size > MAX_FILE_SIZE) {
      const fileSizeGB = (file.size / 1024 / 1024 / 1024).toFixed(2);
      errors.push(`File "${file.name}" (${fileSizeGB}GB) exceeds the 2GB limit.`);
    }

    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(file.name)) {
      errors.push(`File "${file.name}" contains invalid characters.`);
    }

    return errors;
  };

  // Handle file upload via drag and drop - FIXED for multi-file selection
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated || !selectedRepo) {
      showNotification('error', 'Please select a repository first');
      return;
    }

    const collectedFiles = [];
    const errors = [];

    // Collect all files from the drop event
    const items = e.dataTransfer.items;
    const droppedFiles = e.dataTransfer.files;

    // Use DataTransferItemList if available (better for folders)
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            collectedFiles.push(file);
          }
        }
      }
    } else if (droppedFiles && droppedFiles.length > 0) {
      // Fallback to FileList
      for (let i = 0; i < droppedFiles.length; i++) {
        collectedFiles.push(droppedFiles[i]);
      }
    }

    console.log(`Collected ${collectedFiles.length} files from drop`);

    // Process collected files - extract ZIPs and validate
    const processedFiles = [];
    
    for (const file of collectedFiles) {
      if (isZipFile(file)) {
        // Extract ZIP file contents
        const extractedFiles = await extractZipFile(file);
        for (const extractedFile of extractedFiles) {
          const fileErrors = validateFile(extractedFile);
          if (fileErrors.length > 0) {
            errors.push(...fileErrors);
          } else {
            processedFiles.push(extractedFile);
          }
        }
      } else {
        // Regular file
        const fileErrors = validateFile(file);
        if (fileErrors.length > 0) {
          errors.push(...fileErrors);
        } else {
          processedFiles.push(file);
        }
      }
    }

    if (errors.length > 0) {
      showNotification('error', errors.slice(0, 3).join(' ')); // Show first 3 errors
    }

    if (processedFiles.length > 0) {
      setUploadFiles(processedFiles);
      setShowUploadModal(true);
    }
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Read file as base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } catch (error) {
            console.error('Error processing file data:', error);
            reject(error);
          }
        };

        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(error);
        };

        const timeout = Math.max(30000, file.size / 1024);
        setTimeout(() => {
          if (reader.readyState !== 2) {
            reader.abort();
            reject(new Error('FileReader timeout - file may be too large'));
          }
        }, timeout);

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error setting up FileReader:', error);
        reject(error);
      }
    });
  };

  // Handle file upload and commit with LFS support
  const handleUploadFiles = async () => {
    if (!commitMessage.trim()) {
      showNotification('error', 'Please enter a commit message');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const owner = selectedRepo.owner.login;
      const repo = selectedRepo.name;

      // Get the latest commit SHA for the branch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${currentBranch}`
      });

      const latestCommitSha = refData.object.sha;

      // Get the base tree
      const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha
      });

      const baseTreeSha = commitData.tree.sha;

      // Check if any files need LFS and auto-enable if necessary
      const lfsFilesToUpload = uploadFiles.filter(f => needsLFS(f));
      if (lfsFilesToUpload.length > 0) {
        // Get file extensions that need LFS tracking
        const lfsExtensions = lfsFilesToUpload.map(f => getFileExtension(f.relativePath || f.name)).filter(ext => ext);
        
        // Auto-enable LFS for this repository
        await autoEnableLFS(owner, repo, currentBranch, lfsExtensions);
        
        // Need to get updated commit SHA after .gitattributes change
        const { data: updatedRefData } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${currentBranch}`
        });
        
        const updatedCommitSha = updatedRefData.object.sha;
        
        // Get updated base tree
        const { data: updatedCommitData } = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: updatedCommitSha
        });
        
        // Update the base tree SHA for our file uploads
        Object.assign(commitData, updatedCommitData);
      }

      // Create blobs for each file with progress tracking
      const fileBlobs = [];
      const lfsFiles = [];
      const baseTreeShaFinal = commitData.tree.sha;

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];

        try {
          setUploadProgress(((i + 0.3) / uploadFiles.length) * 100);

          // Determine the file path - use relativePath for extracted ZIP files
          const fileName = file.relativePath || file.name;
          const filePath = joinPaths(currentPath, fileName);

          let blobSha;

          if (needsLFS(file)) {
            // Upload to LFS and create pointer file
            showNotification('info', `Uploading large file via LFS: ${file.name}`);
            
            try {
              const lfsResult = await uploadToLFS(file, owner, repo);
              
              // Create blob with LFS pointer content
              const { data: blobData } = await octokit.git.createBlob({
                owner,
                repo,
                content: Buffer.from(lfsResult.pointerContent).toString('base64'),
                encoding: 'base64'
              });

              blobSha = blobData.sha;
              lfsFiles.push({ name: file.name, size: file.size });
            } catch (lfsError) {
              console.error('LFS upload failed:', lfsError);
              throw new Error(
                `Failed to upload "${file.name}" via LFS. ` +
                `Please ensure LFS is enabled for this repository. ` +
                `Error: ${lfsError.message}`
              );
            }
          } else {
            // Handle normal files (under 35MB)
            const content = await readFileAsBase64(file);

            const { data: blobData } = await octokit.git.createBlob({
              owner,
              repo,
              content: content,
              encoding: 'base64'
            });

            blobSha = blobData.sha;
          }

          fileBlobs.push({
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blobSha
          });

          setUploadProgress(((i + 1) / uploadFiles.length) * 100);

        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          throw new Error(`Failed to process file "${file.name}": ${error.message}`);
        }
      }

      // Create tree (use updated base tree if LFS was auto-enabled)
      const { data: treeData } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeShaFinal,
        tree: fileBlobs
      });

      // Get the latest commit SHA (may have changed if LFS was auto-enabled)
      const { data: latestRefData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${currentBranch}`
      });
      const parentCommitSha = latestRefData.object.sha;

      // Create commit
      const { data: newCommitData } = await octokit.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeData.sha,
        parents: [parentCommitSha]
      });

      // Update branch reference
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${currentBranch}`,
        sha: newCommitData.sha,
        force: true
      });

      // Refresh contents
      setTimeout(async () => {
        const success = await loadRepositoryContents(selectedRepo, currentPath, currentBranch);
        if (!success) {
          setTimeout(() => {
            loadRepositoryContents(selectedRepo, currentPath, currentBranch);
          }, 1000);
        }
      }, 500);

      // Close modal and clear state
      setShowUploadModal(false);
      setUploadFiles([]);
      setCommitMessage('');
      setUploadProgress(0);

      const lfsMessage = lfsFiles.length > 0 
        ? ` (${lfsFiles.length} file(s) via LFS)` 
        : '';
      showNotification('success', `Successfully uploaded ${uploadFiles.length} file(s)${lfsMessage}`);

    } catch (error) {
      console.error('Error uploading files:', error);

      if (error.message.includes('exceeds') || error.message.includes('too large')) {
        showNotification('error', error.message);
      } else if (error.message.includes('malformed')) {
        showNotification('error', 'Invalid file path. Please check file names for special characters.');
      } else if (error.message.includes('LFS')) {
        showNotification('error', error.message);
      } else {
        showNotification('error', `Upload failed: ${error.message}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    const duration = (type === 'info' || type === 'warning') ? 8000 : 5000;
    setTimeout(() => setNotification(null), duration);
  };

  // Handle login
  const handleLogin = () => {
    const token = prompt('Enter your GitHub token:');
    if (token) {
      localStorage.setItem('github_token', token);
      initializeGitHub(token);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setAuthenticated(false);
    setUser(null);
    setOctokit(null);
    setGithubToken(null);
    setRepositories([]);
    setSelectedRepo(null);
    setContents([]);
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} bytes`;
  };

  return (
    <AppContainer>
      <Header>
        <Title>Git Helper Web - Enhanced Version</Title>
        {authenticated ? (
          <UserInfo>
            {user && <UserName>{user.login}</UserName>}
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </UserInfo>
        ) : (
          <LoginButton onClick={handleLogin}>Login with GitHub</LoginButton>
        )}
      </Header>

      {authenticated ? (
        <MainContent>
          <Sidebar>
            <SidebarHeader>Repositories</SidebarHeader>
            <RepoList>
              {repositories.map(repo => (
                <RepoItem
                  key={repo.id}
                  selected={selectedRepo && selectedRepo.id === repo.id}
                  onClick={() => handleSelectRepository(repo)}
                >
                  {repo.name}
                </RepoItem>
              ))}
            </RepoList>
          </Sidebar>

          <Content>
            {selectedRepo ? (
              <>
                <RepositoryHeader style={{ display: "flex", flexWrap: 'wrap' }}>
                  <RepoName>{selectedRepo.name}</RepoName>
                  <BranchSelector>
                    <label>Branch:</label>
                    <select
                      value={currentBranch}
                      onChange={(e) => handleSelectBranch(e.target.value)}
                      style={{ width: "100%", maxWidth: 500 }}
                    >
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </BranchSelector>
                </RepositoryHeader>

                <PathNavigator>
                  <PathItem onClick={() => loadRepositoryContents(selectedRepo, '', currentBranch)}>
                    Root
                  </PathItem>
                  {currentPath && currentPath.split('/').filter(Boolean).map((part, index, array) => {
                    const path = array.slice(0, index + 1).join('/');
                    return (
                      <React.Fragment key={path}>
                        <PathSeparator>/</PathSeparator>
                        <PathItem onClick={() => loadRepositoryContents(selectedRepo, path, currentBranch)}>
                          {part}
                        </PathItem>
                      </React.Fragment>
                    );
                  })}
                </PathNavigator>

                <FileExplorer>
                  {contents.map(item => (
                    <FileItem
                      key={item.sha}
                      onClick={() => handleNavigate(item)}
                    >
                      <FileIcon>{item.type === 'dir' ? '📁' : '📄'}</FileIcon>
                      <FileName>{item.name}</FileName>
                    </FileItem>
                  ))}
                </FileExplorer>

                <DropZone
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <DropZoneText>
                    {processingZip ? (
                      'Extracting ZIP file...'
                    ) : (
                      <>
                        Drop files or ZIP archives here to upload
                        <br />
                        <small>
                          ZIP files will be extracted automatically
                          <br />
                          Files up to 2GB supported (large files use Git LFS)
                        </small>
                      </>
                    )}
                  </DropZoneText>
                </DropZone>
              </>
            ) : (
              <WelcomeMessage>
                <h2>Select a Repository</h2>
                <p>Choose a repository from the sidebar to get started</p>
              </WelcomeMessage>
            )}
          </Content>
        </MainContent>
      ) : (
        <WelcomeMessage>
          <h2>Welcome to Git Helper Web - Enhanced Version</h2>
          <p>Please login with GitHub to get started</p>
          <p><small>Now with ZIP extraction and Git LFS support for large files!</small></p>
          <LoginButton onClick={handleLogin}>Login with GitHub</LoginButton>
        </WelcomeMessage>
      )}

      {notification && (
        <Notification type={notification.type}>
          {notification.message}
        </Notification>
      )}

      {showUploadModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h3>Upload Files</h3>
              <CloseButton onClick={() => setShowUploadModal(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <h4>Files to upload ({uploadFiles.length}):</h4>
              <FileList style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {uploadFiles.map((file, index) => {
                  const displaySize = formatFileSize(file.size);
                  const usesLFS = needsLFS(file);
                  const displayName = file.relativePath || file.name;

                  return (
                    <FileListItem 
                      key={index} 
                      style={usesLFS ? { color: '#58a6ff' } : {}}
                    >
                      {displayName} ({displaySize})
                      {usesLFS && ' [LFS]'}
                    </FileListItem>
                  );
                })}
              </FileList>
              {isUploading && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '8px' }}>Upload Progress: {uploadProgress.toFixed(0)}%</div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#21262d',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      backgroundColor: '#2ea043',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              )}
              <CommitMessageInput>
                <label>Commit message:</label>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  disabled={isUploading}
                />
              </CommitMessageInput>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={() => setShowUploadModal(false)} disabled={isUploading}>
                Cancel
              </CancelButton>
              <UploadButton onClick={handleUploadFiles} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Commit Changes'}
              </UploadButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </AppContainer>
  );
};

export default App;
