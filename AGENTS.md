# SafePermit v13.9 — Engineering and safety guidance

This file and [README.md](README.md) are the maintained primary documentation. The delivery baseline is Phase 6 commit `67ef1b5c9ed535ac30a84ece5fc701d949183e05`. Earlier version/release notes are historical and are preserved in the external `SafePermit-v13.9-Historical-QA.zip` and Git history.

## Architecture and module structure

The application is static HTML5/CSS3/vanilla JavaScript with role/feature folders. Each feature normally contains `index.html` and a local CSS/JS file. Public landing code lives in `landing/`. `home-preview.html` redirects to the current root landing while preserving query/hash. `archive/classic-home/` is a frozen compatibility fixture and is intentionally retained.

| Module | Responsibility |
| --- | --- |
| `shared/js/data-adapter.js` / `SafePermitData` | Canonical demo permit collection; create-only ID allocation; shared Basic Info/count validators; review decisions and evidence; repository promises/cooperative write lock. |
| `shared/js/safety-workflow.js` / `SafePermitWorkflow` | Integrated safety blockers, SIMOPS overlap, Stop-Work, resume requests and explicit HSE decisions. |
| `shared/js/safety-suite-store.js` / `SafePermitSafety` | Command Center gates, stop cases, risks, zones, conflicts, indicators, isolations, passports, incidents and actions. |
| `shared/js/incident-workflow.js` | Incident/action evidence and closure constraints. |
| `shared/js/risk-engine.js` | Shared demo risk scoring and categories. |
| `shared/js/permit-status.js` | Separate lifecycle, validity, evidence and blocker interpretations; status strings alone do not authorize work. |
| `shared/js/permit-draft.js` | Basic Info explicit recovery, debounced recovery envelope, stale/context/cross-tab protections, failure/unload feedback and consumed-draft receipts. |
| `shared/js/wizard-save-state.js` | Risk/Checklist Unsaved/Saving/Saved/Failed state, persistence exceptions, edit invalidation and continuation/unload protection. |
| `shared/js/suite-editor.js` / `completion-dialog.js` | Keyboard/focus/inert/dirty/pending protections for editors and completion dialogs. |
| `shared/js/permit-context.js` / `permit-qr.js` | Selected-record/return-path context and reference-only QR dialogs; never substitute unrelated IDs. |
| `shared/js/nav-config.js` / `session-sidebar.js` | Role navigation, groups, localized labels, contextual badges and mobile behavior. |
| `shared/js/shared.js`, `paths.js`, `app-shell.js` | Shared shell/components, project-root paths and role workspace presentation. |
| `shared/js/i18n.js`, `shared/locales/{en,ar}.json` | Local bilingual strings and RTL/LTR updates. |
| `shared/js/cockpit/`, dashboard helpers | Read-only dashboard summaries from stored records, with no invented counts or approvals. |
| `shared/js/ai-role-assistant.js` and Worker AI UI | Deterministic local advisory analysis. AI never approves, activates or authorizes work. |
| `shared/js/http-repository.js` | Optional unconfigured transport factory; no backend is connected. |

`docs/API-CONTRACT-v10.json` is a proposal with generic/unfinished schema areas, not a deployed contract. The interactive viewer at `docs/architecture/` is documentation only. Navbar/footer templates are fetched from `shared/components/`; local fonts/vendor/assets must remain available without installing dependencies.

## Coding conventions

- Preserve vanilla HTML/CSS/JS and existing script order/globals. Do not add a framework or dependency without a concrete authorized requirement.
- Prefer small shared utilities for repeated behavior. Keep role-specific page logic with its feature. Maintain promise/error behavior at repository boundaries.
- Use native controls, explicit labels and safe `textContent` for untrusted data. Escape any necessary HTML interpolation and encode record IDs in URLs. Keep existing XSS, context and return-path tests.
- Never report success before persistence completes. Retain user inputs on failure and provide an actionable retry. Pending and completed guards prevent duplicate consequential operations.
- Do not refactor safety logic, rename persisted keys or change stored schemas as incidental cleanup. Preserve backward-compatible reads and meaningful user metadata; do not invent missing safety evidence.
- Keep application routes, bundled resources and relative/root path helpers working when served from the project root or a supported deployment subpath. Use HTTP serving, not `file://`.

## PTW business and safety invariants

### Validation and submission

The established worker range is **1–50**. `SafePermitData.validateWorkerCount` and `validateBasicInfo` are the shared gates for current Basic Info, including required fields and end-after-start/date/time validity. Do not guess a different limit or silently mark restored data valid. Basic Info retains field errors, error associations, summary and first-invalid focus.

Draft saving/recovery may retain incomplete or invalid data. It is not certification. Final Submit must read and validate current draft values; checkbox confirmation or previous Continue success is insufficient. Canonical create/resubmit, approvals and activation also enforce their applicable validation. Preserve the exact Edit → 51 → Save Draft → Back → Submit regression.

