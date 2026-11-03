# Music Video Capture Changelog

## [Unreleased]

### Changed

- The comment credits the source concisely: channel and `youtu.be` link, the artwork credit, and a
  mix's tracklist from the video's chapters. Upload and capture dates are gone; Year and Date Added
  already hold them.

### Added

- Art and Tracklist fields in the form, filled from the video and editable before capture.

## [0.1.1] - 2026-11-03

### Changed

- YouTube is asked only what a capture needs: a lookup is three requests, the form waits for typing
  to stop, stops lookups it no longer needs, and never looks up the same video twice.
- The cover is made from the thumbnail as YouTube serves it, one lossy step fewer.

## [0.1.0] - 2026-11-03

First tagged release. Built for TinyCast; Raycast Store submission is tracked in
[#2](https://github.com/Allmight97/yt-music-capture/issues/2).

### Added

- Capture a YouTube music video as an `.m4a`: the AAC stream is copied, never re-encoded.
- Square 1400×1400 cover art: the thumbnail on a blurred fill, nothing cropped.
- Editable tags guessed from the video: artist, album artist, title, year, a source comment, the
  video description, `SOURCE_URL`, and a Grouping tag for one Apple Music smart playlist.
- Smart album: YouTube's own when known, `{year} Mixes` for videos of 20 minutes or more, else none.
- Five destinations (capture folder, capture folder by artist, Library/Artist,
  Library/Artist/Album, any folder), chosen in the form or its ⌘K menu and remembered per channel.
- One Music Library setting; a network share it lives on is remounted automatically.
- Captures run in the background after the window closes and report back as a HUD.
- Automatic IPv4 retry when YouTube refuses a request.
- Optional copy into Apple Music.

