<div align="center">
  <h1>Sketch Parallax · 手绘视界</h1>
  <p><strong>English</strong> · <a href="README.md">简体中文</a></p>
  <p><strong>Give hand-drawn art another dimension.</strong></p>
  <p>Colored pencil & graphite · Shared 3D fly-throughs · Independent 3D sketch pages</p>
  <p><kbd>Agent Skill</kbd> &nbsp; <kbd>Desktop</kbd> &nbsp; <kbd>WebGL2</kbd> &nbsp; <kbd>Offline HTML</kbd></p>
  <p><a href="#showcase">Showcase</a> · <a href="#quick-start">Quick start</a> · <a href="#requirements">Requirements</a> · <a href="#build">Build your own</a></p>
  <img src="docs/media/hero.webp" alt="Actual desktop browser screenshot of Claude's pencil sketch with character selection and 3D controls" width="100%">
</div>

An **Agent skill** for turning transparent character, animal or object artwork into interactive hand-drawn 3D scenes. Cut out the subject, optionally transform it into a colored-pencil sketch, then explore its layered strokes in a desktop browser.

This repository includes the reusable skill, a four-character artwork featuring Claude, GPT, DeepSeek and Gemini, and a fresh single-image example built with the skill.

<a id="showcase"></a>

## See it in motion

<p align="center">
  <img src="docs/media/interaction.gif" alt="Actual HTML interaction: Claude and DeepSeek sketches separate into depth layers when rotated, then return to the front view" width="720">
</p>

<p align="center"><sub>Captured from the working HTML. Resolution and frame rate are reduced for this preview; the artwork supports live mouse interaction.</sub></p>

### Two ways to explore

| Shared fly-through | Independent sketch pages |
| :--- | :--- |
| ![GPT in the shared 3D scene](docs/media/shared-space.webp) | ![Gemini in an independent 3D sketch page](docs/media/independent-page.webp) |
| **All subjects share one 3D space.** Travel through the stroke layers from one character to another. | **Each subject has its own 3D space.** Only the current character is rendered; switch pages to explore another. |
| Rotate, zoom and play a continuous camera journey. | Rotate, zoom, spread the layers and play the sketch motion, without other characters blocking the page. |

**View the screenshots and animation here. Download the repository to try the interactive artwork on your own computer.** There is currently no public hosted demo URL configured for this repository.

### What it does

- **Transparent subjects first** — remove the original background before building stroke layers.
- **Hand-drawn style** — optional graphite and colored-pencil editing, with preserved subject identity.
- **Real layer separation** — 14 local stroke layers per subject, visible from different viewing angles.
- **One to eight subjects** — single-image experiments and multi-subject scenes, with configurable shared-space placement.
- **Desktop controls** — mouse rotation, wheel zoom, keyboard navigation and fullscreen; rendering stops when idle and playback pauses in the background.
- **Compact output** — both modes share artwork, code and styles. No Node, Three.js or runtime model downloads are required.

<a id="quick-start"></a>

## Quick start

### Try the included artwork

1. At the top of this GitHub repository, choose **Code → Download ZIP**.
2. Extract the entire folder.
3. Open `index.html` in a desktop browser and select a viewing mode.

A **WebGL2-capable browser** is all you need to view the finished artwork. Python is only needed to build new projects.

> Keep the complete folder. The default pages share `data.js`, `engine.js` and `style.css`; copying a single HTML file is not enough.

| Control | Action |
| --- | --- |
| Mouse drag | Rotate the view |
| Mouse wheel / ＋ / − | Zoom |
| Layer distance | Spread or collapse the stroke layers |
| Double-click / Front view | Restore the aligned view |
| Character list / Number keys | Select a subject |
| Previous / Next / Arrow keys | Switch subjects |
| Space / Play button | Play or pause |

### Use the skill with your Agent

Copy [`skills/sketch-parallax`](skills/sketch-parallax) into your Agent's skills directory. For Codex, the default location is `~/.codex/skills/`. Other SKILL.md-compatible clients use their own installation locations.

Give the Agent your images and a request such as:

```text
Use $sketch-parallax to turn these images into a desktop colored-pencil 3D artwork.
Create both modes: one shared fly-through space and independent 3D sketch pages.
Remove the background first, then check rotation, zoom, layer separation and occlusion.
```

The complete workflow is in [SKILL.md](skills/sketch-parallax/SKILL.md).

<a id="requirements"></a>

## Requirements

**The skill supplies instructions, scripts and templates. Image-editing capabilities come from your Agent's available tools.**

