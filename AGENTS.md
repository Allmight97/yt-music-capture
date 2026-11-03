# Music Video Capture

A Raycast-format extension, used in TinyCast. The form collects a YouTube URL, tags and a save
location; a detached worker makes a tagged `.m4a` with square cover art and files it, so a capture
finishes after the window closes. Raycast Store submission is open work in issue #2.

## Map

- `assets/capture.zsh`: the worker. `probe <url> [cookies]` prints the form's metadata as JSON and
  saves yt-dlp's full lookup; `run <job.json>` does the capture; `retag <file> <comment>
  <tracklist> <url>` rewrites a song's comment and Lyrics. Both use `credit`. It owns every call
  to yt-dlp, ffmpeg, AtomicParsley, the share mount and the library copy. Run it from a terminal
  to debug.
- `src/worker.ts`: the extension's only link to the worker: `probe`, the job file in
  `~/Library/Caches/yt-music-capture/`, the detached launch, and the done link.
- `src/tags.ts`, `src/destination.ts`: pure rules for tags, album, video ids and save paths. Tested.
- `scripts/retag.ts`: brings songs captured by older versions up to the current comment and Lyrics.
  `plan <folder> <plan.json>` looks each `SOURCE_URL` up once and prints each song's current and
  new values, so hand edits are seen before `apply <plan.json>` writes them. Same rules as a capture: `tags.ts` and the worker's `credit`.
- `src/capture-song.tsx`: the form. `src/show-capture-results.ts`: shows finished captures.

## Rules and why

**Identity**
- Keep `name` as `yt-music-capture`; the title is free to change. TinyCast and Raycast key saved
  settings and `LocalStorage` (channel destinations, learned shares) by `name`.

**Lifecycle**
- The capture runs outside TinyCast, which stops a command's JavaScript when its window closes.
  `startCapture` launches the worker through `perl` `fork` + `setsid`, so it survives a kill of
  TinyCast's process group.
- Success deletes the job file and log; failure keeps both for `zsh -f assets/capture.zsh run
  <job.json>`.
- Results come back as a HUD, never `osascript display notification`: that posts as Script Editor,
  and clicking it opens Script Editor. The worker writes a `.result` beside the job and opens the
  job's `doneLink`; `show-capture-results` shows and deletes every waiting result.
- `doneLink()` picks `tinycast://` inside TinyCast, else `raycast://` (Raycast can win the shared
  scheme). TinyCast leaves the owner `undefined` and matches the bare name. Never add
  `launchType=background`: TinyCast shows no HUD for a background run. Raycast asks to confirm every
  deeplink, which issue #2 must resolve.
- The worker starts with `zsh -f` and appends Homebrew and `~/.local/bin` to `PATH`: startup files
  must not change which tools it finds, and a GUI app has no shell `PATH`.
- `ytdlp()` runs yt-dlp in the background and `wait`s. zsh defers a trap until a foreground child
  exits, so a stopped lookup would otherwise keep running.

**YouTube traffic: only essential requests**
- The form looks up 500 ms after typing stops, stops a lookup it no longer needs, skips the lookup
  when an edited link names the same video (`videoIdOf`), and probes the clean `watch?v=<id>` link.
- `run` downloads from the lookup `probe` saved (`--load-info-json`), so YouTube is asked once per
  capture. Its signed URLs expire: a missing or failed file falls back to a fresh download. `run`
  deletes the file; `probe` deletes any older than 6 hours.
- yt-dlp skips the HLS manifest (`youtube:skip=hls`). Don't force a player client; yt-dlp's default
  tracks YouTube.
- A failed yt-dlp call is retried once with `--force-ipv4`; YouTube's bot checks and 403s are common
  over IPv6.

**Audio, cover, tags**
- Copy the AAC stream (format 140) into `.m4a`; never add a transcode. Apple Music cannot import
  Opus, and the AAC is YouTube's best audio. yt-dlp's own fallback transcode for videos without
  AAC is the only exception.
- Cover: 1400×1400, the whole thumbnail centred on a blurred copy (owner's choice; a square crop
  cuts off on-thumbnail text). The thumbnail goes to ffmpeg as served, to avoid an extra lossy step.
- ffmpeg writes the tags, including Grouping (`©grp`) and the description (`desc`, `ldes`);
  AtomicParsley adds only `----:com.apple.iTunes:SOURCE_URL`, which ffmpeg cannot write. Keep text
  tags out of AtomicParsley: it cuts them at 255 characters, and a tracklist comment is longer.
  Never use yt-dlp `--parse-metadata`: it splits on `:` and breaks URLs.
- Comment (`fileComment`): channel and `youtu.be` link, the art credit, then the tracklist from
  yt-dlp's `chapters`. It credits the uploader and the artists in a mix. Never derive a tracklist
  from description text: no chapters means no tracklist (owner's choice). The tracklist also goes
  to Lyrics (`©lyr`): the iPhone shows no comments, and its Lyrics button is the place to read it.
  The owner's device test (2026-11-03) shows Lyrics for these songs on Mac and iPhone, although
  Apple's support page says the button is grayed out for non-catalog songs. Don't add chapter
  markers: Apple Music drops them and users report iPhone playback problems with them.
- Album, in order (`suggestAlbum`): YouTube's own, else the Mix Album template for videos of
  `MIX_MINUTES` or more (`{year}` = upload year), else blank. The owner files long mixes as
  "YYYY Mixes" and singles with no album.
- `albumArtistOf` (album artist, else artist) names artist folders and the album-artist tag, so a
  remix can file under the remixer.

**Where files go**
- One Music Library setting. `songPath` expands `~`, which TinyCast passes through literally.
- No share setting: the form reads `/sbin/mount` and remembers each mounted SMB/AFP share by volume,
  and the job carries the share so the worker can remount it. A share never seen mounted fails
  with "did not mount".
- Destination: the channel's last one, else the settings default. The form and its ⌘K menu change
  it per song. `LAYOUTS` and the settings dropdown must match; a test enforces it.
- Never overwrite: an existing destination fails the capture.
- The library is the source of truth; the owner adds songs to Apple Music by hand. There is no
  Apple Music copy: it went unused and was the main source of half-finished captures.

**Security**
- Values reach tools as separate arguments, the URL after `--`, and the share URL reaches
  AppleScript through `argv`. Never splice untrusted text into a command or script.

## Checks, dependencies, releases

- `npm run check` is the one gate, locally and in CI (`.github/workflows/check.yml`, macOS for zsh,
  `perl` and `plutil`): `ray lint`, `tsc --noEmit`, `zsh -n` on the worker, `npm test`, build.
- Lint stays ESLint and Prettier through `ray lint`, because the Raycast Store runs it on every
  submission. Keep `-o build` in the build script; without it `ray build` installs into Raycast.
- Run scripts with Bun or npm. Change dependencies only with npm: the store builds with npm and
  requires `package-lock.json`, so `.gitignore` drops `bun.lock`.
- Release only when the owner asks. Add a dated `## [x.y.z] - YYYY-MM-DD` section to
  `CHANGELOG.md` (`### Added`, `### Changed`, `### Fixed`), tag the commit CI passed on, and use
  that section as the GitHub release notes. The store's `## [Title] - {PR_MERGE_DATE}` heading goes
  in only with the store PR.
- Try a change in TinyCast: `npm run build`, then Settings → Extensions → Install New → Add from
  folder → `build/`. Users update by reinstalling from GitHub; TinyCast never checks GitHub
  installs (proposed upstream in abue-ammar/tinycast#1778).
