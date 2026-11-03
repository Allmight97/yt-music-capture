# YT Music Capture

Save a YouTube music video as a song file before it disappears. One form in
[TinyCast](https://github.com/abue-ammar/tinycast) turns a video into a tagged `.m4a` with cover art
and files it in your music library. It is a Raycast-format extension; it has not been tested in
Raycast itself yet.

- **No quality loss.** YouTube's best audio stream (AAC) is copied as-is, not re-encoded.
- **Cover art.** The video thumbnail, centred on a blurred square so nothing is cropped.
- **Tags you can edit first.** Artist and title are guessed from the video title ("Artist - Title
  (Official Video)" works); album, year, a comment naming the uploading channel and source URL, the
  video description, and a `SOURCE_URL` tag.
- **Your folder layout.** Save to a capture folder, an artist folder, artist/album, or any folder.
  Pick per song in the form or its ⌘K menu; each channel remembers its last destination.
- **Keeps going in the background.** Close the window; a message says when the song is saved.
- **NAS aware.** Mounts an SMB share when it is not mounted, using the login in your keychain.
- **Optional Apple Music import** through Music's "Automatically Add to Music" folder.

## Requirements

macOS with [yt-dlp](https://github.com/yt-dlp/yt-dlp), ffmpeg, AtomicParsley and Node:

```sh
brew install yt-dlp ffmpeg atomicparsley node
```

## Install

### TinyCast

Settings → Extensions → Install New → **Install from GitHub** → enter:

```
Allmight97/yt-music-capture
```

TinyCast needs Node and a package manager (pnpm, Bun, Yarn or npm) to build it. Then set the NAS
share and music folder in the extension's settings. To update, install it again.

### From source

```sh
npm install
npm run build
```

TinyCast: Settings → Extensions → Install New → Add from folder → the `build` folder.

## Develop

- `npm test` runs the tag and folder-layout tests; `npm run lint` runs Raycast's lint.
- `zsh -f assets/capture.zsh probe <url>` prints what the form will see.
- A failed capture leaves its job file in `~/Library/Caches/yt-music-capture/`; rerun it with
  `zsh -f assets/capture.zsh run <job.json>`.

Design notes for contributors and agents are in [AGENTS.md](AGENTS.md).
