import { test } from "node:test";
import assert from "node:assert/strict";
import manifest from "../package.json";
import { LAYOUTS, networkShares, songPath, volumeOf } from "../src/destination";
import { SongTags } from "../src/tags";

const tags: SongTags = { artist: "AC/DC", albumArtist: "", title: "Thunderstruck", album: "YouTube", year: "1990", comment: "" };
const places = { library: "/Volumes/DATA/media/Music", captureFolder: "!YT Captures" };

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

test("artist folders use the album artist when one is set", () => {
  const remix = { ...tags, artist: "Prince", albumArtist: "DJ Genesis", title: "When Doves Cry" };
  assert.equal(songPath("artist", remix, places), "/Volumes/DATA/media/Music/DJ Genesis/When Doves Cry.m4a");
  assert.equal(songPath("captures", remix, places), "/Volumes/DATA/media/Music/!YT Captures/Prince - When Doves Cry.m4a");
});

test("a path's volume is its /Volumes/<name> prefix, or nothing on the startup disk", () => {
  assert.equal(volumeOf("/Volumes/DATA/media/Music/a.m4a"), "/Volumes/DATA");
  assert.equal(volumeOf("/Users/me/Music/a.m4a"), "");
});

test("network shares are read from the mount table", () => {
  const table = [
    "/dev/disk3s1s1 on / (apfs, sealed, local, read-only, journaled)",
    "//me@nas.local/DATA on /Volumes/DATA (smbfs, nodev, nosuid, mounted by me)",
    "//me@old.local/Media on /Volumes/My Media (afpfs, nodev, nosuid, mounted by me)",
  ].join("\n");
  assert.deepEqual(networkShares(table), {
    "/Volumes/DATA": "smb://me@nas.local/DATA",
    "/Volumes/My Media": "afp://me@old.local/Media",
  });
});
