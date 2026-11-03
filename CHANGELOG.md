# Music Video Capture Changelog

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