Worker creation uses `repository.createPermit`, never generic upsert. Corrections require a live Returned-for-Correction record, retain history/audit, increment revision, archive the previous review cycle and clear current Supervisor/Safety/Admin decisions before returning to Pending Supervisor Review. A stale correction cannot reset Stopped or already-resubmitted work. Validation/write failure must not partially replace the canonical record or delete drafts.

### Ordered review and role rules

| Workspace role | Permitted prototype responsibility |
| --- | --- |
| Worker | Create/submit, correct returned permits, track/reference work; no reviewer approval or activation. |
| Supervisor | Decide only at Pending Supervisor Review; approval advances to Pending Safety Review. |
| Safety Officer | Decide at Pending Safety Review; approval advances to Pending Admin Approval; manage HSE safety evidence and controlled resume. |
| Administrator | Decide at Pending Admin Approval; approval produces Approved, separately activate eligible Approved records and close Active records. |

Reviewers may Approve, Return for Correction or Reject through the existing stage rules. Preserve permit-linked decision evidence: correct role and previous/new stages, reviewer, rationale, valid timestamp, chronological ordering and current-cycle dates. No role skips another stage. Final Admin approval is distinct from activation.

These are simulated frontend responsibilities, not authenticated permissions. Demo email/quick-role selection, path-derived role context, typed reviewer names and navigation visibility do not establish identity or deny direct URL access. A backend must authenticate the actor and enforce organization/site/assignment authorization for every resource and transition. Do not claim otherwise.

### Risk, checklist and integrated blockers

The existing demo risk scale is 1–25: Low 1–4, Medium 5–9, High 10–16, Critical 17–25. Approval requires complete hazard/control evidence and residual risk both **below 10 and lower than initial risk**. Never accept a missing score as a safe low risk or replace meaningful submitted assessments with a sample.

Preserve permit-linked confirmed checklist evidence, valid answers and required controls, plus the wizard's mandatory checks. Keep integrated safety clearance, verified gates, LOTO/isolation requirements, passport/competency validity, unresolved SIMOPS and Stop-Work blockers. Corrupt/unverifiable safety storage fails closed. Closing incidents/actions requires their existing evidence; counts alone are not universal activation blockers.

### Activation, expiry, Stop-Work and resume

Admin activation rereads the canonical record and current expiry, requires Approved plus coherent three-role approvals, valid Basic Info, acceptable risk, completed checklist and integrated safety clearance. A previously ready UI snapshot must not bypass changed data/blockers or a failed write. Existing-record persistence checks current and proposed Basic Info before transitioning to Active. Expired, incomplete-time, Stopped or otherwise ineligible work cannot be activated by a status label or lifecycle cache.

Stop-Work persists a linked stop case and canonical Stopped state, preserving prior stage/audit. Closing the stop case alone never resumes the permit. Resume requires closed stop cases, a rationale, an explicit pending request and an HSE reviewer/evidence decision with current blockers cleared. No decision is preselected. Rejection remains Stopped. Approval for formerly Active work returns to **Pending Safety Review**, never directly Active. Other stages follow the existing controlled-resume rules.

Keep lifecycle, date validity, approval evidence and safety blockers separate. QR, AI, animations and green readiness messages do not constitute live work authorization.

## Permit ID integrity

- IDs are allocated only through the create-only boundary. Existing submitted/latest/legacy records, lifecycle entries, linked safety/orphan references and reserved bundled IDs must participate in collision checks.
- `PTW-1000` through `PTW-1200` are reserved for bundled references. Automatic allocation has checked random attempts and a bounded unused-ID fallback; exhaustion fails without inventing a timestamp ID.
- Explicit duplicates/reserved IDs reject before writes. A new submission never merges into or overwrites a Stopped/Active/Approved/Expired/Closed record or inherits its approvals/audit/Stop-Work state.
- Preserve strict storage snapshots, two-key rollback and cooperative same-origin repository locks. Keep collision, concurrency, namespace-exhaustion and complete stored-byte preservation tests.

## Browser storage and critical constraints

Canonical demo keys include `safePermitSubmittedPermits`, `safePermitSubmittedPermit` and legacy `safePermitPermits`. Safety records use `safepermit:safety-suite:v1:*`; the lifecycle compatibility cache is `safePermitAdminLifecycle`. Basic/Risk/Checklist draft keys and Basic Info recovery/receipt metadata remain browser-local UX data.

LocalStorage is mutable, quota-limited, evictable and origin/port-specific. Readback does not establish durable persistence. Web Locks coordinate cooperating same-origin async writers where supported, not legacy synchronous callers, noncooperating code, other origins/devices or crashes. There is no universal compare-and-swap or cross-record transaction. Never reset user storage to hide a validation/collision/corruption problem or as a code rollback shortcut.

