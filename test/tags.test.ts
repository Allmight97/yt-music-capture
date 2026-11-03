import { test } from "node:test";
import assert from "node:assert/strict";
import { channelArtist, cleanTitle, safeFileName, suggestAlbum, suggestTags, VideoInfo } from "../src/tags";

const base: VideoInfo = {
  id: "x",
  title: "",
  channel: "Some Channel",
  channelUrl: "https://www.youtube.com/channel/abc",
  uploadDate: "20091025",
  webpageUrl: "https://www.youtube.com/watch?v=x",
  description: "",
  durationSeconds: 213,
};

test("splits 'Artist - Title' and drops video noise", () => {
  const tags = suggestTags(
    { ...base, title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)" },
    "{year} Mixes",
    "2026-11-02",
  );
  assert.equal(tags.artist, "Rick Astley");
  assert.equal(tags.title, "Never Gonna Give You Up");
  assert.equal(tags.year, "2009");
  assert.equal(tags.album, "");
});

test("keeps meaningful brackets such as features and remixes", () => {
  assert.equal(cleanTitle("A - B (feat. C) [Official Music Video]"), "A - B (feat. C)");
  assert.equal(cleanTitle("A - B (Extended Mix)"), "A - B (Extended Mix)");
});

test("falls back to the channel as artist when the title has no separator", () => {
  const tags = suggestTags({ ...base, title: "Midnight Drive [Lyric Video]", channel: "Neon Wolf - Topic" }, "{year} Mixes", "2026-11-02");
  assert.equal(tags.artist, "Neon Wolf");
  assert.equal(tags.title, "Midnight Drive");
});

test("prefers YouTube Music's own artist and track fields", () => {
  const tags = suggestTags({ ...base, title: "whatever", artist: "Real Artist", track: "Real Track" }, "{year} Mixes", "2026-11-02");
  assert.deepEqual([tags.artist, tags.title], ["Real Artist", "Real Track"]);
});

test("comment names the uploading channel, upload date, source and capture date", () => {
  const tags = suggestTags({ ...base, title: "A - B" }, "{year} Mixes", "2026-11-02");
  assert.equal(
    tags.comment,
    "YouTube: Some Channel (https://www.youtube.com/channel/abc) · Uploaded 2009-10-25 · Source https://www.youtube.com/watch?v=x · Captured 2026-11-02",
  );
});

test("strips VEVO and Official from channel names", () => {
  assert.equal(channelArtist("RickAstleyVEVO"), "RickAstley");
  assert.equal(channelArtist("Muse Official"), "Muse");
});

test("file names never contain path separators", () => {
  assert.equal(safeFileName("AC/DC: Live"), "AC-DC- Live");
});

test("album: YouTube's own album first, then the mix template for long videos, else none", () => {
  assert.equal(suggestAlbum({ ...base, album: "Random Access Memories", durationSeconds: 3700 }, "{year} Mixes"), "Random Access Memories");
  assert.equal(suggestAlbum({ ...base, uploadDate: "20200314", durationSeconds: 20 * 60 }, "{year} Mixes"), "2020 Mixes");
  assert.equal(suggestAlbum({ ...base, durationSeconds: 20 * 60 - 1 }, "{year} Mixes"), "");
});
