#!/bin/zsh -f
set -euo pipefail
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

ytdlp_common=(--no-playlist --no-warnings --js-runtimes node --extractor-args youtube:skip=hls)
cache=$HOME/Library/Caches/yt-music-capture

ytdlp() {
  local err
  err=$(mktemp)
  yt-dlp "${ytdlp_common[@]}" "$@" 2>"$err" &
  if wait $!; then
    rm -f "$err"
    return 0
  fi
  print -u2 "yt-dlp failed, retrying over IPv4: $(tail -n 3 "$err")"
  rm -f "$err"
  yt-dlp "${ytdlp_common[@]}" --force-ipv4 "$@" &
  wait $!
}

use_cookies() {
  [[ -n ${1:-} && $1 != none ]] && ytdlp_common+=(--cookies-from-browser "$1")
  return 0
}

credit() {
  AtomicParsley "$1" --comment "$2" --lyrics "$3" "${@:4}" --overWrite >/dev/null
}

report() {
  print -r -- "$1" >"${job%.json}.result"
  open -g "$done_link"
}

probe() {
  trap 'pkill -TERM -P $$; exit 143' TERM
  use_cookies "${2:-}"
  mkdir -p "$cache"
  find "$cache" -name 'probe-*.info.json' -mmin +360 -delete
  ytdlp --skip-download --no-simulate --write-info-json -o "$cache/probe-%(id)s" \
    -O '%(.{id,title,channel,channel_url,upload_date,webpage_url,artist,track,album,duration,description,chapters})j' -- "$1"
}

run() {
  field() { plutil -extract "$1" raw -o - "$job" 2>/dev/null || true; }
  url=$(field url) artist=$(field artist) album_artist=$(field albumArtist) title=$(field title) album=$(field album)
  year=$(field year) comment=$(field comment) tracklist=$(field tracklist) description=$(field description)
  grouping=$(field grouping)
  destination=$(field destination) share=$(field share) volume=$(field volume)
  add_to_music=$(field addToMusic) done_link=$(field doneLink) info_json=$cache/probe-$(field id).info.json
  use_cookies "$(field cookies)"

  if [[ -n $share && $destination == $volume/* ]]; then
    [[ -d $volume ]] || osascript -e 'on run argv' -e 'mount volume (item 1 of argv)' -e 'end run' "$share" >/dev/null
    [[ -d $volume ]] || { print "Network share did not mount at $volume"; exit 1; }
  fi
  [[ ! -e $destination ]] || { print "Already exists: $destination"; exit 1; }

  local fetch=(-f 'ba[ext=m4a]/ba' -x --audio-format m4a --write-thumbnail
    --no-progress -o "$work/source.%(ext)s")
  if ! [[ -f $info_json ]] || ! yt-dlp "${ytdlp_common[@]}" --load-info-json "$info_json" "${fetch[@]}"; then
    ytdlp "${fetch[@]}" -- "$url"
  fi
  rm -f "$info_json"

  local s=1400
  local thumbnail=( "$work"/source.(webp|jpg|jpeg|png)(N) )
  (( ${#thumbnail} )) || { print "yt-dlp wrote no thumbnail"; exit 1; }
  ffmpeg -v error -y -i "$thumbnail[1]" -frames:v 1 -q:v 2 -filter_complex \
    "[0]split[bg][fg];[bg]scale=$s:$s:force_original_aspect_ratio=increase,crop=$s:$s,boxblur=40,eq=brightness=-0.15[blur];[fg]scale=$s:$s:force_original_aspect_ratio=decrease[front];[blur][front]overlay=(W-w)/2:(H-h)/2" \
    "$work/cover.jpg"

  ffmpeg -v error -y -i "$work/source.m4a" -i "$work/cover.jpg" \
    -map 0:a -map 1:v -c copy -disposition:v:0 attached_pic -map_metadata -1 \
    -metadata "title=$title" -metadata "artist=$artist" -metadata "album_artist=$album_artist" \
    -metadata "album=$album" -metadata "grouping=$grouping" -metadata "date=$year" \
    -metadata "description=$description" -metadata "synopsis=$description" \
    "$work/song.m4a"
  credit "$work/song.m4a" "$comment" "$tracklist" --rDNSatom "$url" name=SOURCE_URL domain=com.apple.iTunes

  mkdir -p "${destination:h}"
  cp -n "$work/song.m4a" "$destination"

  if [[ $add_to_music == true ]]; then
    local inbox=( "$HOME"/Music/Music/Media*/Automatically\ Add\ to\ Music*(N/) )
    (( ${#inbox} )) || { print "No 'Automatically Add to Music' folder found"; exit 1; }
    cp "$work/song.m4a" "$inbox[1]/"
  fi
}

case ${1:-} in
  probe) shift; probe "$@" ;;
  credit) shift; credit "$@" ;;
  run)
    job=$2 log=${2%.json}.log title="" artist=""
    exec >>"$log" 2>&1
    work=$(mktemp -d)
    trap 'code=$?; rm -rf "$work"
      if (( code )); then report "Capture failed: $title. $(tail -n 1 "$log")"
      else rm -f "$job" "$log"; report "Captured $artist – $title"; fi' EXIT
    run ;;
  *) print -u2 "usage: capture.zsh probe <url> [cookies] | run <job.json> | credit <file.m4a> <comment> <tracklist>"; exit 2 ;;
esac