| Task | Requirement |
| --- | --- |
| Build HTML | Python 3.10+ and Pillow |
| View finished artwork | A WebGL2-capable desktop browser |
| Remove a background | rembg for opaque inputs, or an existing transparent image / mask |
| Create the pencil style | A reference-image editing tool, or ready-made transparent sketch artwork |
| AI depth estimation | **Not required** for this effect; the code creates artistic layer depth |
| Automated checks | Optional Playwright and Chromium |
| Music | Optional licensed MP3 |

This is a spatial presentation of layered 2D artwork. It does **not** reconstruct a real body, unseen back views or articulated character animation, and it does not convert every pencil mark into an individual vector stroke. Without image-editing tools, existing transparent art can still be layered, but the pencil style is not created automatically.

See the [capability guide](skills/sketch-parallax/references/capabilities.md) for dependency checks and fallback paths. Large model weights, browser binaries and virtual environments are not bundled. Supporting skill guides are currently written in Chinese.

<a id="build"></a>

## Build your own artwork

Starting from transparent PNG or WebP artwork:

```bash
python -m pip install -r skills/sketch-parallax/requirements.txt
python skills/sketch-parallax/scripts/doctor.py
```

Create `scene.json`. Image paths are relative to the JSON file:

```json
{
  "title": "My Sketch Space",
  "subjects": [
    { "name": "Subject One", "image": "art/one.png", "color": "#b57840" },
    { "name": "Subject Two", "image": "art/two.webp", "color": "#8a80b1" }
  ]
}
```

```bash
python skills/sketch-parallax/scripts/build.py --manifest scene.json --out site
```

Open `site/index.html`. Add `--standalone` if each viewing mode must be a self-contained HTML file; this duplicates embedded artwork and increases file size.

See the [manifest guide](skills/sketch-parallax/references/manifest.md) for scene options and the [artwork guide](skills/sketch-parallax/references/artwork.md) for the sketch-editing prompt.

<details>
<summary><strong>Background removal, verification, rebuilding and optional hosting</strong></summary>

### Background removal

Install optional dependencies in a separate virtual environment. The first model run downloads its weights; later runs reuse the cache.

```bash
python -m pip install -r skills/sketch-parallax/requirements-cutout.txt
python skills/sketch-parallax/scripts/cutout.py --input original.png --out-dir cutouts --model isnet-anime
```

Try `isnet-anime` for anime artwork, or `isnet-general-use` for photographs, animals and objects. Inspect the checkerboard, light and dark previews before continuing.

### Automated verification

```bash
python -m pip install -r skills/sketch-parallax/requirements-test.txt
python -m playwright install chromium
python skills/sketch-parallax/scripts/verify.py --site site --qa qa
```

### Rebuild the included artwork

Recover compressed editable assets from the shared data, without generating new images:

```bash
python skills/sketch-parallax/scripts/unpack.py --site demo --out work
python skills/sketch-parallax/scripts/build.py --manifest work/scene.json --out rebuilt
```

### Optional hosting

The output is a static site and can be hosted as a complete folder. If you later deploy it to GitHub Pages or another host, add the actual published URL to your README after deployment. No account-specific URL or local computer path is baked into this repository.

</details>

## Tested with real inputs

| Check | Result |
| --- | --- |
| Fresh single image: cutout → sketch edit → build | Completed; download and open `examples/single-image/pages.html` |
| Four-character artwork rebuilt with the new skill | Both modes load offline |
| Rotation, zoom, layer distance, reset, play / pause | Passed |
| Independent-page isolation | Only the current subject's 14 layers are rendered |
| Fixed world geometry | Passed |
| Cutout changes alpha while preserving original RGB | Passed |
| Browser runtime errors | 0 |

Reports: [single image](tests/single-image-report.json), [four characters](tests/four-character-report.json), [cutout](tests/cutout-report.json). Automated checks use software WebGL rendering and are not a benchmark of every user's GPU.

## Repository layout

```text
skills/sketch-parallax/    Skill, templates, scripts and dependency guides
demo/                     Four-character artwork in both modes
examples/single-image/    Fresh single-image skill trial
docs/media/               Actual screenshots and interaction preview
tests/                    Verification reports and artwork provenance
```

## Demo assets

The four-character demo includes Claude, GPT, DeepSeek and Gemini. Its illustrations were converted into transparent pencil sketches with an image-editing tool. The single-image example demonstrates a separate cutout, sketch edit and build. See [asset details](tests/art-provenance.json).

The included music comes from `music.shapeof.world`; its [usage notice](demo/music-license.txt), [metadata](demo/music-metadata.json) and [edit record](demo/music-edit.json) are preserved. The single-image example has no music; the existing track was not manually auditioned.
