# DJ Crate – הערות סקירה ושיפורים

סקירה של כל הפרויקט (backend Express, frontend React/Vite/Tailwind, עטיפת Tauri).
מסודר לפי עדיפות. הפרומפט להרצה אחרי הסקירה נמצא ב-[UPGRADE_PROMPT.md](UPGRADE_PROMPT.md).

---

## 1. איכות הורדה לדיג'יי (הדגש המרכזי)

### מצב נוכחי ([download.js](../backend/controllers/download.js))
`yt-dlp -x --audio-format mp3 --audio-quality 0`

### בעיות
1. **`--audio-quality 0` ב-MP3 = VBR V0 (~245kbps), לא 320.** חלק מהנגנים/ציוד ותיק מעדיפים CBR 320 לדיוק ב-seek וב-beatgrid.
2. **המקור הוא יוטיוב: Opus ~128–160kbps או AAC 128kbps.** המרה ל-MP3 היא *קידוד שני* של חומר שכבר דחוס (generation loss). אי אפשר "להחזיר" איכות; אפשר רק לא להרוס עוד.
3. אין בחירת פורמט המקור: צריך `-f "bestaudio[acodec=opus]/bestaudio"` או להעדיף את הזרם הגבוה ביותר (ABR) במקום ברירת מחדל.
4. אין תגיות: ID3 (artist/title/album/year), תמונת עטיפה, BPM, Key. DJ-ים חיים מזה ב-Rekordbox/Serato/Traktor.
5. אין נרמול/ניתוח עוצמה (LUFS) – אבל **לא לנרמל destructively**. רק לנתח ולכתוב ReplayGain/תגית, כדי לא לפגוע בשיר.
6. אין בדיקת clipping / true-peak, ואין סימון של "מקור lossy".
7. שם הקובץ מנקה כל תו שאינו ASCII → שמות בעברית/ערבית/ספרדית (é, ñ) נמחקים. צריך sanitization שמשמר Unicode ורק מוריד תווים אסורים במערכת קבצים.

### פורמטים שמתאימים לציוד (CDJ / Pioneer / Denon / Serato / Traktor / Rekordbox)
| פורמט | תאימות | הערה |
|---|---|---|
| MP3 320 CBR | אוניברסלית (כל CDJ ישן וחדש) | **ברירת המחדל המומלצת** |
| AAC/M4A | רוב ה-CDJ החדשים, Serato, Rekordbox | אם המקור AAC – אפשר *stream copy* בלי קידוד מחדש = אפס פגיעה |
| WAV / AIFF | אוניברסלית | רק כאשר צריך תאימות/מטא-דאטה; הקובץ גדול ולא משפר איכות |
| FLAC | CDJ-3000, Denon, Serato; לא כל ציוד | לסמן "Upconverted from lossy" כדי לא להטעות |
| Opus/OGG | **לא נתמך** בציוד DJ | אסור להוריד כ-Opus כפורמט סופי |

### המלצה
- פרופילי הורדה ב-UI: **Club (MP3 320 CBR)**, **Best (stream-copy m4a אם אפשר)**, **Lossless container (WAV/FLAC, עם תג upconverted)**.
- אם המקור כבר AAC – לשמור `m4a` עם `-x --audio-format m4a` בלי re-encode.
- אם צריך MP3: `--audio-format mp3 --postprocessor-args "ffmpeg:-b:a 320k -ar 44100 -joint_stereo 0"` (CBR, 44.1k, ללא joint stereo לדיוק מקסימלי).
- הוספת תגיות: `--embed-metadata --embed-thumbnail --parse-metadata "title:%(artist)s - %(title)s"` + `--convert-thumbnails jpg`.
- ניתוח אחרי הורדה (ffprobe/ffmpeg): `ebur128` ל-LUFS ו-true-peak, bitrate/sample-rate אמיתיים, זיהוי "ארטיפקט חיתוך 16kHz" (אינדיקציה למקור lossy ירוד). להציג למשתמש *אות איכות* (Good / OK / Low source) לפני ההורדה.
- BPM + Key: `aubio`/`essentia` או `keyfinder-cli`, לכתוב ל-ID3 (`TBPM`, `TKEY` בפורמט Camelot/Open Key) – מאפשר harmonic mixing מיד אחרי ההורדה.
- להימנע מ-`--audio-quality 0` כשיש CBR מפורש.
- לטפל בעצירה/ביטול, ובקבצים זמניים (ראו להלן).

> הערה חשובה והוגנת: **אי אפשר לקבל איכות סטודיו מיוטיוב.** הדרך לשיפור אמיתי היא לאפשר גם "ייבוא" ממקורות איכותיים (Bandcamp/Beatport/SoundCloud רשמי) ולא רק להוריד. כמו כן, הורדה מיוטיוב עלולה להפר את תנאי השימוש/זכויות יוצרים – כדאי להציג אזהרה למשתמש ולהשאיר את האחריות ברורה.

