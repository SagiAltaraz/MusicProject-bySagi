# DJ Crate

A record bag for DJs. Search YouTube, preview tracks, sort them into crates, see **BPM, Camelot key and loudness**, and download club-ready **AIFF, WAV, FLAC, MP3 320 or untouched AAC** with full tags and artwork, ready for Rekordbox, Serato, Traktor and CDJs.

> **Use responsibly.** Only download music you have the right to use. Downloading from YouTube may break its Terms of Service and copyright law. For gigs, buying the release (Bandcamp, Beatport, Juno) also gets you the lossless master.

## Features

- **Club-grade downloads**: one controlled encode from the best source stream, never YouTube's dynamics-compressed "DRC" variants, no normalising or limiting.
- **Analysis**: BPM, musical key (Camelot), EBU R128 loudness, true peak and frequency bandwidth, written into the file as tags (TBPM, TKEY, ReplayGain).
- **Analyze without downloading**: check BPM and key before deciding.
- **Library**: grid or DJ-style table view, sort by BPM or key, harmonic "mixes well with" suggestions.
- **Crates**: drag and drop, reorder, download all, analyze all, export to **Rekordbox XML**, M3U or CSV.
- **Download centre**: live progress, cancel, retry, Show in Finder.
- **Player**: queue, shuffle, repeat, media keys and keyboard shortcuts.
- **AI assistant** (optional): set ideas and track suggestions, each with Search and Add buttons.
- **Stage mode**: high contrast, bigger type for dark booths.

## Download formats - what "best quality" means

Every format starts from the same YouTube stream: about **128kbps** (Opus or AAC), or **256kbps** for many tracks on a YouTube Premium account. **No format can add quality that isn't in the source.** The formats differ in how much *more* they lose, and where they play:

| Format | Sound vs. source | Tags & artwork | Plays on | Pick it when |
|---|---|---|---|---|
| **AIFF 16-bit** (default) | No further loss | ✅ ID3 incl. BPM/key | Every CDJ, Rekordbox, Serato, Traktor | **Best all-round choice** |
| WAV 16-bit | No further loss | ⚠️ Basic only, no artwork | Everything | Gear that only takes WAV |
| FLAC 16-bit | No further loss | ✅ | CDJ-3000/XDJ, Serato, Traktor (not older CDJs) | You want half the file size |
| AAC original | Identical (stream copied bit-for-bit) | ✅ | Newer CDJs, all DJ software | Smallest lossless-to-source option |
| MP3 320 CBR | Tiny extra loss (second lossy encode) | ✅ | Literally everything | Old gear, USB space |

All outputs are 44.1kHz, which every player supports. Lossless outputs are resampled once with SoX (soxr, 28-bit precision) and TPDF-dithered to 16-bit. The download centre labels these files "lossless container from a lossy source" so nobody mistakes them for masters.

### Getting the 256kbps streams (YouTube Premium)
Sign in to YouTube with a Premium account in a browser, then set `YTDLP_COOKIES_BROWSER` in `backend/.env` (`chrome`, `safari`, `firefox`, `brave` or `edge`). Safari also needs **Full Disk Access** for the app running the backend (Terminal / VS Code). The track drawer shows each video's available streams and a quality grade.

## Setup

Requirements: Node 20+, plus `yt-dlp` and `ffmpeg`/`ffprobe`.

```bash
brew install yt-dlp ffmpeg
```

```bash
cd backend && npm install && cp .env.example .env
```

Add your `YOUTUBE_API_KEY` (YouTube Data API v3) to `backend/.env`. `OPENAI_API_KEY` is optional and only used by the assistant.

```bash
cd frontend && npm install
```

### Run

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Open http://localhost:5173. Files are saved to `~/Downloads` (change it with `DOWNLOAD_DIR`). The desktop app (Tauri) runs with `npm run tauri dev` from the repo root.

### Tests and lint

```bash
cd backend && npm run lint && npm test
```

```bash
cd frontend && npm run lint && npm test && npm run build
```

## Architecture

```
frontend (React 19 · Vite · Tailwind 4 · zustand)
   │  REST + Server-Sent Events
backend (Express)
   ├─ routes/ → controllers/ (zod validation, rate limits)
   ├─ services/youtube.js   search + suggestions (cached: 100 quota units per search)
   ├─ services/ai.js        streamed chat, bounded per-session history
   └─ services/audio/
        ytdlp.js     probe formats, fetch the raw source stream (never DRC)
        analyze.js   loudness (ffmpeg ebur128) + dsp.js: BPM, key, cutoff
        ffmpeg.js    single encode: resample/dither, tags, artwork
        jobs.js      queue (2 at a time), progress, cancel, timeout, temp cleanup
```

Main endpoints: `GET /searchSongs`, `GET /trackInfo`, `POST /analyze`, `POST /downloads`, `GET /downloads/:id/events` (SSE), `GET /downloads/:id/file`, `DELETE /downloads/:id`, `GET /health`.

## Troubleshooting

| Problem | Fix |
|---|---|
| "YouTube refused the download" / HTTP 403 | Update yt-dlp: `brew upgrade yt-dlp` or `pip install -U yt-dlp`. YouTube changes often. |
| "YouTube wants a signed-in browser" | Sign in to YouTube in the browser set in `YTDLP_COOKIES_BROWSER`. |
| "Couldn't read browser cookies" | That browser has no profile, or Safari lacks Full Disk Access. Pick another browser or use `none`. |
| Search quota used up | The free quota is about 100 searches a day. Repeat searches are cached for 6 hours. |
| yt-dlp / ffmpeg not found | Install them, or point `YTDLP_PATH` / `FFMPEG_PATH` / `FFPROBE_PATH` at the binaries. |
| Settings → Diagnostics | Shows tool versions, keys and the save folder at a glance. |
