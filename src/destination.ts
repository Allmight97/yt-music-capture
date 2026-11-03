import { join } from "node:path";
import { safeFileName, SongTags } from "./tags";

export type Layout = "captures" | "captures-by-artist" | "artist" | "artist-album" | "custom";

export const LAYOUTS: { value: Layout; title: string }[] = [
  { value: "captures", title: "Capture folder: Artist - Title" },
  { value: "captures-by-artist", title: "Capture folder / Artist" },
  { value: "artist", title: "Music folder / Artist" },
  { value: "artist-album", title: "Music folder / Artist / Album" },
  { value: "custom", title: "Choose a folder" },
];

export type Places = {
  musicRoot: string;
  captureFolder: string;
  customFolder?: string;
};

export function mountPoint(shareUrl: string): string {
  const share = decodeURIComponent(shareUrl.replace(/\/+$/, "").split("/").pop() ?? "");
  return join("/Volumes", share);
}

export function songPath(layout: Layout, tags: SongTags, places: Places): string {
  const artist = safeFileName(tags.artist);
  const title = `${safeFileName(tags.title)}.m4a`;
  const flat = `${safeFileName(`${tags.artist} - ${tags.title}`)}.m4a`;
  const captures = join(places.musicRoot, places.captureFolder);
  switch (layout) {
    case "captures":
      return join(captures, flat);
    case "captures-by-artist":
      return join(captures, artist, title);
    case "artist":
      return join(places.musicRoot, artist, title);
    case "artist-album":
      return join(places.musicRoot, artist, safeFileName(tags.album), title);
    case "custom":
      if (!places.customFolder) throw new Error("Choose a folder first");
      return join(places.customFolder, flat);
  }
}
