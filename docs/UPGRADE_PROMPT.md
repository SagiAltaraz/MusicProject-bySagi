# Prompt: DJ Crate – Mega Upgrade

> להדבקה כמו שהוא בשיחה חדשה של Claude Code בתוך תיקיית הפרויקט (אחרי שעברת על [REVIEW_NOTES.md](REVIEW_NOTES.md)).

---

You are a senior full-stack engineer and product designer working on **DJ Crate** (`/Applications/code-learning/MusicProject`): an Express backend (`backend/`), a React 19 + Vite + Tailwind 4 + zustand + framer-motion frontend (`frontend/`), wrapped by Tauri (`src-tauri/`). It lets DJs search YouTube, preview tracks, organise them into crates, chat with an AI assistant and download audio.

Read `docs/REVIEW_NOTES.md` first. It lists every known bug and improvement. Treat it as the spec, verify each item against the code before fixing it (some may already be fixed), and work through the phases below **in order**. Commit after each phase with a clear message. Before each phase, write a short plan with the task-list tool. After each phase, run lint/build/tests and fix what breaks. Do not stop between phases to ask questions unless a decision is truly blocked; pick the sensible default and note it in the final report.

## Ground rules
- Match existing code style; keep changes focused; no placeholder or fake data; no dead code left behind.
- Never commit secrets. Do not print `.env` values. If you find evidence a key was committed, say so in the report and tell me to rotate it.
- Do not touch `node_modules` contents. Remove `backend/node_modules` from git tracking (`git rm -r --cached`), keep it ignored.
- Be honest about audio: YouTube sources are lossy (Opus ≈128–160 kbps / AAC ≈128 kbps). Never claim quality that is not in the source. Never normalise or compress dynamics destructively.
- Add a short in-app notice that users are responsible for having the right to download the content.

## Phase 1 – Repo hygiene and backend foundation
1. Untrack `backend/node_modules`; make `.gitignore` files consistent.
2. Restructure the backend into `routes/`, `controllers/`, `services/` (`youtube`, `audio`, `ai`), `middleware/`, `utils/`.
3. Add `zod` validation, `helmet`, `compression`, `express-rate-limit` (stricter on `/downloadSong` and `/askAI`), a central error handler, structured logging (`pino`), graceful shutdown, and CORS restricted to configured origins (`ALLOWED_ORIGINS`, default localhost:5173 and the Tauri origin).
4. Unify env names (one of `OPENAI_API_KEY`/`OpenAIapiKey`, one default port), update `.env.example`, validate env at startup, and check that `yt-dlp`, `ffmpeg`, `ffprobe` exist, with a clear install hint if not. Resolve binary paths via env or `which` rather than hard-coded Homebrew paths.
5. Cache YouTube search results (LRU with TTL) to protect the 10k units/day quota. Make the max-duration filter a query parameter (default 10 min, `0` = no limit) and stop dropping live/zero-duration items silently. Never log the API key.
6. Chat: per-client `sessionId` (frontend sends one persisted in localStorage), bounded history (LRU + max sessions + TTL), rate-limited.
7. Delete dead code (`webhook.js`, unused agent wiring) or properly wire it. Remove `components/library/*`, unused assets and the unused dependency if it is still unused after Phase 4.

## Phase 2 – Club-grade audio pipeline (top priority)
Rebuild `services/audio` and `/downloadSong` so that the output suits DJ software and club hardware (Pioneer CDJ/XDJ, Denon, Serato, Traktor, Rekordbox) **and does not damage the song**.

1. **Probe first**: add `GET /trackInfo?videoId=` that runs `yt-dlp -J` and returns available audio formats, the best source codec/bitrate/sample-rate, and a *source quality grade* (`good` ≥ 128 kbps AAC/Opus-160 style, `ok`, `low`) so the UI can show it before download.
2. **Download profiles** (query param `profile`, default `club`):
   - `club` – MP3 **320 kbps CBR**, 44.1 kHz, no joint-stereo, no loudness change. Use `-f bestaudio` then `--postprocessor-args "ffmpeg:-b:a 320k -ar 44100"` (remove `--audio-quality 0`, which is VBR V0).
   - `best` – keep the best native stream **without re-encoding**: if the best source is AAC, output `.m4a` by stream copy; if it is Opus, decode **once** to the container chosen below. Never double-encode.
   - `lossless` – WAV (24-bit PCM, 44.1 or 48 kHz kept from source) or FLAC; tag it `Upconverted from lossy` in metadata and in the UI so nobody mistakes it for a master. FLAC is optional because not all hardware supports it – warn about CDJ model compatibility in the UI.
   - Never output Opus/OGG as a final DJ format.
