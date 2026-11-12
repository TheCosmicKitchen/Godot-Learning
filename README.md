# Godot learning

Small, finished Godot games for learning the engine, one genre at a time. Each one is a separate Godot 4.7 .NET project in C#. Claude sets up the project, you write the core mechanic by hand, then Claude reviews your code and you polish it together.

Some of the games try out ideas for [STRATA](https://github.com/TheCosmicKitchen/STRATA), but this repo stands on its own.

**Lessons site:** [thecosmickitchen.github.io/Godot-Learning](https://thecosmickitchen.github.io/Godot-Learning/)

## Where things are

| What | Where |
| --- | --- |
| Every spec and lesson, served as the site | [docs/](docs/) |
| The plan: ten games and how the work is split | [docs/roadmap.md](docs/roadmap.md) |
| What to learn: ten units with goals, reading and exercises | [docs/syllabus.md](docs/syllabus.md) |
| Game 1, Touchdown: spec with screenshots, and the step-by-step guide | [docs/touchdown/spec.md](docs/touchdown/spec.md), [docs/touchdown/guide.md](docs/touchdown/guide.md) |
| Game 1, Touchdown: the code | [01-touchdown/](01-touchdown/) |

## Requirements

- Godot 4.7 **.NET** edition
- .NET 10 SDK
- Node.js, only for rebuilding the site

## Run a game

From this folder:

```bash
dotnet build 01-touchdown/Touchdown.csproj
```

Then open `01-touchdown/project.godot` in Godot and press F5.

## The site

GitHub Pages serves the `docs/` folder. Each `.md` page there has an `.html` twin, with clickable checkboxes that remember your progress in the browser. After editing a `.md` file, rebuild the pages and commit both:

```bash
node tools/md-to-html.js
```
