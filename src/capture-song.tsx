import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  getSelectedText,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { Layout, LAYOUTS, mountPoint, songPath } from "./destination";
import { SongTags, suggestTags, VideoInfo } from "./tags";
import { probe, startCapture } from "./worker";

type Preferences = {
  nasShareUrl: string;
  nasMusicFolder: string;
  captureFolder: string;
  layout: Layout;
  defaultAlbum: string;
  addToMusic: boolean;
  cookiesFromBrowser: string;
};

const YOUTUBE_URL = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+$/i;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function initialUrl(): Promise<string> {
  const selected = await getSelectedText().catch(() => "");
  if (YOUTUBE_URL.test(selected.trim())) return selected.trim();
  const clipboard = (await Clipboard.readText()) ?? "";
  return YOUTUBE_URL.test(clipboard.trim()) ? clipboard.trim() : "";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const volume = mountPoint(preferences.nasShareUrl);
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<VideoInfo>();
  const [tags, setTags] = useState<SongTags>({ artist: "", title: "", album: "", year: "", comment: "" });
  const [layout, setLayout] = useState<Layout>(preferences.layout);
  const [customFolder, setCustomFolder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    initialUrl().then(setUrl);
  }, []);

  useEffect(() => {
    setInfo(undefined);
    setError(undefined);
    if (!YOUTUBE_URL.test(url.trim())) return;
    let cancelled = false;
    setIsLoading(true);
    probe(url.trim(), preferences.cookiesFromBrowser)
      .then((found) => {
        if (cancelled) return;
        setInfo(found);
        setTags(suggestTags(found, preferences.defaultAlbum, today()));
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function capture() {
    if (!info) return;
    try {
      const destination = songPath(layout, tags, {
        musicRoot: join(volume, preferences.nasMusicFolder),
        captureFolder: preferences.captureFolder,
        customFolder: customFolder[0],
      });
      await startCapture({
        ...tags,
        url: info.webpageUrl,
        description: info.description,
        destination,
        share: preferences.nasShareUrl,
        volume,
        addToMusic: preferences.addToMusic,
        cookies: preferences.cookiesFromBrowser,
      });
      await showHUD(`Capturing ${tags.artist} – ${tags.title}. A notification follows when done.`);
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not start capture", message: (e as Error).message });
    }
  }

  const field = (key: keyof SongTags) => ({
    value: tags[key],
    onChange: (value: string) => setTags((current) => ({ ...current, [key]: value })),
  });

  return (
    <Form
      isLoading={isLoading}
      actions={<ActionPanel>{info && <Action.SubmitForm title="Capture Song" onSubmit={capture} />}</ActionPanel>}
    >
      <Form.TextField id="url" title="YouTube URL" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={setUrl} />
      {error && <Form.Description title="Error" text={error} />}
      {info && (
        <>
          <Form.Description title="Video" text={`${info.title}\n${info.channel}`} />
          <Form.Separator />
          <Form.TextField id="artist" title="Artist" {...field("artist")} />
          <Form.TextField id="title" title="Title" {...field("title")} />
          <Form.TextField id="album" title="Album" {...field("album")} />
          <Form.TextField id="year" title="Year" {...field("year")} />
          <Form.TextArea id="comment" title="Comment" {...field("comment")} />
          <Form.Separator />
          <Form.Dropdown id="layout" title="Save To" value={layout} onChange={(value) => setLayout(value as Layout)}>
            {LAYOUTS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
          {layout === "custom" && (
            <Form.FilePicker
              id="customFolder"
              title="Folder"
              canChooseDirectories
              canChooseFiles={false}
              allowMultipleSelection={false}
              value={customFolder}
              onChange={setCustomFolder}
            />
          )}
        </>
      )}
    </Form>
  );
}
