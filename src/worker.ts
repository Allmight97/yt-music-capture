import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MIX_MINUTES, SongTags, VideoInfo, videoInfoOf } from "./tags";

export type Job = SongTags & {
  url: string;
  description: string;
  destination: string;
  share: string;
  volume: string;
  cookies: string;
  grouping: string;
  id: string;
  doneLink: string;
};

const script = () => join(environment.assetsPath, "capture.zsh");
export const jobsFolder = join(homedir(), "Library", "Caches", "yt-music-capture");

export function doneLink(): string {
  const scheme = environment.supportPath.includes("/com.tinycast.") ? "tinycast" : "raycast";
  return `${scheme}://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/show-capture-results`;
}

export function mountTable(): Promise<string> {
  return new Promise((resolve) => execFile("/sbin/mount", (error, stdout) => resolve(error ? "" : String(stdout))));
}

export function probe(url: string, cookies: string): { result: Promise<VideoInfo>; stop: () => void } {
  let child: ReturnType<typeof execFile> | undefined;
  const result = new Promise<VideoInfo>((resolve, reject) => {
    child = execFile(
      "/bin/zsh",
      ["-f", script(), "probe", url, cookies, String(MIX_MINUTES * 60)],
      { maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(String(stderr).trim().split("\n").pop() || error.message));
        resolve(videoInfoOf(JSON.parse(String(stdout)), url));
      },
    );
  });
  return { result, stop: () => child?.kill() };
}

export function startCapture(job: Job): Promise<void> {
  mkdirSync(jobsFolder, { recursive: true });
  const jobFile = join(jobsFolder, `${Date.now()}.json`);
  writeFileSync(jobFile, JSON.stringify(job));
  const detach =
    'open STDIN, "<", "/dev/null"; open STDOUT, ">", "/dev/null"; open STDERR, ">&", \\*STDOUT;' +
    "fork and exit; POSIX::setsid(); exec @ARGV or die";
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/perl", ["-MPOSIX", "-e", detach, "/bin/zsh", "-f", script(), "run", jobFile], (error) =>
      error ? reject(error) : resolve(),
    );
  });
}
