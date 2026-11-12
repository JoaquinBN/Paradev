# Wank

Wank is Wanker's notch helper. You tap right ⌥ and show it what you want automated. An agent turns that into a Wanker automation, and the automation shows up in **Wanks**.

- **One tap:** your voice only.
- **Two taps:** your voice and your screen, including every click and app switch.
- **Finishing:** tap again, or click the notch.
- **Have a wank** in the Wanks section records voice and screen.

Hover over the notch to watch the agent work. If your intent is unclear, it asks one short question in the notch; tap an option or tap right ⌥ and answer out loud.

To cancel, press esc twice while recording or building, or esc once on a question. You can also tap "Not in the mood", or say "never mind". Cancelling a build deletes anything it already created.

## How it fits into Wanker

`scripts/build-wank.ts` builds this Swift package into `dist/resources/bin/Wank.app` (macOS 26 SDK; skipped without it). The main process (`src/main/lib/wank`) starts it at launch and passes in its environment:
- `SUPERSET_HOME_DIR`
- `SUPERSET_API_URL`
- `WANK_CLI` (the bundled `superset`)
- `WANK_APP_URL` (the deep-link base)
- `WANK_LOCALE`

The app then talks to it over stdin, one JSON line per message: `record`, and `organization` when you switch orgs.

## How a wank becomes an automation

1. **Capture** (`Recorder`): a 16 kHz WAV and, for two taps, the display under the mouse at most once a second, only when it changes. It also logs every click and app switch, named through the accessibility tree; password fields are never read. Captures live in `$SUPERSET_HOME_DIR/wank/captures` for 14 days.
2. **Timeline** (`WankCore`): on-device transcription with phrase timestamps. About 40 key screenshots are interleaved with speech and clicks into `timeline.md`.
3. **Build** (`Resources/compiler.md`): `claude -p` with Opus works out the outcome, trigger, rule, steps and output.
   - It creates the automation with `wank create`, which files it under the Wank group and refuses prompts that read browser cookies or Keychain secrets.
   - It tests it with `superset automations run` and `logs`.
   - The CLI borrows the signed-in account's token from the organization's host service, so Wank needs no credentials of its own.
4. **Workflow:** the prompt ends with a `wank-flow` comment, and the Wanks section draws it as trigger → steps → output.

Tests: `swift test --package-path apps/desktop/native/wank`.
