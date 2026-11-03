# YT Music Capture

A Raycast-format extension run inside TinyCast. The form collects a YouTube URL, tags, and a save
location. A detached worker then makes a tagged `.m4a` with square cover art and saves it, so the
capture finishes even after the TinyCast window closes.

- `assets/capture.zsh`: the worker. `probe <url> [cookies]` prints video metadata as JSON;
  `run <job.json>` does the capture. It owns every call to yt-dlp, ffmpeg, AtomicParsley, the NAS
  mount and the copies. Run it straight from a terminal to debug.
- `src/worker.ts`: the extension's only link to the worker: runs `probe`, writes a job file to
  `~/Library/Caches/yt-music-capture/`, and launches `run` detached.
- `src/tags.ts`, `src/destination.ts`: pure tag suggestions and save-path layouts. `npm test`.
- `src/capture-song.tsx`: the form. `src/show-capture-results.ts`: the worker's way back into
  TinyCast.

## Decisions

- **The capture runs outside TinyCast.** TinyCast stops a command's JavaScript when its window
  closes. `startCapture` launches the worker through `perl` with `fork` + `setsid`, so it is in its
  own session and survives even a kill of TinyCast's process group. On success it deletes its job
  file and log; on failure it keeps both, and `zsh -f assets/capture.zsh run <job.json>` retries it.
- **Results show as a TinyCast HUD, never a macOS notification.** `osascript display notification`
  posts as Script Editor, and clicking it opened Script Editor and its Open dialog. The worker writes
  a `.result` file beside the job and opens the `show-capture-results` deeplink with `open -g`;
  that no-view command shows every waiting result and deletes it. The link carries no input, so
  TinyCast does not ask before running it. Never add `launchType=background`: TinyCast shows no HUD
  for a background run.
- **The worker starts with `zsh -f`** and appends Homebrew and `~/.local/bin` to `PATH`. Startup files
  must not change which tools it finds, and a GUI app has no shell `PATH`.
- **IPv4 is automatic.** Every yt-dlp call that fails is retried once with `--force-ipv4`. YouTube's
  bot checks and 403s are common over IPv6. A real error fails twice, so its message still surfaces.
- **m4a, no re-encode.** YouTube's best audio is AAC ~128k (format 140), about equal to its Opus
  stream, and Apple Music cannot import Opus. Copying the AAC stream keeps every bit. The only
  transcode is yt-dlp's fallback when a video has no AAC stream. Do not add another.
- **Cover is a 1400×1400 blurred fill.** The full 16:9 thumbnail sits centered on a blurred copy of
  itself. Owner chose this over square crop, which cuts off on-thumbnail text.
- **Tags**: ffmpeg writes title, artist, album, year, comment, and the video description (`desc`,
  `ldes`). AtomicParsley adds the source URL as `----:com.apple.iTunes:SOURCE_URL`, which survives
  edits to the comment. Do not use yt-dlp `--parse-metadata`; it splits on `:` and broke URLs.
- **Save location** comes from, in order: the destination last used for that channel (TinyCast
  `LocalStorage`, keyed by channel URL, custom folder included), else the settings default
  (`!YT Captures`). The form's Save To field and its ⌘K "Capture to …" actions change it per song,
  and each capture updates the channel's memory. The settings dropdown duplicates `LAYOUTS`; a test
  keeps them equal.
- **Never overwrite.** An existing file at the destination fails the capture.
- **NAS before Apple Music.** The optional Apple Music step (off by default) copies into Music's
  "Automatically Add to Music" folder, which moves files in.

## Install

`npm run build` writes `build/`. In TinyCast: Settings → Extensions → Install New → Add from folder →
`build/`. Re-run both after a change.