3. **Resampling and dither**: if resampling is needed use `-af aresample=resampler=soxr:precision=28`; no dither for 320 kbps MP3, and TPDF dither only if reducing bit depth. Never apply compression, limiting or normalisation to the audio.
4. **Analysis (non-destructive)** with ffmpeg/ffprobe after download: integrated LUFS and true-peak (`ebur128=peak=true`), actual bitrate, sample rate, duration, and a clipping flag. Write ReplayGain tags (`REPLAYGAIN_TRACK_GAIN/PEAK`) instead of changing the audio. Detect a ~16 kHz lowpass shelf and report "likely lossy source".
5. **Tags and artwork**: embed ID3v2.3 (best compatibility with CDJ/Rekordbox) with proper `artist`, `title`, `album`, `date`, cover art as JPEG ≤ 1000×1000. Parse `Artist - Title` from the video title and fall back to the channel (strip " - Topic"). Preserve Unicode (Hebrew, Arabic, accented Latin) in tags **and** filenames: only strip characters illegal on macOS/Windows/Linux, normalise to NFC, and cap length.
6. **BPM and key**: detect with `aubio`, `essentia` or `keyfinder-cli` (use whichever is installed; degrade gracefully if none) and write `TBPM` plus `TKEY` (Camelot/Open Key notation) and return the values to the UI. Do not fail the download if analysis fails.
7. **Robustness**: unique temp dir per job (`mkdtemp`), cleanup on finish/close/abort, kill the child process when the client disconnects, per-job timeout, p-queue with concurrency 2, no filename collisions (append ` (1)` if a file exists), and clear error messages (cookies missing, video unavailable, age-restricted, region-blocked) mapped to friendly codes the UI can display. Cookies browser configurable via `YTDLP_COOKIES_BROWSER` (default none on non-macOS).
8. **Progress**: expose `POST /downloads` (returns jobId) plus `GET /downloads/:id/events` (Server-Sent Events: queued, downloading %, converting, analysing, done with metadata and final path/URL) and `GET /downloads/:id/file`. Parse `yt-dlp --newline --progress-template`. Keep the old `/downloadSong` working as a thin wrapper for backward compatibility.
9. **Tests**: unit-test filename sanitising (Hebrew, emoji, slashes, very long titles), profile → argument building, artist/title parsing, quality grading. Add a smoke test that verifies a produced MP3 really is 320 kbps CBR 44.1 kHz via `ffprobe` (skip when binaries or network are absent).

## Phase 3 – Frontend foundations
1. Create a design-token layer in `index.css` (`@theme`): colour scale (keep the orange accent and cyan neon, raise `text-muted` to meet WCAG AA contrast), spacing, radius, shadows, motion durations, a tabular-numbers utility for BPM and time. Remove the broken `--container-*` overrides.
2. Components: `Button`, `IconButton` (required `aria-label`), `Modal`, `Toast` system, `Tooltip`, `Skeleton`, `Badge`, `Dropdown/Popover` (closes on outside click and Esc), `ErrorBoundary`.
3. Replace every `prompt()` with a proper modal (Tauri blocks it). Add an undo toast for deleting crates and tracks.
4. Routing: use `Link` everywhere (no full reloads), lazy-load pages, 404 page.
5. API layer: one axios instance with interceptors, typed error mapping, request cancellation (`AbortController`), search debounce and a small client cache. Show a persistent, friendly "backend offline" banner with a retry.
6. Fix the player bug where changing volume re-creates the YouTube player (keep volume in a ref/effect). Use `loadVideoById` instead of destroying the player per track, handle `onError` (embedding disabled → skip with a toast), keep a single global `onYouTubeIframeAPIReady` promise loader, wire the Media Session API and keyboard shortcuts (Space, ←/→, ↑/↓ volume, `M` mute, `/` or `⌘K` focus search).

