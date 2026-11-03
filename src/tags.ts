export type VideoInfo = {
  id: string;
  title: string;
  channel: string;
  channelUrl: string;
  uploadDate: string;
  webpageUrl: string;
  description: string;
  durationSeconds: number;
  chapters: Chapter[];
  artist?: string;
  track?: string;
  album?: string;
};

export type Chapter = { startSeconds: number; title: string };

export type SongTags = {
  artist: string;
  albumArtist: string;
  title: string;
  album: string;
  year: string;
  comment: string;
  art: string;
  tracklist: string;
};

export type ProbeJson = {
  id: string;
  title?: string;
  channel?: string;
  channel_url?: string;
  upload_date?: string;
  webpage_url?: string;
  description?: string;
  duration?: number;
  chapters?: { start_time: number; title: string }[];
  artist?: string;
  track?: string;
  album?: string;
};

export function videoInfoOf(json: ProbeJson, url: string): VideoInfo {
  return {
    id: json.id,
    title: json.title ?? "",
    channel: json.channel ?? "",
    channelUrl: json.channel_url ?? "",
    uploadDate: json.upload_date ?? "",
    webpageUrl: json.webpage_url ?? url,
    description: json.description ?? "",
    durationSeconds: json.duration ?? 0,
    chapters: (json.chapters ?? []).map((chapter) => ({ startSeconds: chapter.start_time, title: chapter.title })),
    artist: json.artist ?? undefined,
    track: json.track ?? undefined,
    album: json.album ?? undefined,
  };
}

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

export function shortLink(id: string): string {
  return `youtu.be/${id}`;
}

export function timestamp(seconds: number): string {
  const s = Math.floor(seconds);
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function tracklistOf(chapters: Chapter[]): string {
  return chapters.map((chapter) => `${timestamp(chapter.startSeconds)} ${chapter.title}`).join("\n");
}

const ART_CREDIT = /^\W*(?:art(?:work)?|illustration|cover(?: art)?|drawing|picture|image)\s+by\s*:?\s*(.+?)\s*$/i;

export function artCreditOf(description: string): string {
  const lines = description.split("\n").map((line) => line.trim());
  const at = lines.findIndex((line) => ART_CREDIT.test(line));
  if (at < 0) return "";
  const name = lines[at].match(ART_CREDIT)![1];
  const link = lines[at + 1]?.match(/^https?:\/\/(?:www\.)?(\S+)$/)?.[1];
  return link ? `${name} · ${link}` : name;
}

export function fileComment(tags: SongTags): string {
  const art = tags.art.trim();
  const head = [tags.comment.trim(), art && `Art: ${art}`].filter(Boolean).join("\n");
  return [head, tags.tracklist.trim()].filter(Boolean).join("\n\n");
}

export const MIX_MINUTES = 20;

export function suggestAlbum(info: VideoInfo, mixAlbum: string): string {
  if (info.album) return info.album;
  if (info.durationSeconds >= MIX_MINUTES * 60) return mixAlbum.replaceAll("{year}", info.uploadDate.slice(0, 4));
  return "";
}

export function suggestTags(info: VideoInfo, mixAlbum: string): SongTags {
  const shared = {
    albumArtist: "",
    album: suggestAlbum(info, mixAlbum),
    year: info.uploadDate.slice(0, 4),
    comment: `${info.channel} · ${shortLink(info.id)}`,
    art: artCreditOf(info.description),
    tracklist: tracklistOf(info.chapters),
  };
  if (info.artist && info.track) return { ...shared, artist: info.artist, title: info.track };
  const cleaned = cleanTitle(info.title);
  const parts = cleaned.split(SEPARATOR);
  if (parts.length >= 2) {
    return { ...shared, artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { ...shared, artist: channelArtist(info.channel), title: cleaned };
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
