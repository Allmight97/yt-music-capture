import { join } from "node:path";
import { folderArtist, safeFileName, SongTags } from "./tags";

export type Layout = "captures" | "captures-by-artist" | "artist" | "artist-album" | "custom";

export const LAYOUTS: { value: Layout; title: string }[] = [
  { value: "captures", title: "Capture folder: Artist - Title" },
  { value: "captures-by-artist", title: "Capture folder / Artist" },
  { value: "artist", title: "Library / Artist" },
  { value: "artist-album", title: "Library / Artist / Album" },
  { value: "custom", title: "Choose a folder" },
];

export type Places = {
  library: string;
  captureFolder: string;
  customFolder?: string;
};

export function volumeOf(path: string): string {
  const match = path.match(/^\/Volumes\/[^/]+/);
  return match ? match[0] : "";
}

export function networkShares(mountTable: string): Record<string, string> {
  const shares: Record<string, string> = {};
  for (const line of mountTable.split("\n")) {
    const match = line.match(/^\/\/(.+?) on (\/Volumes\/.+?) \((smbfs|afpfs)\b/);
    if (match) shares[match[2]] = `${match[3] === "smbfs" ? "smb" : "afp"}://${match[1]}`;
  }
  return shares;
}

export function songPath(layout: Layout, tags: SongTags, places: Places): string {
  const artist = safeFileName(folderArtist(tags));
  const title = `${safeFileName(tags.title)}.m4a`;
  const flat = `${safeFileName(`${tags.artist} - ${tags.title}`)}.m4a`;
  const captures = join(places.library, places.captureFolder);
  switch (layout) {
    case "captures":
      return join(captures, flat);
    case "captures-by-artist":
      return join(captures, artist, title);
    case "artist":
      return join(places.library, artist, title);
    case "artist-album":
      return join(places.library, artist, safeFileName(tags.album), title);
    case "custom":
      if (!places.customFolder) throw new Error("Choose a folder first");
      return join(places.customFolder, flat);
  }
}
