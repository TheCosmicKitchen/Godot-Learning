# Godot learning

Small, finished Godot games for learning the engine, one genre at a time. Each one is a separate Godot 4.7 .NET project in C#. Claude sets up the project, you write the core mechanic by hand, and then you polish it together.

Some of the games try out ideas for [STRATA](../strata/), but this repo stands on its own.

## Where things are

| What | Where |
| --- | --- |
| The plan: ten games and how the work is split | [roadmap.md](roadmap.md) ([HTML](roadmap.html)) |
| What to learn: ten units with goals, reading and exercises | [syllabus.md](syllabus.md) ([HTML](syllabus.html)) |
| Game 1: Touchdown, land a ship by steering both crew at once | [01-touchdown/](01-touchdown/): start with its [GUIDE.html](01-touchdown/GUIDE.html) |

## Requirements

- Godot 4.7 **.NET** edition
- .NET 10 SDK
- Node.js, only for rebuilding the HTML pages

## Run a game

From this folder:

```bash
dotnet build 01-touchdown/Touchdown.csproj
```

Then open `01-touchdown/project.godot` in Godot and press F5.

## HTML pages

The `.html` pages are generated from the Markdown, with clickable checkboxes that remember your progress in the browser. After editing a `.md` file, rebuild them:

```bash
node tools/md-to-html.js
```
