# /public/audio/

Drop two files here. The site runs without them (audio is gracefully disabled with
a single console warning) but the cinematic experience needs both.

## Required files

### `ui.mp3` — sprite (~200 KB max)

Single MP3 file containing all UI sounds laid out at these offsets (ms):

| Sprite key         | Start | Duration | Character                                |
| ------------------ | ----- | -------- | ---------------------------------------- |
| `click_primary`    | 0     | 80       | Mechanical shutter snap, warm            |
| `click_secondary`  | 100   | 60       | Softer tick                              |
| `hover`            | 200   | 80       | High-pass whoosh                         |
| `transition`       | 300   | 600      | Synth swell, for section / modal changes |
| `startup`          | 1000  | 1200     | Boot-up swell, for the intro cinematic   |

If you change the layout, also update `SPRITE_MAP` in [`src/lib/audio.ts`](../../src/lib/audio.ts).

### `ambient.mp3` — looping bed (≤ 2 MB initial chunk, streamed)

Slow cinematic synth pad in F minor, seamless loop, mastered to **−22 LUFS**.

## Acceptable sources

Royalty-free only, **attribution required in the project README**:

- [Pixabay](https://pixabay.com/music/) — filter "Cinematic" / "Dark Ambient"
- [Uppbeat](https://uppbeat.io/) — filter "Cinematic Score"

When you drop the files in, add an `## Attribution` section to the main
[`README.md`](../../README.md) listing track title, artist, source URL,
and license link.

## Why the site doesn't ship with audio

Licensing — even royalty-free tracks carry attribution conditions that should
be paired with a specific track choice rather than baked into the codebase.
Pick tracks you like and drop them in; the runtime adapts.