Attachments remain page-local; no durable upload or retention is implemented. The API proposal/adapter do not supply server validation, authorization, trusted timestamps, transactionality or immutable audit. Future integration must supply those guarantees independently. Keep advisory AI local unless an authorized integration supplies a secure boundary; do not expose API keys or give AI decision authority.

## Accessibility and design-system rules

Preserve the existing navy/ink/orange identity, logo artwork and tokens in `shared/css/tokens.css`, with `refinement.css`, `theme.css` and landing styles. Use current sources over older archived brand guides: Manrope UI, Barlow Condensed display, Tajawal Arabic; bundled fonts only. Existing token aliases remain compatible. Orange primary fills use the approved dark foreground for readable contrast.

Keep visible focus, native keyboard activation, meaningful localized names, responsive navigation, EN/AR and RTL/LTR. Dialogs require sensible initial focus, contained Tab/Shift+Tab, Escape handling, inert background and safe restoration. Dirty editors require Keep/Discard behavior; pending saves cannot be dismissed as if completed. Preserve `aria-invalid`, error descriptions/summaries and focus on the first invalid Basic Info field.

Use accessible status/error live feedback without stale green success. Respect `prefers-reduced-motion` in CSS, JS timers and validation scrolling. Do not hide safety feedback behind animation or introduce a redesign as maintenance. QR stays explicitly DEMO/UNVERIFIED, uses the actual selected ID and provides honest fallback when no image exists.

## Testing instructions

Run from the project root with Node 22+ and installed Chrome/Edge (`CHROME_PATH` optional):

```powershell
node --test tests/*.test.cjs
node --test tests/phase6-*.test.cjs
node tests/helpers/phase6-journey.cjs
```

The complete verified baseline is **405 tests**, zero skips/failures; 46 are Phase 6 regressions. A skipped browser test is not a fully verified run. Browser tests use disposable profiles and a local static server, never valuable user data. Preserve all safety/XSS/assertion coverage; complete positive fixtures rather than weakening a safety gate. Investigate real failures and distinguish harness setup/timeouts from product behavior.

The optional journey exercises all ten actual checklist items and valid 50-worker creation, ordered reviews, LOTO, activation, Stop-Work and HSE resume. It deliberately injects a test-only requires-LOTO flag; this is not a new Worker input. The original 51-worker test must actually enter/save 51 before asserting prevention.

Generated logs/screenshots/observations go under ignored `docs/qa/` directories, created by their test/helper. **Keep `docs/qa/phase4/source-inventory.json` tracked**: it is the required 50-document regression fixture, not disposable evidence. Keep permanent tests, helpers, synthetic fixtures, vendor notices/assets, configuration and the classic-home fixture. Do not delete them during cleanup.

Before delivery, run the full suite after documentation changes, check local resources/links and syntax, inspect intended diffs and build the ZIP outside the repository from committed tracked files. Exclude Git, generated evidence, caches and machine files. Preserve historical QA externally before removing redundant reports; verify archive hashes/ZIP integrity and the extracted package. No push, deployment, merge or tag is implied by local delivery.

## QA history and commit references

| Milestone | Commit | Scope |
| --- | --- | --- |
| Original baseline | `d634f37f47607da9a8f64ec7bb9954b77df48aa9` | Before accessibility remediation. |
| Phase 1 | `a3432445c97874d9b30b97f901924564af347f86` | Contrast, editor keyboard behavior, Basic Info accessibility/reduced motion. |
| Phase 2 | `c169eadc8ba28bcb488dfcc27d775f977b096157` | Role navigation, contextual QR and safe return paths. |
| Phase 3 | `8b819f7c42185258981ea32a781a01fa32a7bc09` | Explicit draft recovery and operational readiness/resume UX. |
| Phase 4 | `10a8de55dd8a367990134bebed00c83ba3c22c87` | Unified visual system; historical 316-test baseline. |
| Phase 5 | `a80b7bfd8a88eebca34b2da93fd922a3c0669e21` | Create-only identity integrity, completion accessibility and truthful recovery/notification behavior; 359 tests. |
| Phase 6 | `67ef1b5c9ed535ac30a84ece5fc701d949183e05` | Shared validation and reliable Risk/Checklist save states; 405 tests. |

Phase 5's independent audit found N01/P1 (51-worker Edit/Save/Back submission/activation bypass) and N02/P2 (stale success after a failed Risk/Checklist save). Phase 6 records their red-before/green-after regressions. Final delivery independently replays these original scenarios plus ID collision and the valid 50-worker lifecycle. Historical v24 claims are not a current acceptance verdict. Full original reports/evidence, removal manifests and fresh verification records are delivered in the separate historical archive/verification directory described in README.

Manual screen-reader announcements, Firefox/Safari, physical devices, actual QR camera/printing and site-specific PTW/HSE procedure acceptance remain unexecuted unless separately documented. A stable frontend verdict is limited to the executed prototype scope and never implies production readiness or industrial safety certification.
