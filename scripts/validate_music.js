const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MUSIC_FILE = 'music.json';
const MUSIC_DIR = 'Music';
const MAX_SIZE_MB = 99;

function getModifiedFiles() {
  if (fs.existsSync('/tmp/changed-files.txt')) {
    try {
      return fs.readFileSync('/tmp/changed-files.txt', 'utf8')
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);
    } catch (e) {
      console.warn('Warning: Failed to read /tmp/changed-files.txt:', e.message);
    }
  }
  try {
    let diffOutput = '';
    try {
      diffOutput = execSync('git diff --name-only main...HEAD').toString();
    } catch (e) {
      try {
        diffOutput = execSync('git diff --name-only origin/main...HEAD').toString();
      } catch (e2) {
        diffOutput = execSync('git status --porcelain').toString();
        return diffOutput.split('\n')
          .map(line => line.substring(3).trim())
          .filter(Boolean);
      }
    }
    
    try {
      const localDiff = execSync('git diff --name-only').toString();
      const stagedDiff = execSync('git diff --cached --name-only').toString();
      diffOutput += '\n' + localDiff + '\n' + stagedDiff;
    } catch (err) {}
    
    return diffOutput.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.warn('Warning: Git is not available or main branch not found. Skipping strict sequential checking.');
    return null;
  }
}

