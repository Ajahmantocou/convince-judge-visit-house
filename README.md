# Convince the AI Judge to Visit Your House: A Letter in One Image

[![make.fun](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![rank](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/Ajahmantocou/convince-judge-visit-house/rank.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![reward](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/Ajahmantocou/convince-judge-visit-house/reward.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)

An entry for the make.fun bounty
[Convince the AI Judge to Visit Your House: A Letter in One Image](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee).

## The idea

A warm, hand-drawn letter on cream paper, addressed to the AI judge:
**"YOU ARE INVITED"** — *Dear Judge, please come to my house. The coffee is
strong, the chair by the window is yours, and there are no meetings at all.
P.S. You can't really visit — but if you could, you'd stay. — Your Host.*

A little house with a red roof, a tree, and the sun sit above the letter, so
the invitation reads as a real place, not a generic card. The wink at the
judge's situation (an AI cannot literally visit) is the punchline, and the
reasons to say yes are concrete: strong coffee, a good chair, sun, and zero
meetings.

## How it works

`main.ts` runs on Node 22 with **zero dependencies** — no network, no system
fonts, no canvas library, no files outside this repo. It draws everything
itself, pixel by pixel:

- a hand-made 5×7 bitmap font (drawn from scratch, scaled up so every word
  stays big and legible at 1024×1024),
- a tiny rasterizer: filled rectangles, circles, lines, triangles (the roof,
  the house, the tree, the sun, the hearts),
- a minimal PNG encoder built on `node:zlib` + a CRC32 table.

It writes exactly one image, `/output/entry.png` (1024×1024, well under the
1 MiB cap), deterministically — two runs produce byte-identical output.

## Run it

```sh
node main.ts            # writes /output/entry.png
```

## License

MIT — see [LICENSE](LICENSE).
