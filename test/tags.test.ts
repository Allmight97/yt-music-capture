import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artCreditOf,
  fileComment,
  channelArtist,
  cleanTitle,
  safeFileName,
  suggestAlbum,
  suggestTags,
  timestamp,
  videoIdOf,
  VideoInfo,
} from "../src/tags";

const base: VideoInfo = {
  id: "x",
  title: "",
  channel: "Some Channel",
  channelUrl: "https://www.youtube.com/channel/abc",
  uploadDate: "20091025",
  webpageUrl: "https://www.youtube.com/watch?v=x",
  description: "",
  durationSeconds: 213,
  chapters: [],
};

test("splits 'Artist - Title' and drops video noise", () => {
  const tags = suggestTags(
    { ...base, title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)" },
    "{year} Mixes",
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
  const tags = suggestTags({ ...base, title: "Midnight Drive [Lyric Video]", channel: "Neon Wolf - Topic" }, "{year} Mixes");
  assert.equal(tags.artist, "Neon Wolf");
  assert.equal(tags.title, "Midnight Drive");
});

test("prefers YouTube Music's own artist and track fields", () => {
  const tags = suggestTags({ ...base, title: "whatever", artist: "Real Artist", track: "Real Track" }, "{year} Mixes");
  assert.deepEqual([tags.artist, tags.title], ["Real Artist", "Real Track"]);
});

test("comment is the channel and a short link to the video", () => {
  assert.equal(suggestTags({ ...base, id: "ke2om19aOBw" }, "{year} Mixes").comment, "Some Channel · youtu.be/ke2om19aOBw");
});

test("tracklist comes from the uploader's chapters, and is blank without them", () => {
  const chapters = [
    { startSeconds: 0, title: "Andy Leech - Vanadis" },
    { startSeconds: 197, title: "Sublab - anything for you" },
    { startSeconds: 3480, title: "Fabbro - Pandemic" },
    { startSeconds: 3600, title: "Lera - Корабли (Antent Edit)" },
  ];
  assert.equal(
    suggestTags({ ...base, chapters }, "{year} Mixes").tracklist,
    "0:00 Andy Leech - Vanadis\n3:17 Sublab - anything for you\n58:00 Fabbro - Pandemic\n1:00:00 Lera - Корабли (Antent Edit)",
  );
  assert.equal(suggestTags(base, "{year} Mixes").tracklist, "");
});

test("timestamps drop the hour until a mix passes one", () => {
  assert.deepEqual([timestamp(0), timestamp(59.9), timestamp(3599), timestamp(3725)], ["0:00", "0:59", "59:59", "1:02:05"]);
});

test("art credit takes the named artist and the link on the next line", () => {
  assert.equal(
    artCreditOf("🦌 Tracklist:\n00:00 A - B\n\n🦌  Artwork by Gracile\nhttps://www.pixiv.net/en/users/3434849\n\nContact: x@y.z"),
    "Gracile · pixiv.net/en/users/3434849",
  );
  assert.equal(artCreditOf("Art by: Someone\nThanks for listening"), "Someone");
  assert.equal(artCreditOf("Cover art by Kira"), "Kira");
  assert.equal(artCreditOf("Support the artist by streaming"), "");
  assert.equal(artCreditOf(""), "");
});

test("the file's comment is the source line, the art credit, then the tracklist", () => {
  const tags = { ...suggestTags(base, "{year} Mixes"), comment: "Ch · youtu.be/x" };
  assert.equal(fileComment(tags), "Ch · youtu.be/x");
  assert.equal(fileComment({ ...tags, art: " Gracile " }), "Ch · youtu.be/x\nArt: Gracile");
  assert.equal(fileComment({ ...tags, tracklist: "0:00 A - B" }), "Ch · youtu.be/x\n\n0:00 A - B");
  assert.equal(fileComment({ ...tags, comment: "", art: "", tracklist: "" }), "");
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

test("every YouTube link shape for one video gives the same id, so edits don't look it up again", () => {
  const id = "dQw4w9WgXcQ";
  for (const link of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `https://music.youtube.com/watch?v=${id}&si=abc`,
    `https://youtu.be/${id}?t=10`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `  https://youtube.com/embed/${id}  `,
  ]) {
    assert.equal(videoIdOf(link), id, link);
  }
});

test("text that is not a YouTube video link has no id", () => {
  for (const text of ["", "hello", "https://vimeo.com/123", "https://www.youtube.com/@channel", "https://youtu.be/short"]) {
    assert.equal(videoIdOf(text), undefined, text);
  }
});
