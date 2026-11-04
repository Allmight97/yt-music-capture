import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileComment, MIX_MINUTES, suggestTags, videoIdOf, videoInfoOf, watchUrl } from "../src/tags";

type Tags = { comment?: string; lyrics?: string; SOURCE_URL?: string };
type Change = { file: string; url: string; comment: string; tracklist: string; was: Tags };

const worker = join(__dirname, "..", "assets", "capture.zsh");

function songsIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".m4a"))
    .map((name) => join(folder, name))
    .sort();
}

function tagsOf(file: string): Tags {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format_tags", "-of", "json", file], {
    encoding: "utf8",
  });
  return JSON.parse(out).format?.tags ?? {};
}

function lookUp(id: string) {
  try {
    return JSON.parse(execFileSync("/bin/zsh", ["-f", worker, "probe", watchUrl(id), "", String(MIX_MINUTES * 60)], { encoding: "utf8" }));
  } catch {
    return undefined;
  }
}

function plan(folder: string, out: string) {
  const changes: Change[] = [];
  for (const file of songsIn(folder)) {
    const was = tagsOf(file);
    const id = videoIdOf(was.SOURCE_URL ?? "");
    const json = id && lookUp(id);
    if (!id || !json) {
      console.error(`\nskip, ${id ? "lookup failed" : "no SOURCE_URL"}: ${file}`);
      continue;
    }
    const tags = suggestTags(videoInfoOf(json, watchUrl(id)), "");
    const change = { file, url: watchUrl(id), comment: fileComment(tags), tracklist: tags.tracklist, was };
    changes.push(change);
    console.error(`\n== ${file}\n-- comment now:\n${was.comment ?? ""}\n-- comment new:\n${change.comment}`);
    if ((was.lyrics ?? "") !== change.tracklist) console.error(`-- lyrics now:\n${was.lyrics ?? "(none)"}`);
  }
  writeFileSync(out, JSON.stringify(changes, null, 2));
  console.error(`\n${changes.length} songs planned in ${out}`);
}

function apply(planFile: string) {
  const changes = JSON.parse(readFileSync(planFile, "utf8")) as Change[];
  for (const change of changes) {
    execFileSync("/bin/zsh", ["-f", worker, "retag", change.file, change.comment, change.tracklist, change.url]);
    console.error(`retagged ${change.file}`);
  }
}

const [mode, target, out] = process.argv.slice(2);
if (mode === "plan" && target && out) plan(target, out);
else if (mode === "apply" && target) apply(target);
else {
  console.error("usage: retag.ts plan <folder> <plan.json> | apply <plan.json>");
  process.exit(2);
}
