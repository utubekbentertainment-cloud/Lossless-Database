<p align="center">
  <img src="App Logo/echo.png" alt="Echo Music Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">Echo Music Lossless Hub</h1>

The central hub for contributing and streaming high-fidelity lossless `.flac` audio within the **Echo Music** ecosystem.

This repository stores community-contributed FLAC files and maintains the `music.json` registry that powers the Lossless library.

---

## How to Contribute via the Portal

The easiest way to submit a high-fidelity track is through the **[Contribute Portal](https://lossless.echomusic.fun/contribute.html)**. No Git knowledge is required — the portal automatically handles forking, branching, and creating Pull Requests on your behalf.

### Step 1 — Log In with GitHub
Click **"Log in with GitHub"** to authenticate. This gives the portal permission to create a Pull Request on your behalf, with your GitHub profile credited as the author.

### Step 2 — Upload Your FLAC File
Drag and drop your lossless `.flac` audio file into the upload zone. 
- Maximum file size: **99 MB**
- Format: `.flac` only.

### Step 3 — Add Metadata
Provide the **Song Title** and **Artist Name** so the track can be indexed properly in the library.

### Step 4 — Submit
Hit **"Submit to GitHub"**. The portal will automatically fork the repo, create a branch, upload your audio, update `music.json`, and open a Pull Request.

---

## How to Add a Track Manually

If you prefer working with Git directly:

### 1. Upload your Audio File
Add your `.flac` file into the `Music/` directory.
- **Filename:** Must be prefixed with your GitHub username (e.g., `username-trackname.flac`).
- **Format:** `.flac`
- **Example:** `Music/octocat-blinding_lights.flac`

### 2. Update `music.json`
Open `music.json` and add a new entry to the `items` array:

```json
{
  "items": [
    {
      "song": "Track Title",
      "artist": "Artist Name",
      "url": "https://lossless.echomusic.fun/Music/username-trackname.flac"
    }
  ]
}
```

### 3. Commit and Push
Commit your changes, push to your fork, and submit a Pull Request.

```bash
git add .
git commit -m "feat: added lossless track for Song Title"
git push origin main
```

Once your PR is accepted and merged, it will deploy automatically to Cloudflare Pages and become available for streaming.

---

## Technical Requirements and Validation

We run an automated validation workflow on every Pull Request to ensure repository integrity and prevent excessive bandwidth usage.

For a Pull Request to be approved and merged, it must pass the following checks:

1. **Security Filters:**
   * The Pull Request must **only** modify `music.json` and files within the `Music/` directory.
   
2. **Maximum File Size Limit:**
   * All newly added files in a Pull Request must be **equal to or less than 99 MB**.

3. **Ownership Prefix:**
   * Newly added audio files must be prefixed with your GitHub username (e.g., `username-filename.flac`). This prevents collisions.

4. **Formatting and Integrity:**
   * **JSON Syntax:** `music.json` must be correctly formatted.
   * **Format:** Only `.flac` files are accepted. The automated CI verifies the internal file signature (`fLaC`) to prevent spoofed extensions.
   * **No Duplicates:** No two entries in `music.json` can map to the exact same song and artist combination.

You can run this validation locally prior to committing:
```bash
node scripts/validate_music.js
```

---

## Community and Support

Need help or want to join the Echo Music community?

* **Discord Community:** [Join our Discord](https://discord.com/invite/EcfV3AxH5c)
* **Telegram Channel:** [Join our Telegram](https://t.me/EchoMusicApp)
* **Issues:** If you encounter any bugs, please [open a GitHub Issue](https://github.com/EchoMusicApp/Lossless/issues).

---

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
