export type VideoInfo = {
  id: string;
  title: string;
  channel: string;
  channelUrl: string;
  uploadDate: string;
  webpageUrl: string;
  description: string;
  durationSeconds: number;
  artist?: string;
  track?: string;
  album?: string;
};

export type SongTags = {
  artist: string;
  albumArtist: string;
  title: string;
  album: string;
  year: string;
  comment: string;
};

const NOISE =
  /\s*[([](?:[^)\]]*\b(?:official|video|audio|lyrics?|visuali[sz]er|remaster(?:ed)?|hd|hq|4k|mv|m\/v|clip)\b[^)\]]*)[)\]]/gi;
const SEPARATOR = /\s+[-–—|]\s+/;

export function cleanTitle(raw: string): string {
  return raw
    .replace(NOISE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function channelArtist(channel: string): string {
  return channel
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*(?:Official)?\s*$/i, "")
    .trim();
}

export function formatUploadDate(yyyymmdd: string): string {
  return /^\d{8}$/.test(yyyymmdd)
    ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    : yyyymmdd;
}

export function sourceComment(info: VideoInfo, capturedOn: string): string {
  return [
    `YouTube: ${info.channel} (${info.channelUrl})`,
    `Uploaded ${formatUploadDate(info.uploadDate)}`,
    `Source ${info.webpageUrl}`,
    `Captured ${capturedOn}`,
  ].join(" · ");
}

export const MIX_MINUTES = 20;

export function suggestAlbum(info: VideoInfo, mixAlbum: string): string {
  if (info.album) return info.album;
  if (info.durationSeconds >= MIX_MINUTES * 60) return mixAlbum.replaceAll("{year}", info.uploadDate.slice(0, 4));
  return "";
}

export function suggestTags(info: VideoInfo, mixAlbum: string, capturedOn: string): SongTags {
  const year = info.uploadDate.slice(0, 4);
  const album = suggestAlbum(info, mixAlbum);
  const comment = sourceComment(info, capturedOn);
  if (info.artist && info.track) {
    return { artist: info.artist, albumArtist: "", title: info.track, album, year, comment };
  }
  const cleaned = cleanTitle(info.title);
  const parts = cleaned.split(SEPARATOR);
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      albumArtist: "",
      title: parts.slice(1).join(" - ").trim(),
      album,
      year,
      comment,
    };
  }
  return { artist: channelArtist(info.channel), albumArtist: "", title: cleaned, album, year, comment };
}

export function safeFileName(name: string): string {
  return (
    name
      .replace(/[/:\\]/g, "-")
      .replace(/^\.+/, "")
      .trim() || "Untitled"
  );
}

export function albumArtistOf(tags: SongTags): string {
  return tags.albumArtist.trim() || tags.artist;
}

const VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

export function videoIdOf(text: string): string | undefined {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return undefined;
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) return undefined;
  const [first, second] = url.pathname.split("/").filter(Boolean);
  const id =
    url.hostname === "youtu.be"
      ? first
      : first === "watch"
        ? url.searchParams.get("v")
        : ["shorts", "live", "embed"].includes(first)
          ? second
          : undefined;
  return id && VIDEO_ID.test(id) ? id : undefined;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
