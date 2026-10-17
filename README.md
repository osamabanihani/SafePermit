# SafePermit v13.9

SafePermit is a bilingual Permit-to-Work (PTW) frontend prototype for demonstrating controlled work preparation, review, activation and safety oversight. It runs as static HTML, CSS and vanilla JavaScript with browser-local demo records.

## Verified development status

Implementation baseline: **67ef1b5c9ed535ac30a84ece5fc701d949183e05** (Phase 6). Final delivery is on `delivery/final-prototype`. Both the independent baseline rerun and final post-cleanup suite pass **405 automated tests with zero failures/skips**. Fresh browser replays confirm the original validation, failed-save and ID-collision corrections. The source/reference check passes **1,439 local references with none missing**. Full fresh logs, cleanup inventories and packaging evidence are delivered outside this repository.

- A saved draft with 51 workers cannot pass final submission, approval or activation checks; the established range is 1–50.
- Risk Assessment and Checklist failed saves replace success feedback, retain edits and allow retry.
- New submission cannot overwrite an existing Stopped permit when a generated ID collides.
- The valid 50-worker wizard and ordered review/activation/Stop-Work/HSE-resume journey pass.

These results apply to a frontend prototype. They do not establish production authentication, server authorization, atomic database persistence or industrial safety certification. See [engineering and safety guidance](AGENTS.md) for architecture, invariants, tests and QA history.

## Features and roles

| Role | Main workflow |
| --- | --- |
| Worker | Prepare Basic Info, Risk Assessment and Safety Checklist; save/recover drafts; submit; correct returned permits; track decisions and contextual QR references. |
| Supervisor | Review operational scope and team readiness; approve to Safety Review, return for correction or reject; monitor active work. |
| Safety Officer | Review risk and safety evidence; manage gates, SIMOPS, LOTO, competency passports, incidents, corrective actions and Stop-Work; explicitly review controlled resumption. |
| Administrator | Record final approval, separately activate eligible Approved permits, close active permits and view organization/audit screens. |

Shared features include EN/AR with RTL/LTR, light/dark themes, responsive role navigation, accessible dialogs/forms and reduced-motion behavior. Local AI assistants offer advisory suggestions; they do not authorize work or make approval decisions. Demo role selection and hidden menu items are not access control.

## Technology and prerequisites

- HTML5, CSS3 and vanilla JavaScript. No React, npm install, build step or backend is required.
- Fonts, images, QR reference images and the existing Three.js vendor asset are bundled locally.
- Run with VS Code and the Live Server extension, or another local HTTP static server.
- Automated tests use Node.js 22+ with WebSocket support and an installed Chrome/Edge browser. The verified environment uses Node 24.21.0 and Chrome 155.0.8059.40. `CHROME_PATH` can select another supported Chromium executable.

## Run with Live Server

1. Open `SafePermit-Cinematic-Preview` itself as the VS Code folder.
2. Open `index.html` and choose **Open with Live Server** / **Go Live**.
3. Open the shown localhost URL, then use **Login** and a clearly labelled demo role. There is no real password or identity verification.
4. Keep one origin/port when testing a journey: localStorage belongs to that origin. Use a disposable browser profile for QA; do not clear valuable permit, approval or Stop-Work data.

Opening pages through `file://` is unsupported because the application fetches local components/locales. `home-preview.html` is a compatibility redirect to the current landing page. Serve the project root, not an individual role folder. Tests use their own isolated HTTP server and browser profiles.

## Main structure

```text
index.html                 Current cinematic landing page
landing/                   Landing styles, behavior and visual assets
about/ contact/ resources/ Public information and contact pages
auth/ errors/              Demo entry, password prototype and error views
worker/                    Four-step wizard, permits, tracking and profile
supervisor/                Operational review and active supervision
safety/                    Safety review, Command Center and controlled resume
admin/                     Final approval, activation/closure and organization UI
permit-verify/             Explicitly unverified QR reference view
shared/js/                 Repository, workflows, validation and shared UI
shared/css/                Tokens, themes, components and refinements
shared/locales/            English and Arabic dictionaries
shared/components/         Public navbar and footer templates
assets/ data/              Bundled fonts/vendor assets, QR images and demo data
docs/architecture/         Read-only interactive architecture viewer
docs/API-CONTRACT-v10.json Optional HTTP API proposal, not a connected service
docs/qa/phase4/             Required source-inventory.json regression fixture
tests/                     Permanent regressions, fixtures and browser helpers
archive/classic-home/      Frozen classic landing compatibility fixture
README.md                  User/developer entry point
AGENTS.md                  Engineering, safety and maintenance instructions
```

## Tests

From the project root:

```powershell
node --test tests/*.test.cjs
node --test tests/phase6-*.test.cjs
node tests/helpers/phase6-journey.cjs
```

Expected complete count: **405**, including 46 Phase 6 tests. A skipped browser test is not a fully verified run. Tests/helpers regenerate ignored evidence under `docs/qa/`; `source-inventory.json` remains a tracked test fixture. Existing safety assertions must not be weakened to obtain a pass.

## Documentation and delivery

`README.md` and [AGENTS.md](AGENTS.md) are the two primary project-owned Markdown documents. Historical release notes, Phase 1–6 QA reports and generated evidence were preserved with their original bytes in **SafePermit-v13.9-Historical-QA.zip**, delivered separately beside the project/release ZIP, and remain in Git history. The prior v24 documents are historical provenance, not a current release verdict. The Phase 4 historical baseline is `10a8de5`; Phase 5 is `a80b7bf`; Phase 6 is `67ef1b5`.

Delivery artifacts outside the repository:

- `SafePermit-v13.9-Final-Prototype.zip`: application, local assets/vendor files, configuration, tests and these two documents; excludes Git and generated QA history.
- `SafePermit-v13.9-Historical-QA.zip`: original reports/evidence and a SHA-256 manifest.
- `SafePermit-v13.9-Final-Verification/`: fresh verification logs, cleanup inventory, resource checks and packaging integrity evidence.

## Known prototype limitations

Roles/reviewer names are supplied locally; direct workspace URLs remain reachable. Browser data can be edited, evicted or lost, and cooperating Web Locks are not universal transactions. There is no authenticated backend, durable attachment upload, server clock or tamper-evident audit store. QR images/links remain DEMO/UNVERIFIED; readiness is not site work authorization. The optional HTTP adapter/OpenAPI document are integration seams only.

Manual screen-reader, Firefox/Safari, physical mobile, camera/print QR and site-specific PTW/HSE checks remain outside the executed automation. A Chromium desktop emulation is not a physical device test.

## Future integration roadmap

Preserve the existing PTW rules when connecting an authenticated backend with authoritative validation, versioned/atomic persistence and durable audit/files. Complete manual accessibility, browser/device and site-procedure acceptance checks before any operational use. No backend migration or deployment is part of this delivery.
