document.addEventListener('DOMContentLoaded', () => {
    const TARGET_OWNER = 'EchoMusicApp';
    const TARGET_REPO = 'Lossless';
    const GITHUB_API_URL = 'https://api.github.com';
    const TRACK_JSON_URL = 'https://raw.githubusercontent.com/EchoMusicApp/Lossless/main/music.json';

    let gitHubAccessToken = localStorage.getItem('gh_access_token') || null;
    let gitHubUsername = null;
    let selectedFile = null;
    let fileIsValid = false;
    let trackSourceMode = 'upload'; 
    let selectedExistingUrl = null;
    let allTrackItems = []; 

    const loginSection  = document.getElementById('login-section');
    const formSection   = document.getElementById('form-section');
    const statusSection = document.getElementById('status-section');

    const loginBtn  = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar  = document.getElementById('user-avatar');
    const userNameEl  = document.getElementById('user-name');

    const destDirRadios     = document.querySelectorAll('input[name="dest-dir"]');
    const trackSourceRadios = document.querySelectorAll('input[name="canvas-source"]');

    const uploadPanel    = document.getElementById('upload-panel');
    const fileInput      = document.getElementById('file-input');
    const dropZone       = document.getElementById('drop-zone');
    const fileInfoBanner = document.getElementById('file-info-banner');
    const selectedFileName = document.getElementById('selected-file-name');
    const selectedFileSize = document.getElementById('selected-file-size');
    const removeFileBtn  = document.getElementById('remove-file-btn');
    const validationVideo = document.getElementById('validation-video-element');

    const checkFormat   = document.getElementById('check-format');
    const checkSize     = document.getElementById('check-size');
    const checkDuration = document.getElementById('check-duration');
    const checkAspect   = document.getElementById('check-aspect');

    const existingPanel          = document.getElementById('existing-panel');
    const existingSearch         = document.getElementById('existing-search');
    const existingResults        = document.getElementById('existing-results');
    const existingSelectedBanner = document.getElementById('existing-selected-banner');
    const existingSelectedTitle  = document.getElementById('existing-selected-title');
    const existingSelectedUrlEl  = document.getElementById('existing-selected-url');
    const clearExistingBtn       = document.getElementById('clear-existing-btn');

    const songEntriesList = document.getElementById('song-entries-list');
    const addSongBtn      = document.getElementById('add-song-btn');
    const songCountBadge  = document.getElementById('song-count-badge');

    const submitBtn = document.getElementById('submit-track-btn');

    const statusLoader      = document.getElementById('status-loader');
    const statusSuccessIcon = document.getElementById('status-success-icon');
    const statusErrorIcon   = document.getElementById('status-error-icon');
    const statusTitle       = document.getElementById('status-title');
    const statusMessage     = document.getElementById('status-message');
    const prLinkContainer   = document.getElementById('pr-link-container');
    const prLink            = document.getElementById('pr-link');
    const statusActionBtn   = document.getElementById('status-action-btn');

    const hashParams   = new URLSearchParams(window.location.hash.substring(1));
    const tokenFromHash = hashParams.get('access_token');
    if (tokenFromHash) {
        gitHubAccessToken = tokenFromHash;
        localStorage.setItem('gh_access_token', tokenFromHash);
        history.replaceState(null, null, 'contribute.html');
    }

    if (gitHubAccessToken) {
        initializeContributorPortal();
    } else {
        showLoginView();
    }

    loginBtn.addEventListener('click', () => {
        if (window.location.protocol === 'file:') {
            window.location.href = 'https://lossless.echomusic.fun/api/auth';
        } else {
            window.location.href = '/api/auth';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('gh_access_token');
        gitHubAccessToken = null;
        gitHubUsername    = null;
        showLoginView();
    });

    async function initializeContributorPortal() {
        showLoadingState('Verifying Session', 'Please wait while we establish a secure session with GitHub...');
        try {
            const response = await fetch(`${GITHUB_API_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${gitHubAccessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) throw new Error('OAuth Token expired or invalid.');

            const userData = await response.json();
            gitHubUsername = userData.login;

            userAvatar.src     = userData.avatar_url;
            userNameEl.textContent = userData.login;

            loginSection.style.display  = 'none';
            statusSection.style.display = 'none';
            formSection.style.display   = 'block';

            await loadTrackItems();
            resetUploadForm();
        } catch (error) {
            console.error('Session Init Error:', error);
            localStorage.removeItem('gh_access_token');
            gitHubAccessToken = null;
            showLoginView();
        }
    }

    function showLoginView() {
        formSection.style.display   = 'none';
        statusSection.style.display = 'none';
        loginSection.style.display  = 'block';
    }

    async function loadTrackItems() {
        try {
            const res  = await fetch(TRACK_JSON_URL);
            if (!res.ok) return;
            const data = await res.json();
            if (data.items && Array.isArray(data.items)) {
                const seen = new Set();
                allTrackItems = data.items.filter(item => {
                    if (seen.has(item.url)) return false;
                    seen.add(item.url);
                    return true;
                });
            }
        } catch (e) {
            console.warn('Could not load music.json for search:', e);
        }
    }

    function resetUploadForm() {
        
        trackSourceMode = 'upload';
        uploadPanel.style.display   = 'block';
        existingPanel.style.display = 'none';

        selectedFile  = null;
        fileIsValid   = false;
        fileInfoBanner.style.display = 'none';
        dropZone.style.display       = 'flex';
        fileInput.value              = '';
        resetChecklist();

        selectedExistingUrl = null;
        existingSearch.value = '';
        existingResults.style.display        = 'none';
        existingResults.innerHTML            = '';
        existingSelectedBanner.style.display = 'none';

        

        songEntriesList.innerHTML = '';
        addSongEntry();

        updateSubmitButtonState();
    }

    destDirRadios.forEach(radio => {
        radio.addEventListener('change', () => updateSubmitButtonState());
    });

    trackSourceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            trackSourceMode = radio.value;
            if (trackSourceMode === 'upload') {
                uploadPanel.style.display   = 'block';
                existingPanel.style.display = 'none';
            } else {
                uploadPanel.style.display   = 'none';
                existingPanel.style.display = 'block';
            }
            updateSubmitButtonState();
        });
    });

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault(); e.stopPropagation();
            dropZone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault(); e.stopPropagation();
            dropZone.classList.remove('drag-active');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleSelectedFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) handleSelectedFile(fileInput.files[0]);
    });

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile  = null;
        fileIsValid   = false;
        fileInfoBanner.style.display = 'none';
        dropZone.style.display       = 'flex';
        fileInput.value              = '';
        resetChecklist();
        updateSubmitButtonState();
    });

    function handleSelectedFile(file) {
        selectedFile = file;
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        dropZone.style.display       = 'none';
        fileInfoBanner.style.display = 'flex';
        runFileValidation(file);
    }

    function resetChecklist() {
        [checkFormat, checkSize, checkDuration, checkAspect].forEach(item => {
            item.className = 'validation-item';
            item.querySelector('.check-status').className = 'fas fa-circle-notch fa-spin check-status';
        });
    }

    function setCheckState(element, state, customMsg = '') {
        const icon = element.querySelector('.check-status');
        element.className = 'validation-item';
        if (state === 'success') {
            element.classList.add('valid');
            icon.className = 'fas fa-check-circle check-status';
        } else if (state === 'error') {
            element.classList.add('invalid');
            icon.className = 'fas fa-times-circle check-status';
        } else {
            icon.className = 'fas fa-circle-notch fa-spin check-status';
        }
        if (customMsg) element.querySelector('span').innerHTML = customMsg;
    }

    async function runFileValidation(file) {
        resetChecklist();
        fileIsValid = false;
        updateSubmitButtonState();

        let formatPass = false, sizePass = false, durationPass = false, aspectPass = false;

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'flac') {
            formatPass = true;
            setCheckState(checkFormat, 'success');
        } else {
            setCheckState(checkFormat, 'error', `Invalid file extension — only <code>.flac</code> is accepted`);
        }

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB <= 99.0 && file.size > 0) {
            sizePass = true;
            setCheckState(checkSize, 'success', `File size is ${sizeMB.toFixed(2)} MB (&le; 99 MB limit)`);
        } else {
            setCheckState(checkSize, 'error', `File size is ${sizeMB.toFixed(2)} MB. Must be under <strong>99 MB</strong>`);
        }

        // Validate fLaC signature (first 4 bytes)
        const reader = new FileReader();
        reader.onload = (e) => {
            const arr = (new Uint8Array(e.target.result)).subarray(0, 4);
            let header = "";
            for(let i = 0; i < arr.length; i++) header += String.fromCharCode(arr[i]);
            
            if (header === "fLaC") {
                durationPass = true;
                setCheckState(checkDuration, 'success', `Valid fLaC signature detected`);
            } else {
                setCheckState(checkDuration, 'error', `Invalid fLaC signature detected. Must be a valid FLAC audio file.`);
            }

            aspectPass = true;
            fileIsValid = formatPass && sizePass && durationPass && aspectPass;
            updateSubmitButtonState();
        };
        reader.onerror = () => {
            setCheckState(checkDuration, 'error', 'Failed to read file.');
            fileIsValid = false;
            updateSubmitButtonState();
        };
        reader.readAsArrayBuffer(file.slice(0, 4));
    }

    let searchDebounce = null;
    existingSearch.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(runExistingSearch, 220);
    });

    function runExistingSearch() {
        const q = existingSearch.value.trim().toLowerCase();
        if (!q) {
            existingResults.style.display = 'none';
            existingResults.innerHTML     = '';
            return;
        }
        const matches = allTrackItems.filter(item =>
            item.song.toLowerCase().includes(q)   ||
            item.artist.toLowerCase().includes(q) ||
            item.url.toLowerCase().includes(q)
        ).slice(0, 12);

        if (matches.length === 0) {
            existingResults.innerHTML     = '<p class="existing-no-results">No tracks found matching your query.</p>';
            existingResults.style.display = 'block';
            return;
        }

        existingResults.innerHTML = matches.map((item, idx) => `
            <button type="button" class="existing-result-item" data-url="${escapeAttr(item.url)}" data-label="${escapeAttr(item.song + ' — ' + item.artist)}">
                <span class="existing-result-label">
                    <span class="existing-result-song">${escapeHtml(item.song)}</span>
                    <span class="existing-result-artist">${escapeHtml(item.artist)}</span>
                </span>
                <span class="existing-result-url">${escapeHtml(shortenUrl(item.url))}</span>
            </button>
        `).join('');
        existingResults.style.display = 'block';

        existingResults.querySelectorAll('.existing-result-item').forEach(btn => {
            btn.addEventListener('click', () => {
                selectExistingTrack(btn.dataset.url, btn.dataset.label);
            });
        });
    }

    function selectExistingTrack(url, label) {
        selectedExistingUrl = url;
        existingSelectedTitle.textContent  = label;
        existingSelectedUrlEl.textContent  = shortenUrl(url);
        existingSelectedBanner.style.display = 'flex';
        existingResults.style.display = 'none';
        existingSearch.value          = '';
        updateSubmitButtonState();
    }

    clearExistingBtn.addEventListener('click', () => {
        selectedExistingUrl = null;
        existingSelectedBanner.style.display = 'none';
        existingSearch.value = '';
        updateSubmitButtonState();
    });

    function shortenUrl(url) {
        try {
            const u = new URL(url);
            return u.hostname + u.pathname;
        } catch {
            return url;
        }
    }

    let songEntryIdCounter = 0;

    function addSongEntry(songVal = '', artistVal = '') {
        const id = ++songEntryIdCounter;
        const row = document.createElement('div');
        row.className   = 'song-entry-row';
        row.dataset.id  = id;
        row.innerHTML = `
            <div class="song-entry-content" style="flex: 1; display: flex; flex-direction: column;">
                <div class="song-entry-search" style="margin-bottom: 0.75rem;">
                    <div class="existing-search-box">
                        <i class="fas fa-search existing-search-icon"></i>
                        <input type="text" class="song-api-search" placeholder="Search YT Music for song..." autocomplete="off">
                        <i class="fas fa-circle-notch fa-spin search-loader" style="display: none; position: absolute; right: 1rem; color: var(--text-dim);"></i>
                    </div>
                    <div class="api-search-results existing-results-list" style="display: none; max-height: 250px; overflow-y: auto; margin-top: 0.5rem; position: absolute; z-index: 10; width: calc(100% - 3.5rem); box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></div>
                </div>
                <div class="song-entry-fields">
                    <input type="text"
                           class="song-entry-song"
                           placeholder="Song title (e.g. Lost in Yesterday)"
                           autocomplete="off"
                           maxlength="120"
                           value="${escapeAttr(songVal)}">
                    <input type="text"
                           class="song-entry-artist"
                           placeholder="Artist name (e.g. Tame Impala)"
                           autocomplete="off"
                           maxlength="120"
                           value="${escapeAttr(artistVal)}">
                </div>
            </div>
            <button type="button" class="btn-remove-song-entry" title="Remove this entry">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        row.querySelector('.btn-remove-song-entry').addEventListener('click', () => {
            row.remove();
            updateSongCountBadge();
            updateSubmitButtonState();
        });

        row.querySelectorAll('input[type="text"]').forEach(inp => {
            inp.addEventListener('input', () => {
                updateSubmitButtonState();
            });
        });

        const searchInput = row.querySelector('.song-api-search');
        const resultsContainer = row.querySelector('.api-search-results');
        const loaderIcon = row.querySelector('.search-loader');
        const songInput = row.querySelector('.song-entry-song');
        const artistInput = row.querySelector('.song-entry-artist');
        let searchTimeout = null;

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();
            if (!query) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
                loaderIcon.style.display = 'none';
                return;
            }

            loaderIcon.style.display = 'block';
            searchTimeout = setTimeout(async () => {
                try {
                    let apiUrl = `/api/search?q=${encodeURIComponent(query)}`;
                    if (window.location.protocol === 'file:') {
                        apiUrl = `https://lossless.echomusic.fun/api/search?q=${encodeURIComponent(query)}`;
                    }
                    
                    const res = await fetch(apiUrl);
                    if (!res.ok) throw new Error('Network response was not ok');
                    const data = await res.json();
                    
                    loaderIcon.style.display = 'none';
                    const items = data.results || [];
                    
                    if (items.length === 0) {
                        resultsContainer.innerHTML = '<p class="existing-no-results">No songs found.</p>';
                        resultsContainer.style.display = 'block';
                        return;
                    }

                    resultsContainer.innerHTML = items.map((item, idx) => {
                        const songName = item.title || '';
                        const artistName = item.artist || 'Unknown Artist';
                        const thumbnail = item.thumbnail || '';
                        
                        return `
                            <button type="button" class="existing-result-item" data-song="${escapeAttr(songName)}" data-artist="${escapeAttr(artistName)}">
                                ${thumbnail ? `<img src="${escapeAttr(thumbnail)}" alt="cover" style="width: 40px; height: 40px; border-radius: 4px; margin-right: 1rem; object-fit: cover;">` : ''}
                                <span class="existing-result-label" style="text-align: left;">
                                    <span class="existing-result-song">${escapeHtml(songName)}</span>
                                    <span class="existing-result-artist">${escapeHtml(artistName)}</span>
                                </span>
                            </button>
                        `;
                    }).join('');
                    resultsContainer.style.display = 'block';

                    resultsContainer.querySelectorAll('.existing-result-item').forEach(btn => {
                        btn.addEventListener('click', () => {
                            songInput.value = btn.dataset.song;
                            artistInput.value = btn.dataset.artist;
                            
                            searchInput.value = '';
                            resultsContainer.style.display = 'none';
                            resultsContainer.innerHTML = '';
                            
                            songInput.style.borderColor = 'var(--accent-primary)';
                            artistInput.style.borderColor = 'var(--accent-primary)';
                            setTimeout(() => {
                                songInput.style.borderColor = '';
                                artistInput.style.borderColor = '';
                            }, 800);
                            
                            updateSubmitButtonState();
                        });
                    });

                } catch (error) {
                    console.error('Error fetching YT Music data:', error);
                    loaderIcon.style.display = 'none';
                    resultsContainer.innerHTML = '<p class="existing-no-results" style="color: #ef4444;">Failed to fetch results. Please try again or enter manually.</p>';
                    resultsContainer.style.display = 'block';
                }
            }, 500);
        });

        document.addEventListener('click', (e) => {
            if (!row.contains(e.target)) {
                resultsContainer.style.display = 'none';
            }
        });

        songEntriesList.appendChild(row);
        updateSongCountBadge();
        updateSubmitButtonState();
    }

    addSongBtn.addEventListener('click', () => addSongEntry());

    function getSongEntries() {
        const rows = songEntriesList.querySelectorAll('.song-entry-row');
        return Array.from(rows).map(row => ({
            song:   row.querySelector('.song-entry-song').value.trim(),
            artist: row.querySelector('.song-entry-artist').value.trim()
        }));
    }

    function updateSongCountBadge() {
        const count = songEntriesList.querySelectorAll('.song-entry-row').length;
        songCountBadge.textContent = count === 1 ? '1 song' : `${count} songs`;
    }

    function updateSubmitButtonState() {
        const entries    = getSongEntries();
        const validEntries = entries.filter(e =>
            e.song.length > 0 && e.artist.length > 0 &&
            !/[<>]/.test(e.song) && !/[<>]/.test(e.artist)
        );
        const hasSongs = validEntries.length > 0 && validEntries.length === entries.length;

        let trackReady = false;
        if (trackSourceMode === 'upload') {
            trackReady = !!(selectedFile && fileIsValid);
        } else {
            trackReady = !!selectedExistingUrl;
        }

        submitBtn.disabled = !(hasSongs && trackReady);
    }

    submitBtn.addEventListener('click', async () => {
        if (submitBtn.disabled) return;

        const entries  = getSongEntries();
        const destDir = "Music";

        for (const entry of entries) {
            if (/[<>]/g.test(entry.song) || /[<>]/g.test(entry.artist)) {
                alert('HTML tags are not allowed in song or artist fields.');
                return;
            }
        }

        showLoadingView();

        try {
            if (trackSourceMode === 'upload') {
                await submitWithNewUpload(entries, destDir);
            } else {
                await submitWithExistingTrack(entries, destDir);
            }
        } catch (error) {
            console.error('Submission error:', error);
            showErrorState(error.message || 'An unknown network error occurred during submission.');
        }
    });

    async function submitWithNewUpload(entries, destDir) {
        const primaryEntry = entries[0]; 
        const sanitizedOriginalName = selectedFile.name.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
        const cleanName    = sanitizedOriginalName.split('.')[0];
        const newFilename  = `${gitHubUsername.toLowerCase()}-${sanitizedOriginalName}`;
        const targetPath   = `Music/${newFilename}`;
        const trackUrl    = `https://lossless.echomusic.fun/${targetPath}`;
        const branchName   = `lossless-${gitHubUsername.toLowerCase()}-${cleanName}`;

        const forkOwner = await forkAndSync(branchName, primaryEntry.song);

        updateLoadingMessage('Uploading Track', `Uploading audio: ${newFilename}…`);
        const base64Audio = await readFileAsBase64(selectedFile);

        const uploadRes = await fetch(`${GITHUB_API_URL}/repos/${forkOwner}/${TARGET_REPO}/contents/${targetPath}`, {
            method: 'PUT',
            headers: buildHeaders(),
            body: JSON.stringify({
                message: `feat: upload lossless track for ${primaryEntry.song}`,
                content: base64Audio,
                branch: branchName
            })
        });
        if (!uploadRes.ok) throw new Error('Failed to upload the lossless file to your fork.');

        await updateTrackJson(forkOwner, branchName, entries, trackUrl);
        const prUrl = await openPullRequest(forkOwner, branchName, entries, destDir, targetPath);
        showSuccessState(prUrl);
    }

    async function submitWithExistingTrack(entries, destDir) {
        const primaryEntry = entries[0];
        const slug        = primaryEntry.song.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
        const branchName  = `lossless-${gitHubUsername.toLowerCase()}-${slug}-link`;

        const forkOwner = await forkAndSync(branchName, primaryEntry.song);

        await updateTrackJson(forkOwner, branchName, entries, selectedExistingUrl);
        const prUrl = await openPullRequest(forkOwner, branchName, entries, destDir, selectedExistingUrl);
        showSuccessState(prUrl);
    }

    async function forkAndSync(branchName, songLabel) {
        updateLoadingMessage('Configuring Repository', `Forking ${TARGET_OWNER}/${TARGET_REPO} to your profile…`);

        const forkRes = await fetch(`${GITHUB_API_URL}/repos/${TARGET_OWNER}/${TARGET_REPO}/forks`, {
            method: 'POST',
            headers: buildHeaders()
        });
        if (!forkRes.ok) throw new Error('Could not fork the upstream repository to your GitHub profile.');

        const forkData  = await forkRes.json();
        const forkOwner = forkData.owner.login;

        await sleep(3000);

        updateLoadingMessage('Syncing Branches', 'Ensuring your fork is up-to-date with upstream main…');
        const syncRes = await fetch(`${GITHUB_API_URL}/repos/${forkOwner}/${TARGET_REPO}/merge-upstream`, {
            method: 'POST',
            headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch: 'main' })
        });
        if (!syncRes.ok && syncRes.status !== 409 && syncRes.status !== 422) {
            console.warn('Warning syncing fork:', await syncRes.text());
        }

        updateLoadingMessage('Creating Work Branch', 'Creating a separate branch for your track…');
        const refRes = await fetch(`${GITHUB_API_URL}/repos/${forkOwner}/${TARGET_REPO}/git/ref/heads/main`, {
            headers: buildHeaders()
        });
        if (!refRes.ok) throw new Error('Failed to get the latest commit SHA of main.');

        const refData  = await refRes.json();
        const mainSha  = refData.object.sha;

        const branchRes = await fetch(`${GITHUB_API_URL}/repos/${forkOwner}/${TARGET_REPO}/git/refs`, {
            method: 'POST',
            headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: mainSha })
        });
        if (!branchRes.ok) {
            const txt = await branchRes.text();
            if (!txt.includes('already exists')) throw new Error('Failed to create branch: ' + txt);
        }

        return forkOwner;
    }

    async function updateTrackJson(forkOwner, branchName, entries, trackAudioUrl) {
        updateLoadingMessage('Updating Database', `Adding ${entries.length} song entr${entries.length === 1 ? 'y' : 'ies'} to music.json…`);

        const trackApiUrl = `${GITHUB_API_URL}/repos/${forkOwner}/${TARGET_REPO}/contents/music.json?ref=${branchName}`;
        const trackRes = await fetch(trackApiUrl, { headers: buildHeaders() });
        if (!trackRes.ok) throw new Error('Failed to download music.json from your fork.');

        const trackData    = await trackRes.json();
        const trackSha     = trackData.sha;
        const trackContent = decodeBase64Utf8(trackData.content);
        const trackObj     = JSON.parse(trackContent);

        if (!trackObj.items || !Array.isArray(trackObj.items)) {
            throw new Error('music.json items database is missing or corrupt.');
        }

        const newEntries = entries.map(entry => ({
            song:   entry.song,
            artist: entry.artist,
            url:    trackAudioUrl
        }));
        trackObj.items.unshift(...newEntries);

        const updatedContent = encodeBase64Utf8(JSON.stringify(trackObj, null, 2) + '\n');

        const updateRes = await fetch(`${GITHUB_API_URL}/repos/${forkOwner}/${TARGET_REPO}/contents/music.json`, {
            method: 'PUT',
            headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `feat: update music.json — add ${entries.length} song(s)`,
                content: updatedContent,
                sha:     trackSha,
                branch:  branchName
            })
        });
        if (!updateRes.ok) throw new Error('Failed to write updated music.json to your fork.');
    }

    async function openPullRequest(forkOwner, branchName, entries, destDir, trackPath) {
        updateLoadingMessage('Submitting Contribution', 'Opening Pull Request on the upstream repository…');

        const isSingle = entries.length === 1;
        const prTitle  = isSingle
            ? `feat: add lossless track for ${entries[0].song} — ${entries[0].artist}`
            : `feat: add ${entries.length} songs to lossless — ${entries.map(e => e.song).slice(0, 3).join(', ')}${entries.length > 3 ? '…' : ''}`;

        const songTable = entries.map(e =>
            `| ${e.song} | ${e.artist} |`
        ).join('\n');

        const prBody = `This Pull Request was submitted automatically via the Echo Music Lossless portal.\n\n### 🎵 Submission Metadata\n* **Category:** ${destDir}\n* **Track URL / Path:** \`${trackPath}\`\n* **Total Songs Linked:** ${entries.length}\n\n### 🎶 Song Entries\n| Song Title | Artist |\n|---|---|\n${songTable}\n\n*Validation checks will run automatically on this contribution.*`;

        const prRes = await fetch(`${GITHUB_API_URL}/repos/${TARGET_OWNER}/${TARGET_REPO}/pulls`, {
            method: 'POST',
            headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: prTitle,
                head:  `${forkOwner}:${branchName}`,
                base:  'main',
                body:  prBody
            })
        });
        if (!prRes.ok) {
            const errData = await prRes.json();
            throw new Error(errData.message || 'Failed to submit the Pull Request upstream.');
        }

        const prData = await prRes.json();
        return prData.html_url;
    }

    function showLoadingState(title, message) {
        formSection.style.display   = 'none';
        loginSection.style.display  = 'none';
        statusSection.style.display = 'block';
        statusLoader.style.display  = 'block';
        statusSuccessIcon.style.display = 'none';
        statusErrorIcon.style.display   = 'none';
        prLinkContainer.style.display   = 'none';
        statusActionBtn.style.display   = 'none';
        statusTitle.textContent   = title;
        statusMessage.textContent = message;
    }

    function showLoadingView() {
        showLoadingState('Submitting Track…', 'Initializing your contribution. Do not close this browser window.');
    }

    function updateLoadingMessage(title, message) {
        statusTitle.textContent   = title;
        statusMessage.textContent = message;
    }

    function showSuccessState(prUrl) {
        statusLoader.style.display      = 'none';
        statusSuccessIcon.style.display = 'block';
        statusTitle.textContent = 'Submission Sent!';
        statusMessage.innerHTML = 'Thank you for your lossless track submission! We have automatically created a Pull Request.<br><br>The continuous integration validation checks will run. Once they pass, a maintainer will review and manually merge your contribution into the live repository.';
        prLink.href = prUrl;
        prLinkContainer.style.display = 'block';
        statusActionBtn.textContent = 'Submit Another';
        statusActionBtn.style.display = 'inline-flex';
        statusActionBtn.onclick = () => {
            resetUploadForm();
            statusSection.style.display = 'none';
            formSection.style.display   = 'block';
        };
    }

    function showErrorState(errorMsg) {
        statusLoader.style.display    = 'none';
        statusErrorIcon.style.display = 'block';
        statusTitle.textContent = 'Submission Failed';
        statusMessage.textContent = errorMsg;
        statusActionBtn.textContent = 'Modify & Retry';
        statusActionBtn.style.display = 'inline-flex';
        statusActionBtn.onclick = () => {
            statusSection.style.display = 'none';
            formSection.style.display   = 'block';
        };
    }

    function buildHeaders() {
        return {
            'Authorization': `Bearer ${gitHubAccessToken}`,
            'Accept': 'application/vnd.github.v3+json'
        };
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload  = () => resolve(reader.result.split(',')[1]);
            reader.onerror = err => reject(err);
        });
    }

    function decodeBase64Utf8(base64Str) {
        const binString = atob(base64Str.replace(/\s/g, ''));
        return new TextDecoder().decode(Uint8Array.from(binString, m => m.charCodeAt(0)));
    }

    function encodeBase64Utf8(str) {
        const binString = Array.from(new TextEncoder().encode(str), byte => String.fromCharCode(byte)).join('');
        return btoa(binString);
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
});