---

## 2. באגים ובעיות Backend

| קובץ | בעיה |
|---|---|
| [download.js](../backend/controllers/download.js) | הקובץ נכתב ל-`~/Downloads` של השרת ואז מוזרם (כפל I/O); אין ניקוי; שני בקשות עם אותו שם מתנגשות; אין timeout/ביטול; הבקשה "תלויה" עד סיום – אין התקדמות. מומלץ: תיקיית temp ייחודית (`mkdtemp`), SSE/WebSocket להתקדמות, ניקוי אחרי `res.finish`/`close`. |
| download.js | `cookies-from-browser chrome` מניח Chrome על מחשב השרת – נשבר בפריסה אחרת. לקונפיג דרך env + הודעת שגיאה ברורה ל-UI. |
| download.js | נתיבי Homebrew/Python קבועים בקוד (macOS בלבד). להעביר ל-env/`which`. |
| [searchsong.js](../backend/controllers/searchsong.js) | `search.list` עולה 100 יחידות מתוך 10,000 ביום ≈ **100 חיפושים ביום בלבד**. חובה cache (LRU/TTL) ו-debounce בצד לקוח. |
| searchsong.js | מפתח API ב-query string בלוגים/שגיאות; `dur &&` מסנן סטרימים חיים; מגבלת 10 דקות קשיחה – לא מתאימה לסטים/Extended mixes. לעשות פרמטר. |
| [chatassistant.js](../backend/controllers/chatassistant.js) | `conversationHistory` Map גדל בלי גבול (דליפת זיכרון); הלקוח לא שולח `sessionId` → **כל המשתמשים חולקים היסטוריה אחת ("default")**; אין rate limit. |
| [musicAgent.js](../backend/agents/musicAgent.js) / [webhook.js](../backend/controllers/webhook.js) | `OPENAI_API_KEY` מול `OpenAIapiKey` ב-`.env.example`; פורט ברירת מחדל 3035 מול 3000 ב-server; `webhook.js` לא מחובר לשום route (קוד מת); `musicAgentController` מפנה ל-n8n hard-coded. |
| [server.js](../backend/server.js) | `cors({origin:true, credentials:true})` פתוח לכולם; אין helmet / rate-limit / validation / error middleware / graceful shutdown. |
| כללי | `backend/node_modules` **מנוהל ב-git** (רואים בקבצים שהשתנו). להסיר מ-index (`git rm -r --cached`), להשאיר ב-.gitignore. |
| כללי | לוודא שמפתחות לא נשמרו בהיסטוריית git; ההיסטוריה כוללת commit "Ignore backend/.env" – **לבדוק ולסובב מפתחות** אם נחשפו. |
| כללי | אין בדיקות, אין לינטר ב-backend, אין TypeScript/JSDoc, אין לוגים מובנים (pino). |

---

## 3. באגים ובעיות Frontend

| מקום | בעיה |
|---|---|
| [TrackPlayer.jsx](../frontend/src/components/trackplayer/TrackPlayer.jsx) | **באג:** `createPlayer` תלוי ב-`volume` → כל גרירת סליידר עוצרת ומאתחלת את הנגן מחדש. צריך `volume` ב-ref. |
| TrackPlayer.jsx | `window.onYouTubeIframeAPIReady` נדרס; נגן נוצר מחדש בכל החלפת שיר (במקום `loadVideoById`); אין `onError` (וידאו חסום להטמעה); אין מקשי מדיה/Space. |
| [playerStore.js](../frontend/src/stores/playerStore.js) | כל שיר שמנגנים נדחף לתור – אין UI לתור, אין shuffle/repeat/סדר, אין "נגן הבא". |
| [SongCard.jsx](../frontend/src/components/songcard/SongCard.jsx) | סטטוס הורדה מזויף (`setTimeout 3000`), אין התקדמות אמיתית/שגיאה; ההורדה היא ניווט anchor, אז כשל לא מוצג. תפריט crate לא נסגר בלחיצה בחוץ / Esc. |
| [CratesPage.jsx](../frontend/src/pages/CratesPage.jsx) | `<a href>` גורם ל-reload מלא של האפליקציה (צריך `Link`); `prompt()` ליצירת crate (נחסם ב-Tauri, מכוער); מחיקה בלי אישור/Undo. |
| [Sidebar.jsx](../frontend/src/components/sidebar/Sidebar.jsx) | `prompt()` גם כאן; רוחב קבוע 224px, אין מצב מובייל; ז'אנרים קשיחים. |
| [ChatAssistant.jsx](../frontend/src/components/chatassistant/ChatAssistant.jsx) | כפתור "Search this" מחפש את *הודעת המשתמש הקודמת* ולא את ההמלצה; אין Markdown/רשימות; אין parsing של "Artist - Title" לכפתורי חיפוש/הוספה ל-crate. |
| [searchStore.js](../frontend/src/stores/searchStore.js) | אין debounce/cache/ביטול בקשה; `searchHistory` נשמרת אך לא מוצגת; אין autocomplete אף שה-backend מחזיר `/suggest`. |
| קוד מת | `components/library/*` (Library.jsx/css, URL hard-coded), `wavesurfer.js` מותקן ולא בשימוש, `react.svg`. |
| [index.css](../frontend/src/index.css) | דריסת `--container-*` של Tailwind (ערכים לא עקביים, `xl:640px`) – שובר `max-w-*`; `body{overflow:hidden}` בלי fallback. |
| [index.html](../frontend/index.html) | favicon מסוג svg מצביע על jpg; אין meta description/theme-color. |
| Tauri | `csp: null` – לחדד CSP; להגדיר הרשאות מינימליות. |
| נגישות | כפתורי אייקון בלי `aria-label`, אין focus ring עקבי, ניגודיות `text-muted (#5a5a5a)` על `#141414` נמוכה מ-WCAG AA. |

