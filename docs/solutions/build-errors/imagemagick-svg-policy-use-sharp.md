---
title: ImageMagick SVG security policy blocks favicon rasterization — use sharp for SVG, ImageMagick for .ico assembly
date: 2026-08-24
category: solutions/build-errors
module: favicon asset generation (public/)
problem_type: build_error
component: tooling
symptoms:
  - "magick: attempt to perform an operation not authorized by the security policy `SVG` @ error/module.c/OpenModule/1273"
  - "magick: delegate failed `'rsvg-convert' --dpi-x %x --dpi-y %y -o '%o' '%i'` @ error/delegate.c/InvokeDelegate/1921"
root_cause: config_error
resolution_type: tooling_addition
severity: low
tags: [imagemagick, sharp, svg, favicon, rasterize, security-policy]
framework_version: "ImageMagick 7 (Linux distro build); sharp-cli 6.0.0 via npx"
---

# ImageMagick SVG security policy blocks favicon rasterization — use sharp for SVG, ImageMagick for .ico assembly

## Problem
Rasterizing the app's SVG favicon (`public/favicon.svg`, a cropped Johnny Bravo head) into a PNG set and multi-size `.ico` failed immediately: ImageMagick 7 refuses to touch SVG input because its default security policy disables the SVG coder/delegate.

## Symptoms
- `magick: attempt to perform an operation not authorized by the security policy 'SVG' @ error/module.c/OpenModule/1273`
- `magick: delegate failed 'rsvg-convert' --dpi-x %x --dpi-y %y -o '%o' '%i' @ error/delegate.c/InvokeDelegate/1921`
- Zero output files; the command exits non-zero.

## What Didn't Work
- `magick -background none -density 384 favicon.svg -resize 32x32 ...` — rejected before rendering by the SVG policy block; the rsvg-convert delegate fallback also fails.
- Editing `/etc/ImageMagick-*/policy.xml` to re-enable the SVG coder would work, but requires root and deliberately weakens a distro hardening default (the policy exists to mitigate the CVE-2016-3714 "ImageTragick" delegate-exploit family). Wrong tradeoff for a one-off asset task on a dev machine.

## Solution
Split the pipeline by format:

1. **Rasterize SVG with sharp** (librsvg internally, no ImageMagick involved):
   ```bash
   cd public
   for sz in 16 32 48 180 192 512; do
     npx --yes sharp-cli -i favicon.svg -o favicon-$sz.png resize $sz $sz
   done
   ```
2. **Assemble the multi-size .ico with ImageMagick from the PNGs** — PNG input needs no SVG delegate, so the policy is satisfied:
   ```bash
   magick favicon-16.png favicon-32.png favicon-48.png favicon.ico
   ```
3. Verify with `identify favicon.ico` (shows the 16/32/48 layers) and a visual check of a larger size.

Resulting files in the repo tree: `public/favicon.svg`, `public/favicon-{16,32,48,192,512}.png`, `public/apple-touch-icon.png` (the 180 render), `public/favicon.ico`, plus `public/site.webmanifest` referencing the 192/512 icons. Wired via `<link rel="icon">`/`apple-touch-icon`/manifest in `index.html`.

## Why This Works
The error is not a bug in the SVG or the command — it is ImageMagick's security policy (`policy.xml`) deliberately refusing to invoke external delegates for SVG, a hardening measure against the ImageTragick exploit family. sharp renders SVG through its own bundled librsvg, bypassing the policy entirely. ImageMagick's remaining job (packing existing PNGs into an ICO container) touches only formats the policy allows, so the same binary completes the task without any policy change.

## Prevention
- When a rasterization/compositing task hits a security-policy block, prefer swapping the tool (sharp, resvg) over editing system-wide ImageMagick policy.
- Scope ImageMagick to operations on already-rasterized formats; treat SVG→PNG as sharp's job.
- Use `npx --yes sharp-cli` for zero-install, CI-friendly invocation — no package.json dependency needed for a one-off.
- Wrap the size list in a shell loop (as above) instead of one command per size.

## Related Issues
- None — first learning in this corpus (`docs/solutions/` was empty before this doc).
