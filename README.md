<p align="center">
  <img src="App Logo/echo.png" alt="Echo Music Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">Echo Music Lossless Hub</h1>

The central hub for contributing and streaming high-fidelity lossless `.flac` audio within the **Echo Music** ecosystem.

This repository stores community-contributed FLAC files and uses a high-performance **Scatter-Gather Architecture** to process thousands of song submissions without merge conflicts.

---

## How it Works (Scatter-Gather Architecture)

To ensure this database can scale infinitely without Git merge conflicts, we do **not** allow users to manually edit the master `music.json` file. Instead:

1. **Scatter:** Users submit their song metadata as a tiny, uniquely named `.json` file into the `submissions/` folder (e.g. `submissions/username-1234.json`).
2. **Merge:** Because everyone creates a brand new file, Pull Requests merge instantly with **zero merge conflicts**.
3. **Gather (Compile):** Once merged into `main`, a background GitHub Action automatically scoops up the tiny submission files, appends them to the master `music.json`, and deletes the tiny files to keep the repository clean.

---

## How to Contribute (The Easy Way)

The easiest way to submit a high-fidelity track is through the **[Contribute Portal](https://lossless.echomusic.fun/contribute.html)**. No Git knowledge is required!

1. **Log In:** Authenticate with GitHub to allow the portal to submit on your behalf.
2. **Upload:** Drag and drop your `.flac` file (max 99MB).
3. **Submit:** The portal will automatically handle the scatter-gather process, upload the audio to `Music/`, create your unique submission `.json` file, and open a Pull Request.
4. **Auto-Merge:** A security bot will instantly validate and merge your PR. Your song goes live in seconds!

---

## How to Contribute Manually (Advanced)

If you prefer working with Git directly from your terminal, you must follow the scatter-gather pattern:

### 1. Upload your Audio File
Add your `.flac` file into the `Music/` directory.
- **Filename:** Must be prefixed with your GitHub username.
- **Example:** `Music/octocat-blinding_lights.flac`

### 2. Create your Submission JSON
Do **not** edit `music.json`. Instead, create a new file in the `submissions/` folder named `[your_username]-[timestamp].json`.
Inside this file, provide a JSON array containing your song details:

```json
[
  {
    "song": "Track Title",
    "artist": "Artist Name",
    "url": "https://lossless.echomusic.fun/Music/username-trackname.flac"
  }
]
```

### 3. Commit and Push
Commit your `.flac` and your `.json` file, push to your fork, and submit a Pull Request.

```bash
git add Music/octocat-blinding_lights.flac submissions/octocat-123.json
git commit -m "feat: added lossless track for Song Title"
git push origin main
```

Once you open a Pull Request, our bot will automatically validate it and merge it. The backend compiler will then move your song into the master `music.json`!

---

## Technical Requirements and Validation

We run an automated validation workflow (`auto-merge.yml`) on every Pull Request. For a Pull Request to be automatically merged, it must pass the following checks:

1. **Strict Path Security:**
   * Your Pull Request must **only** add files to the `submissions/` and `Music/` directories. Modifying any core files will result in instant rejection.
2. **Maximum File Size Limit:**
   * Audio files must be **under 99 MB**.
3. **Ownership Prefix:**
   * Audio files must be prefixed with your GitHub username to prevent naming collisions.

---

## Community and Support

Need help or want to join the Echo Music community?

* **Discord Community:** [Join our Discord](https://discord.com/invite/EcfV3AxH5c)
* **Telegram Channel:** [Join our Telegram](https://t.me/EchoMusicApp)
* **Issues:** If you encounter any bugs, please [open a GitHub Issue](https://github.com/EchoMusicApp/Lossless-Database/issues).

---

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
