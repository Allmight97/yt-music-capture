# Music Video Capture

A Raycast-format extension run inside TinyCast. The form collects a YouTube URL, tags, and a save
location. A detached worker then makes a tagged `.m4a` with square cover art and saves it, so the
capture finishes even after the TinyCast window closes.

- `assets/capture.zsh`: the worker. `probe <url> [cookies]` prints video metadata as JSON;
  `run <job.json>` does the capture. It owns every call to yt-dlp, ffmpeg, AtomicParsley, the share
  mount and the copies. Run it straight from a terminal to debug.
- `src/worker.ts`: the extension's only link to the worker: runs `probe`, writes a job file to
  `~/Library/Caches/yt-music-capture/`, and launches `run` detached.
- `src/tags.ts`, `src/destination.ts`: pure tag suggestions and save-path layouts. `npm test`.
- `src/capture-song.tsx`: the form. `src/show-capture-results.ts`: the worker's way back into
  TinyCast.

## Decisions

- **The title is "Music Video Capture"; the `name` stays `yt-music-capture`.** "YT Music" read as
  YouTube Music. TinyCast and Raycast key saved settings and `LocalStorage` (per-channel
  destinations, learned shares) by `name`, so renaming it would wipe them.

- **The capture runs outside TinyCast.** TinyCast stops a command's JavaScript when its window
  closes. `startCapture` launches the worker through `perl` with `fork` + `setsid`, so it is in its
  own session and survives even a kill of TinyCast's process group. On success it deletes its job
  file and log; on failure it keeps both, and `zsh -f assets/capture.zsh run <job.json>` retries it.
- **Results show as a HUD, never a macOS notification.** `osascript display notification`
  posts as Script Editor, and clicking it opened Script Editor and its Open dialog. The worker writes
  a `.result` file beside the job and opens the job's `doneLink` with `open -g`; the
  `show-capture-results` no-view command shows every waiting result and deletes it. `doneLink()` in
  `src/worker.ts` picks the scheme at runtime: `tinycast://` when `environment.supportPath` is inside
  TinyCast's folder, else `raycast://`. TinyCast also answers `raycast://`, but an installed Raycast
  can win that scheme. TinyCast leaves `environment.ownerOrAuthorName` unset, so its link reads
  `extensions/undefined/...`; TinyCast treats the owner as a hint and matches the bare extension name
  (checked 2026-11-02). The link carries no input, so TinyCast does not ask before running it; Raycast
  asks to confirm every deeplink launch. Never add `launchType=background`: TinyCast shows no HUD for a
  background run.
- **The worker starts with `zsh -f`** and appends Homebrew and `~/.local/bin` to `PATH`. Startup files
  must not change which tools it finds, and a GUI app has no shell `PATH`.
- **IPv4 is automatic.** Every yt-dlp call that fails is retried once with `--force-ipv4`. YouTube's
  bot checks and 403s are common over IPv6. A real error fails twice, so its message still surfaces.
- **m4a, no re-encode.** YouTube's best audio is AAC ~128k (format 140), about equal to its Opus
  stream, and Apple Music cannot import Opus. Copying the AAC stream keeps every bit. The only
  transcode is yt-dlp's fallback when a video has no AAC stream. Do not add another.
- **Cover is a 1400×1400 blurred fill.** The full 16:9 thumbnail sits centered on a blurred copy of
  itself. Owner chose this over square crop, which cuts off on-thumbnail text.
- **Tags**: ffmpeg writes title, artist, album artist (blank in the form means the artist), album, year, comment, and the video description (`desc`,
  `ldes`). AtomicParsley adds the source URL as `----:com.apple.iTunes:SOURCE_URL`, which survives
  edits to the comment. Do not use yt-dlp `--parse-metadata`; it splits on `:` and broke URLs.
- **Settings name one folder, the Music Library.** Capture folders sit inside it. There is no share
  URL setting: each time the form opens it reads `/sbin/mount` and remembers every mounted SMB/AFP
  share by volume (`LocalStorage` `shares`), and a job carries the share for its destination's
  volume so the worker can remount it. A share never seen mounted cannot be remounted; the capture
  then fails with "did not mount".
- **Artist folders use the album artist** when set, so a remix can file under the remixer while
  the track artist stays the original.
- **Save location** comes from, in order: the destination last used for that channel (TinyCast
  `LocalStorage`, keyed by channel URL, custom folder included), else the settings default
  (`!YT Captures`). The form's Save To field and its ⌘K menu (every destination is listed) change it per song,
  and each capture updates the channel's memory. The settings dropdown duplicates `LAYOUTS`; a test
  keeps them equal.
- **Never overwrite.** An existing file at the destination fails the capture.
- **Library before Apple Music.** The optional Apple Music step (off by default) copies into Music's
  "Automatically Add to Music" folder, which moves files in.

## Install and checks

Run scripts with Bun or npm (`bun run build` and `npm run build` are equivalent). Add or update
dependencies only with npm: the Raycast Store builds with npm and requires `package-lock.json`, so
it is the only lockfile. `.gitignore` drops `bun.lock`.

`npm run lint` (`ray lint`: manifest, icon, ESLint, Prettier), `npm run build` (writes `build/`) and
`npm test` must pass. Keep `-o build` in the build script: without it `ray build` writes into
`~/.config/raycast/extensions/`. TinyCast's Install from GitHub ignores the script and runs
`ray build -e dist -o <dir>` itself after `<package manager> install --ignore-scripts`.

To try a local change in TinyCast: `npm run build`, then Settings → Extensions → Install New → Add
from folder → `build/`.