## Phase 4 – Product and design polish (second top priority)
Aim for a "DJ booth" feel: dark, dense but clean, readable at arm's length under club lighting.

1. **Search**: header search with autocomplete from `/suggest` (debounced), recent searches (use the already stored history), clear button, keyboard navigation. Add filters: duration range, "extended mix / remix / original", and sort.
2. **Results**: a grid/table view toggle (persist it). Table columns: cover, title, artist, duration, BPM, Key (coloured Camelot badge), source-quality badge, actions. Virtualise long lists. Lazy-load thumbnails.
3. **Track details drawer**: opens from a row/card; shows probed audio info, quality grade, BPM/key, "mixes well with" suggestions (compatible Camelot keys ±1 and ±3 BPM%), profile picker and the Download button.
4. **Download centre**: a panel/popover from the header with live SSE progress, queue, retry, cancel, "Show in folder" (Tauri opener), and a profile selector remembered in settings. Replace the fake 3-second "Done" state with real status. Show clear per-profile hints ("Club MP3 320 – works on every CDJ", "Lossless – source is lossy, no quality gain").
5. **Waveform preview**: use the already-installed `wavesurfer.js` for a waveform of downloaded files or an elegant fallback visual for streaming previews; cue points and A/B loop are a bonus.
6. **Queue panel**: visible, drag-to-reorder, play-next, clear, shuffle/repeat.
7. **Crates**: modals for create/rename, drag-and-drop a card or row onto a crate in the sidebar, sort/search inside a crate, bulk select + bulk download, export to M3U, CSV and (bonus) Rekordbox XML, duplicate detection, track counts and total duration.
8. **Layout**: responsive down to ~900 px (Tauri min width) and tablets: collapsible sidebar, compact player, sticky header. Smooth, subtle motion; respect `prefers-reduced-motion`. Add a high-contrast **Stage mode** (very dark, large text, bigger hit targets) in settings.
9. **AI assistant**: render Markdown, stream the response, parse suggested `Artist - Title` lines into inline "Search" and "Add to crate" actions (fix the current "Search this" which searches the user's previous message), quick-prompt chips (e.g. "Next track after 124 BPM in 8A"), and a clear-chat action.
10. **Settings page**: default download profile, output folder (Tauri dialog), cookies browser, max duration, theme/Stage mode, and a diagnostics card (yt-dlp/ffmpeg versions, backend reachability).
11. **Home**: replace static quick-start chips with sections: continue listening, recent searches, genre tiles with real gradients, and "from your crates".
12. **Accessibility**: labels, roles, focus rings, keyboard-reachable menus, AA contrast, screen-reader text for icon buttons, `lang`/title/meta/favicon fixed in `index.html`.

## Phase 5 – Tauri, DX and docs
1. Tighten Tauri CSP (allow only the API origin, YouTube iframe/img hosts, fonts), minimal capabilities; add the opener/dialog plugins used above.
2. Bundle `yt-dlp` and `ffmpeg`/`ffprobe` as Tauri **sidecars** (documented download/checksum script per platform) and spawn the Express backend from the app, or provide a clear fallback path.
3. Add ESLint + Prettier to the backend, Vitest (frontend) and `node:test`/supertest (backend), plus a GitHub Actions workflow running lint, test and build.
4. Rewrite the root `README.md`: what it is, screenshots placeholders, install (`brew install yt-dlp ffmpeg`), env setup, dev/build commands, architecture diagram, download profiles table with honest quality notes, troubleshooting (cookies, quota, PATH), and the legal notice.

## Definition of done
- `npm run lint`, `npm run build` (frontend), backend tests, and the Tauri dev launch all pass or are explained.
- Run the app in the browser pane: search → preview → open details → download with each profile → verify the file with `ffprobe` (bitrate, sample rate, tags, cover) → add to a crate → export M3U. Take screenshots at ~1200 px and ~900 px widths and fix visual issues you see.
- Final report listing: what changed per phase, how each REVIEW_NOTES item was handled (fixed / skipped with reason), measured audio results per profile, anything not verified, and follow-ups (rotate keys if exposed, optional legal sources such as Bandcamp/Beatport/SoundCloud import).
