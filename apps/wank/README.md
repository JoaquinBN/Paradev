# Wank, part of Wanker

Double-tap **right ⌥**, then show what you do on screen, talking if you like. Double-tap again, or click the notch, to finish. An agent works out what you want, builds an automation, tests it, and schedules it. Hover over the notch to watch each step live. If your intent is unclear (often when you didn't speak), it asks one short question in the notch. Tap an option, or double-tap right ⌥ and answer out loud.

**Cancel** at any point. Press esc twice while recording or building, or esc once on a question. You can also tap "Don't automate this", or say "never mind". Cancelling a build also removes anything it already set up.

**Automations…** in the menu-bar icon shows every automation as a card with its status (Scheduled, Paused, Blocked or Failed). Click a card to see its flow as connected nodes, from trigger to output, along with its runs. From there you can run it now, pause or resume it, or use **Change with Claude**, which reopens the agent that built it.

Self-contained macOS app (macOS 26+). It needs [Claude Code](https://claude.com/claude-code) (`claude` on your PATH) and nothing from the rest of this repo.

```bash
./build.sh   # builds, installs ~/Applications/ShowMe.app, launches it, and makes it start at login
```

On first launch, allow **Accessibility** (hotkey and click names), **Microphone**, and **Screen Recording**. Then relaunch the app.

## How it works

1. **Capture** (`Recorder`): voice, the display under the mouse when it changes (at most 1 fps), and every click and app switch, with the clicked control's name, app, window and page URL from the accessibility tree. Password fields are never read.
2. **Timeline** (`ShowMeCore`): on-device transcription with timestamps, then about 40 key screenshots interleaved with speech and clicks in `timeline.md`.
3. **Compile** (`Resources/compiler.md`): `claude -p` with Opus works out the outcome, trigger, rule, steps and output. It picks connectors and APIs over GUI replay, and drafts anything that reaches other people instead of sending it. It writes the automation, dry-runs it, fixes it, and reports. It uses subagents only for many frames or for independent research.
4. **Run**: each automation is a folder in `~/.showme/automations/<slug>/` (`prompt.md` and `automation.json`). It is scheduled with launchd, and every run is `claude -p` restricted to that automation's `allowedTools`. Triggers: `schedule`, `interval` (polling with `state.json`), `once`, `watch`, `login`.

```bash
~/.showme/bin/wank run <slug> [--dry-run]
~/.showme/bin/wank remove <slug>          # unschedule
~/.showme/bin/wank process <capture-dir>  # rebuild from a capture
~/.showme/bin/wank ask "Question?" "Option A" "Option B"   # what the agent uses to ask you
defaults write dev.showme.ShowMe locale es-ES   # speech language
```

Captures (`~/.showme/captures/`) contain screenshots and are deleted after 14 days.