---

## 4. עיצוב וחוויית משתמש (הדגש השני)

**כיוון עיצובי:** ממשק "booth" כהה, צפוף-מידע אך נקי, בהשראת Rekordbox/Beatport, לא "Spotify clone".

1. **שורת חיפוש גלובלית עם Autocomplete** (שימוש ב-`/suggest`), היסטוריה אחרונה, קיצור `⌘K`/`/`.
2. **כרטיס שיר → שורת שיר (list/table view)** עם מתג תצוגה: רשת/טבלה. עמודות: שם, אמן, משך, BPM, Key (Camelot צבעוני), איכות מקור, פעולות. DJ-ים סורקים טבלאות מהר יותר מרשת תמונות.
3. **Camelot wheel badge** צבעוני + סינון לפי BPM/Key תואמים ("Mixes well with").
4. **נגן Waveform** (כבר מותקן `wavesurfer.js`) – תצוגת waveform ל-preview, נקודות Cue, A/B loop, קיצורי מקשים (Space, ←/→).
5. **תור (Queue) פאנל** נגרר (drag & drop), שמירת תור, "Play next".
6. **מרכז הורדות**: פאנל עם התקדמות, תור הורדות, retry, פתיחה בתיקייה (Tauri `shell/opener`), בחירת פרופיל איכות.
7. **Crates**: מודל יצירה/שינוי שם (במקום `prompt`), drag-and-drop שיר לתוך crate, ייצוא ל-M3U / Rekordbox XML / CSV, מיון וחיפוש בתוך crate, Undo למחיקה.
8. **Responsive + מצב צר**: sidebar נסגר, תפריט המבורגר, נגן תחתון מותאם למסך קטן.
9. **Design tokens**: סולם צבעים אחד (accent כתום + neon ציאן), מרווחים עקביים (4/8px), טיפוגרפיה עם tabular-nums למספרים (BPM/זמן), radius עקבי, מצבי hover/focus/active/disabled מוגדרים.
10. **מצבי מערכת**: skeleton, empty states אמיתיים, toast להצלחה/שגיאה (במקום טקסט פנימי), error boundary, בדיקת חיבור ל-backend והודעה ברורה.
11. **ביצועים**: virtualization לרשימות ארוכות, lazy-load תמונות, `React.lazy` לעמודים, קוד splitting.
12. **נגישות מלאה**: aria-labels, ניווט מקלדת, `prefers-reduced-motion`, ניגודיות AA, מקשי מדיה (Media Session API).
13. **AI Assistant**: Markdown, כפתורי "Search / Add to crate" לכל שיר מוצע, הצעות מוכנות ("Next track for 124 BPM 8A"), סטרימינג תשובה, `sessionId` לכל משתמש.
14. **Dark/Light + Stage mode** (ניגודיות גבוהה/בהירות נמוכה לשימוש במועדון).

---

## 5. תשתית ואיכות קוד
- לפצל backend ל-`routes / services / middleware / utils`; שכבת `services/audio` שמכילה את לוגיקת yt-dlp/ffmpeg (ניתנת לבדיקה).
- Validation (zod), `helmet`, `express-rate-limit`, `compression`, error middleware, `pino`.
- Cache לחיפושים (node-cache / lru-cache), תור הורדות (p-queue, מקביליות 2).
- `.env.example` עקבי, בדיקת startup שמוודאת yt-dlp/ffmpeg/ffprobe זמינים ומציגה הוראות.
- בדיקות: Vitest (frontend), node:test/supertest (backend), בדיקת תקינות פרופילי האודיו על קובץ דוגמה.
- GitHub Actions: lint + build + test.
- README אמיתי עם הוראות התקנה (brew install yt-dlp ffmpeg), תרשים ארכיטקטורה, מדריך פרופילי איכות.
- Tauri: לארוז yt-dlp/ffmpeg כ-sidecar כדי שהאפליקציה תעבוד בלי התקנות ידניות.