function getBaselineMusic() {
  if (fs.existsSync('/tmp/baseline-music.json')) {
    try {
      return JSON.parse(fs.readFileSync('/tmp/baseline-music.json', 'utf8'));
    } catch (err) {
      console.warn('Warning: Failed to parse /tmp/baseline-music.json:', err.message);
    }
  }
  try {
    let baselineContent = '';
    try {
      baselineContent = execSync('git show main:music.json', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    } catch (e) {
      try {
        baselineContent = execSync('git show origin/main:music.json', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      } catch (e2) {
        console.warn('Warning: Could not get baseline music.json from git.');
        return null;
      }
    }
    return JSON.parse(baselineContent);
  } catch (err) {
    console.warn('Warning: Error parsing baseline music.json:', err.message);
    return null;
  }
}

function checkFileDeletionsOrModifications() {
  try {
    let diffOutput = '';
    try {
      diffOutput = execSync('git diff --name-status main...HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    } catch (e) {
      try {
        diffOutput = execSync('git diff --name-status origin/main...HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      } catch (e2) {
        diffOutput = execSync('git status --porcelain', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      }
    }
    
    const lines = diffOutput.split('\n').map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const status = parts[0];
        const filePath = parts[1].replace(/\\/g, '/');
        
        if (filePath.startsWith('Music/')) {
          if (status.includes('D') || status.includes('M') || status.includes('R')) {
            return {
              hasRemoval: true,
              reason: `File '${filePath}' was modified, deleted, or renamed (status: ${status}).`
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Warning: Error checking file deletions/modifications:', err.message);
  }
  return { hasRemoval: false };
}

function verifyFileSignature(localPath, ext) {
  try {
    const stats = fs.statSync(localPath);
    if (stats.size === 0) {
      return 'File is empty (0 bytes).';
    }
    
    if (ext === 'flac') {
      const buffer = Buffer.alloc(4);
      const fd = fs.openSync(localPath, 'r');
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const headerStr = buffer.toString('utf8');
      if (headerStr !== 'fLaC') {
        return 'File does not have a valid FLAC signature (must start with fLaC).';
      }
    }
  } catch (err) {
    return `Could not verify file signature: ${err.message}`;
  }
  return null;
}

function validate() {
  console.log('--- Starting music.json validation ---');

  if (!fs.existsSync(MUSIC_FILE)) {
    const errorMsg = `Error: ${MUSIC_FILE} not found!`;
    console.error(errorMsg);
    fs.writeFileSync('validation_report.md', `### ❌ Validation Failed\n\n${errorMsg}`);
    process.exit(1);
  }

  let data;
  try {
    const content = fs.readFileSync(MUSIC_FILE, 'utf8');
    data = JSON.parse(content);
  } catch (err) {
    const errorMsg = `Error Parsing JSON: ${err.message}`;
    console.error(errorMsg);
    fs.writeFileSync('validation_report.md', `### ❌ Validation Failed\n\n**JSON Parse Error:** ${err.message}`);
    process.exit(1);
  }

  if (!data.items || !Array.isArray(data.items)) {
    const errorMsg = `Error: 'items' array missing or invalid in ${MUSIC_FILE}`;
    console.error(errorMsg);
    fs.writeFileSync('validation_report.md', `### ❌ Validation Failed\n\n${errorMsg}`);
    process.exit(1);
  }

  const items = data.items;
  const errors = [];
  const seen = new Set();
  const modifiedFiles = getModifiedFiles();

  const baselineData = getBaselineMusic();
  const baselineItems = baselineData && baselineData.items ? baselineData.items : [];
  const baselineItemKeys = new Set(
    baselineItems.map(item => `${item.song || ''}|${item.artist || ''}|${item.url || ''}`)
  );

  items.forEach((item, index) => {
    const { song, artist, url } = item;

    if (!song || !artist || !url) {
      errors.push({ index, song: song || 'N/A', artist: artist || 'N/A', error: 'Missing required fields' });
      return;
    }

    const itemKey = `${song || ''}|${artist || ''}|${url || ''}`;
    const isNewOrModified = !baselineItemKeys.has(itemKey);

    if (isNewOrModified) {
      const cleanSong = song.trim();
      const cleanArtist = artist.trim();
      
      if (!cleanSong || !cleanArtist) {
        errors.push({ index, song, artist, error: 'Song title and artist name cannot be empty or whitespace-only' });
      } else {
        if (cleanSong.length > 100 || cleanArtist.length > 100) {
          errors.push({ index, song, artist, error: 'Song title and artist name must be under 100 characters' });
        }
        if (/<[^>]*>/g.test(cleanSong) || /<[^>]*>/g.test(cleanArtist)) {
          errors.push({ index, song, artist, error: 'HTML/Script tags are prohibited in song title and artist fields' });
        }
      }
    }

    const key = `${song.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(key)) {
      errors.push({ index, song, artist, error: 'Duplicate song/artist entry' });
    } else {
      seen.add(key);
    }

    const urlLower = url.toLowerCase();
    if (!urlLower.endsWith('.flac')) {
      errors.push({ index, song, artist, error: `Invalid file extension (must be .flac)` });
    }

    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      const urlObj = new URL(normalizedUrl);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\/(Music)\/(.+)$/i);
      
      if (isNewOrModified) {
        if (urlObj.search || urlObj.hash) {
          errors.push({ index, song, artist, error: `URL cannot contain query parameters or fragment hashes` });
        }
        if (match) {
          const filename = match[2];
          const prAuthor = process.env.PR_AUTHOR;
          if (prAuthor) {
            const lowerAuthor = prAuthor.toLowerCase();
            const lowerFilename = filename.toLowerCase();
            if (!lowerFilename.startsWith(lowerAuthor + '-') && !lowerFilename.startsWith(lowerAuthor + '_')) {
              errors.push({ index, song, artist, error: `The referenced filename '${filename}' in the URL must start with your GitHub username to verify ownership.` });
            }
          }
        }
      }

      if (match) {
        const directory = match[1];
        const filename = match[2];
        
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
          errors.push({ index, song, artist, error: `Filename contains invalid path segments.` });
          return;
        }
        
        const localPath = path.join(directory, filename);
        
        if (!fs.existsSync(localPath)) {
          errors.push({ index, song, artist, error: `Referenced file does not exist: '${localPath}'` });
        } else {
          const normalizedPath = localPath.replace(/\\/g, '/');
          const isNewFile = !modifiedFiles || modifiedFiles.map(f => f.replace(/\\/g, '/')).includes(normalizedPath);
          
          if (isNewFile) {
            const stats = fs.statSync(localPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            if (fileSizeMB > MAX_SIZE_MB) {
              errors.push({ 
                index, 
                song, 
                artist, 
                error: `File size of '${localPath}' is ${fileSizeMB.toFixed(2)}MB. Max allowed is ${MAX_SIZE_MB}MB.` 
              });
            }
            if (stats.size === 0) {
              errors.push({ index, song, artist, error: `File '${localPath}' is empty (0 bytes)` });
            }
            
            const ext = filename.split('.').pop().toLowerCase();
            const sigError = verifyFileSignature(localPath, ext);
            if (sigError) {
              errors.push({ index, song, artist, error: sigError });
            }
          }
        }
      } else {
        errors.push({ index, song, artist, error: `URL does not follow repository structure (/Music/)` });
      }
    } catch (err) {
      errors.push({ index, song, artist, error: `Invalid URL format: ${err.message}` });
    }
  });

  if (modifiedFiles) {
    const newFiles = modifiedFiles.filter(file => file.replace(/\\/g, '/').startsWith('Music/'));

    newFiles.forEach(file => {
      const filename = path.basename(file);
      const ext = filename.split('.').pop().toLowerCase();
      if (ext !== 'flac') {
        errors.push({
          index: 'N/A', song: 'N/A', artist: 'N/A',
          error: `File '${file}' has an invalid extension. Only .flac files are allowed.`
        });
      }
    });
  }

  let reportContent = '';
  if (errors.length > 0) {
    console.error('\n--- Validation FAILED! ---');
    reportContent = `### ❌ Validation Failed\n\nFound **${errors.length}** issues:\n\n`;
    reportContent += '| Target / Item Index | Error Description |\n';
    reportContent += '|---|---|\n';
    errors.forEach(err => {
      const identifier = err.index === 'N/A' ? 'System / Naming' : `Index ${err.index} (${err.song} by ${err.artist})`;
      reportContent += `| ${identifier} | ${err.error} |\n`;
      console.error(`- [${identifier}] ${err.error}`);
    });
    
    fs.writeFileSync('validation_report.md', reportContent);
    process.exit(1);
  } else {
    console.log('\n--- Validation PASSED! ---');
    fs.writeFileSync('validation_report.md', `### ✅ Validation Passed!\n\nAll files are valid.\n`);
  }
}

validate();
