export type VideoInfo = {
  id: string;
  title: string;
  channel: string;
  channelUrl: string;
  uploadDate: string;
  webpageUrl: string;
  description: string;
  artist?: string;
  track?: string;
};

export type SongTags = {
  artist: string;
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

export function suggestTags(info: VideoInfo, album: string, capturedOn: string): SongTags {
  const year = info.uploadDate.slice(0, 4);
  const comment = sourceComment(info, capturedOn);
  if (info.artist && info.track) {
    return { artist: info.artist, title: info.track, album, year, comment };
  }
  const cleaned = cleanTitle(info.title);
  const parts = cleaned.split(SEPARATOR);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim(), album, year, comment };
  }
  return { artist: channelArtist(info.channel), title: cleaned, album, year, comment };
}

export function safeFileName(name: string): string {
  return (
    name
      .replace(/[/:\\]/g, "-")
      .replace(/^\.+/, "")
      .trim() || "Untitled"
  );
}
