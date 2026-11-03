import { test } from "node:test";
import assert from "node:assert/strict";
import manifest from "../package.json";
import { LAYOUTS, mountPoint, songPath } from "../src/destination";
import { SongTags } from "../src/tags";

const tags: SongTags = { artist: "AC/DC", title: "Thunderstruck", album: "YouTube", year: "1990", comment: "" };
const places = { musicRoot: "/Volumes/DATA/media/Music", captureFolder: "!YT Captures" };

test("each layout places the song where its label says", () => {
  assert.equal(songPath("captures", tags, places), "/Volumes/DATA/media/Music/!YT Captures/AC-DC - Thunderstruck.m4a");
  assert.equal(songPath("captures-by-artist", tags, places), "/Volumes/DATA/media/Music/!YT Captures/AC-DC/Thunderstruck.m4a");
  assert.equal(songPath("artist", tags, places), "/Volumes/DATA/media/Music/AC-DC/Thunderstruck.m4a");
  assert.equal(songPath("artist-album", tags, places), "/Volumes/DATA/media/Music/AC-DC/YouTube/Thunderstruck.m4a");
  assert.equal(songPath("custom", tags, { ...places, customFolder: "/Users/me/Desktop" }), "/Users/me/Desktop/AC-DC - Thunderstruck.m4a");
});

test("a chosen-folder layout without a folder is refused", () => {
  assert.throws(() => songPath("custom", tags, places), /Choose a folder/);
});

test("the settings dropdown offers exactly the form's layouts", () => {
  const setting = manifest.preferences.find((p) => p.name === "layout");
  assert.deepEqual(setting?.data, LAYOUTS);
});

test("the share's mount point is /Volumes/<share name>", () => {
  assert.equal(mountPoint("smb://nas.local/DATA/"), "/Volumes/DATA");
  assert.equal(mountPoint("smb://nas.local/My%20Share"), "/Volumes/My Share");
});
