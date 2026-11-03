import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  LocalStorage,
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
import { doneLink, probe, startCapture } from "./worker";

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

type Remembered = { layout: Layout; customFolder?: string };

const rememberKey = (info: VideoInfo) => `destination:${info.channelUrl || info.channel}`;

async function recall(info: VideoInfo): Promise<Remembered | undefined> {
  const saved = await LocalStorage.getItem<string>(rememberKey(info));
  if (!saved) return undefined;
  const remembered = JSON.parse(saved) as Remembered;
  return LAYOUTS.some((option) => option.value === remembered.layout) ? remembered : undefined;
}

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
  const [isRemembered, setIsRemembered] = useState(false);
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
      .then(async (found) => {
        const remembered = await recall(found);
        if (cancelled) return;
        setInfo(found);
        setTags(suggestTags(found, preferences.defaultAlbum, today()));
        setLayout(remembered?.layout ?? preferences.layout);
        setCustomFolder(remembered?.customFolder ? [remembered.customFolder] : []);
        setIsRemembered(Boolean(remembered));
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function capture(chosen: Layout) {
    if (!info) return;
    try {
      const destination = songPath(chosen, tags, {
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
        doneLink: doneLink(),
      });
      await LocalStorage.setItem(
        rememberKey(info),
        JSON.stringify({ layout: chosen, customFolder: chosen === "custom" ? customFolder[0] : undefined }),
      );
      await showHUD(`Capturing ${tags.artist} – ${tags.title}. You will see a message when it is done.`);
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
      actions={
        info && (
          <ActionPanel>
            <Action.SubmitForm title="Capture Song" onSubmit={() => capture(layout)} />
            <ActionPanel.Section title="Capture To">
              {LAYOUTS.filter((option) => option.value !== "custom" && option.value !== layout).map((option) => (
                <Action.SubmitForm
                  key={option.value}
                  title={`Capture to ${option.title}`}
                  onSubmit={() => capture(option.value)}
                />
              ))}
              {layout !== "custom" && <Action title="Choose a Folder…" onAction={() => setLayout("custom")} />}
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    >
      <Form.TextField
        id="url"
        title="YouTube URL"
        placeholder="https://www.youtube.com/watch?v=…"
        value={url}
        onChange={setUrl}
      />
      {error && <Form.Description title="Error" text={error} />}
      {info && (
        <>
          <Form.Description title="Video" text={`${info.title}\n${info.channel}`} />
          <Form.Separator />
          <Form.TextField id="artist" title="Artist" placeholder="Artist name" {...field("artist")} />
          <Form.TextField id="title" title="Title" placeholder="Song title" {...field("title")} />
          <Form.TextField id="album" title="Album" placeholder="Album name" {...field("album")} />
          <Form.TextField id="year" title="Year" placeholder="YYYY" {...field("year")} />
          <Form.TextArea id="comment" title="Comment" placeholder="Notes saved in the file" {...field("comment")} />
          <Form.Separator />
          <Form.Dropdown
            id="layout"
            title="Save To"
            info={isRemembered ? `Remembered from your last capture from ${info.channel}` : undefined}
            value={layout}
            onChange={(value) => setLayout(value as Layout)}
          >
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
