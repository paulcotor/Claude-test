# Personal Dashboard — Product Requirements Document

**Version:** 0.1 (draft)
**Status:** Proposed
**Owner:** Single user (product owner = sole user)
**Last updated:** 2026-05-09
**Inspired by:** "Rowan's Dashboard" Instagram reel (Rowan Thistlebrooke) — a personal command center built with Claude Code.

---

## 1. Vision

> *"Data lives where you look most often."*

A single web dashboard the owner opens every morning that aggregates the metrics he actually cares about — health, fitness, food, supplements, lab work, productivity, habits, hobbies, and time spent with his kid — into one calm, glanceable view.

The product is **not** a content-creator analytics tool. It is a private self-tracking system designed to:
- replace the daily ritual of opening 8+ apps,
- surface trends across weeks and months that are invisible inside individual apps,
- close the loop between intent (goals, habits, supplements) and outcome (sleep, recovery, lab markers),
- store medical and lab data that today gets lost between doctor visits.

Built with Claude Code as a learning + dogfooding project.

---

## 2. Target user

A single user — the product owner. Profile:

- Adult professional with a demanding workload.
- Parent of at least one child; tracks shared activities.
- Owns a Garmin device and an iPhone (Apple Health).
- Trains regularly (strength + cardio).
- Takes daily supplements and runs periodic lab panels.
- Comfortable with a web app on a laptop; not building this for anyone else.

There is no second persona. No collaborators, no family sharing, no public profile. Single-tenant, single-user, by design.

---

## 3. Problem statement

Today, the owner's data is fragmented across:

| Data | Lives in |
|---|---|
| Sleep, HRV, recovery, workouts (auto) | Garmin Connect |
| Steps, heart rate, mindfulness | Apple Health |
| Strength training logs | Notes app / spreadsheet |
| Food intake | Memory / occasional notes |
| Supplements | Pill organizer (no log) |
| Lab results | PDFs in email + paper folders |
| Tasks & goals | Todo app |
| Habits | Nothing systematic |
| Hobbies & kid time | Nothing systematic |

Consequences:
- No single morning view → important signals are missed.
- Lab results are forgotten between visits; trends are invisible.
- Supplement adherence is unmeasured.
- Time spent with the kid is felt but never tracked, so reflection is anecdotal.
- Cross-domain correlations (e.g. sleep ↔ workout volume, supplements ↔ lab markers) are impossible to see.

---

## 4. Goals

1. **One-glance morning view.** Open the laptop, see today's snapshot in <10 seconds.
2. **One source of truth.** Every domain above has a home in the dashboard.
3. **Trend visibility.** Weekly and monthly views for sleep, recovery, lab markers, supplement adherence, training volume.
4. **Low-friction logging.** Anything that requires manual entry must take <30 seconds per day.
5. **Long-term memory.** Lab results from years ago are still searchable and plotted.

---

## 5. Non-goals

- Not a multi-tenant SaaS. No sign-up flow, no billing, no public access.
- Not a medical device or diagnostic tool. It surfaces data; it does not give medical advice.
- Not a workout planner or coaching app. It logs what was done; it does not prescribe.
- Not a social network. No sharing, comments, or feeds.
- Not a replacement for Garmin Connect or Apple Health — it ingests from them.
- Not a mobile-native app in v1. Web-first, mobile-friendly responsive layout is enough.

---

## 6. Modules

Each module is described as: **purpose → key data → input method → integrations → MVP / v2**.

### 6.1 Productivity

- **Purpose:** Daily task list and weekly goals visible alongside health data so trade-offs are visible.
- **Key data:** open tasks, completed today, today's top 3 priorities, weekly goals, due dates.
- **Input:** manual entry in-app; optional import from a single external source later.
- **Integrations:** none in MVP.
- **MVP:** yes (lightweight todo + top-3-today).

### 6.2 Health metrics (wearables)

- **Purpose:** Consolidated daily sleep, recovery, HRV, resting HR, steps, and auto-imported workouts.
- **Key data:** sleep duration + score, HRV, resting HR, recovery indicator (Garmin Body Battery), steps, stress score, workouts from device.
- **Input:** automatic from Garmin Connect; periodic import from Apple Health export.
- **Integrations:**
  - **Garmin Connect** — OAuth + scheduled sync (every few hours).
  - **Apple Health** — Apple Health Export (XML/ZIP) uploaded periodically; ingestion pipeline parses and merges into the same metric tables.
- **MVP:** Garmin only. Apple Health → v0.2.

### 6.3 Fitness / Workouts (manual log)

- **Purpose:** Log strength training that wearables don't capture well — exercise, sets, reps, weight, RPE.
- **Key data:** session type (push / pull / legs / full body / cardio), exercises, sets × reps × weight, notes, PR flags, weekly volume per movement.
- **Input:** quick-entry form with most-recent-set autofill; templates per session type.
- **Integrations:** none required; cross-references Garmin workouts where they overlap.
- **MVP:** yes — quick-entry + last-week reference.

### 6.4 Food journal

- **Purpose:** Lightweight daily food log to see what was eaten, not to count macros to the gram.
- **Key data:** meals (free text or short list), optional macros/calories per meal, water intake, alcohol.
- **Input:** manual, mobile-friendly free-text + recent-meals quick add.
- **Integrations:** none in MVP. Optional macro lookup later via a food DB API.
- **MVP:** free-text journaling + water counter. Macros → v0.2.

### 6.5 Supplements

- **Purpose:** Daily checklist of supplements taken; show streaks and adherence.
- **Key data:** supplement name, dose, schedule (AM / PM / with food), taken-today checkbox, current streak, 30-day adherence %.
- **Input:** one-tap check per supplement; supplement list configurable in settings.
- **Integrations:** none.
- **MVP:** yes — adherence is a core motivator.

### 6.6 Lab results

- **Purpose:** Persistent home for blood work and other lab panels with long-term trend lines.
- **Key data:** marker name, value, units, reference range, lab date, lab source, notes.
- **Input:**
  - **Manual** — type values directly after seeing results.
  - **PDF upload** — drop a lab PDF, an LLM (Claude API) extracts structured `{marker, value, unit, range, date}`, the user reviews/confirms, then values are stored.
- **Integrations:** Claude API (or compatible LLM) for PDF parsing. No direct lab-provider API.
- **MVP:** manual input. PDF parsing → v0.2 (the most ambitious module).

### 6.7 Habits / streaks

- **Purpose:** Track recurring non-supplement habits (read 30 min, hydration, meditation, no-screen evenings).
- **Key data:** habit name, schedule, daily check, current streak, longest streak, 30-day rate.
- **Input:** one-tap check per habit per day.
- **Integrations:** none.
- **MVP:** yes.

### 6.8 Hobby / activities

- **Purpose:** Log non-fitness personal activities the owner wants more of (running for fun, cooking, music, reading sessions, side projects).
- **Key data:** activity name, duration, free-text notes, optional category tag.
- **Input:** quick-add ("started" / "finished" or just duration after the fact).
- **Integrations:** none.
- **MVP:** yes — minimal version.

### 6.9 Kid activities

- **Purpose:** Capture time and activities done with the child so the owner can reflect weekly on quality time. Single-owner perspective; the child is not a user.
- **Key data:** activity name, duration, location, free-text note, photo (optional, local only).
- **Input:** quick-add from phone or laptop.
- **Integrations:** none.
- **MVP:** yes — minimal text + duration. Photos → v0.2.

---

## 7. User stories

1. *As the owner, I want to open the dashboard in the morning and see last night's sleep, today's recovery, today's top 3 tasks, and which supplements are due — all in one screen.*
2. *As the owner, I want to log a strength workout in under 60 seconds without losing my last session's weights.*
3. *As the owner, I want to upload a lab PDF and have the values extracted, reviewed, and saved into my long-term marker history.*
4. *As the owner, I want to see a 90-day trend line for HRV, resting HR, vitamin D, and ferritin on the same screen.*
5. *As the owner, I want to know how many days this month I took all my supplements.*
6. *As the owner, I want a "kid time" tile that shows total minutes spent with my kid this week.*
7. *As the owner, I want a single weekly review screen that summarizes workouts, sleep, supplement adherence, top hobby hours, and kid hours.*
8. *As the owner, I want to add a new habit or supplement in settings without touching code.*

---

## 8. Information architecture

**Top-level navigation:**
- **Today** (default landing)
- **Health** (wearable metrics + trends)
- **Fitness** (workout log + history)
- **Food** (journal + water)
- **Supplements** (today + adherence)
- **Labs** (markers + uploads)
- **Habits**
- **Activities** (hobby + kid, two tabs)
- **Review** (weekly + monthly aggregates)
- **Settings**

**Today screen layout (high-level):**
- Top row: sleep score, recovery, HRV, resting HR (from Garmin).
- Middle row: today's top 3 tasks · supplements due · habits to check.
- Bottom row: yesterday's workout summary · kid minutes this week · streaks at risk.
- Sidebar: quick-add buttons (workout, food, hobby, kid activity).

**Drill-down:** every tile on Today is clickable and opens its module's full view with trends.

---

## 9. Tech architecture (high-level)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS | Fast to build with Claude Code; one codebase for UI + API routes; great defaults. |
| Charts | Recharts or visx | Trend lines per module. |
| Backend | Next.js API routes (server actions) | Co-located, single-user scale; no separate service needed. |
| Database | SQLite via Prisma (local file) | Single-user, embeddable, trivial backup. Migration path to Postgres if hosted later. |
| Auth | Single-user passphrase or local-only (no public exposure) | No multi-tenant flow needed. |
| Hosting | Local first (run on laptop or home server). Optional: a private Vercel deployment behind basic auth. | Privacy by default; cloud is opt-in. |
| LLM | Anthropic Claude API (lab PDF parsing) | Strong structured-extraction performance. |
| Background jobs | Simple cron or `node-cron` for Garmin sync | Single-user volume. |

**Folder shape (suggested):**
```
/app                # Next.js routes (today, health, fitness, ...)
/components         # UI primitives + module tiles
/server
  /integrations     # garmin, apple-health, claude
  /db               # prisma schema + migrations
  /jobs             # sync schedulers
/lib                # shared types + utilities
```

---

## 10. Integrations & data flow

### 10.1 Garmin Connect
- OAuth 1.0a (Health API) or unofficial library if Health API access is unavailable.
- Scheduled background pull every N hours into `health_metrics` table.
- Idempotent upsert by `(date, metric)`.
- **Risk:** Garmin Health API requires a developer agreement; fall back to community library or manual export if unavailable.

### 10.2 Apple Health
- No public realtime API. Flow:
  1. User exports Apple Health from iPhone (`Health → Profile → Export All Health Data` → ZIP).
  2. User uploads the ZIP into the dashboard.
  3. Server unzips, parses `export.xml`, ingests into the same `health_metrics` table, deduplicating against Garmin where overlap exists (Garmin wins for shared metrics).
- Quarterly cadence is acceptable.

### 10.3 Lab PDF parsing
1. User uploads PDF to `/labs`.
2. PDF is converted to text + page images.
3. Sent to Claude API with a schema-constrained prompt requesting `{marker, value, unit, reference_range_low, reference_range_high, date, source}` array.
4. UI shows extracted rows; user edits/confirms; confirmed rows are written to `lab_markers`.
5. Original PDF stored alongside for audit.

### 10.4 No social media integrations
Explicitly excluded from this product. Out of scope.

---

## 11. Data model (sketch)

- `tasks(id, title, priority, due_date, completed_at, created_at)`
- `goals(id, title, period, target, progress, created_at)`
- `health_metrics(date, metric_key, value, source)` — narrow table, one row per (date, metric)
- `workouts(id, date, type, notes)` and `workout_sets(workout_id, exercise, set_number, reps, weight, rpe)`
- `food_entries(id, date, meal, text, calories?, macros?)`
- `water_log(date, ml_total)`
- `supplements(id, name, dose, schedule)` and `supplement_log(supplement_id, date, taken)`
- `lab_panels(id, date, source, pdf_path)` and `lab_markers(panel_id, name, value, unit, range_low, range_high)`
- `habits(id, name, schedule)` and `habit_log(habit_id, date, done)`
- `activities(id, date, kind=hobby|kid, name, duration_min, notes)`

---

## 12. Success metrics

- **Daily-open rate:** opened ≥6 of 7 days/week after week 2.
- **Time to first useful glance:** <10 seconds from opening the laptop to seeing today's snapshot.
- **Logging friction:** workout log <60s, supplement check-in <10s, habit check-in <10s.
- **Supplement adherence visibility:** adherence % for the current month is always on the Today screen.
- **Lab memory:** 100% of new lab panels stored in the dashboard within 1 week of receiving them.
- **Trend coverage:** ≥90 days of Garmin data visible in Health by end of month 1.

---

## 13. MVP (v0.1) scope

In scope for first usable build:
- Today screen with stub tiles for every module.
- **Productivity** — tasks + top 3 today.
- **Health** — Garmin sync + trend charts.
- **Fitness** — manual workout log with last-session autofill.
- **Supplements** — daily checklist + adherence %.
- **Habits** — daily checklist + streaks.
- **Settings** — manage supplement list, habit list, Garmin auth.

Deferred to v0.2:
- Apple Health export ingest.
- Lab PDF parsing (manual lab input only in v0.1).
- Food macros lookup.
- Kid-activity photos.
- Weekly Review screen with auto summary.

Deferred indefinitely (until needed):
- Mobile native app.
- Cloud hosting / multi-device sync.
- Sharing or export beyond local backup.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Garmin Health API access denied | Use community library or fall back to manual Garmin export ingestion. |
| Apple Health export friction (manual quarterly) | Accept it; document the workflow in Settings; show "last imported" date. |
| LLM PDF parsing inaccuracy on labs | Always require user review before write; store original PDF; allow re-parse. |
| Scope creep across 9 modules | Strict v0.1 cut: only 5 modules ship; the rest are stubs. |
| Self-hosted data loss | Daily SQLite file backup to a second location (cloud drive or external disk). |
| Health data privacy | Local-first; if hosted, behind basic auth + HTTPS; no third-party analytics in the product. |

---

## 15. Open questions

1. **Hosting:** stay local indefinitely, or deploy privately on Vercel/Fly.io for access from phone browser?
2. **Mobile:** is responsive web enough, or is a PWA install on the iPhone home screen worth the extra polish in v0.2?
3. **Backup:** cloud drive sync of the SQLite file, or a simple nightly export script?
4. **Notifications:** do we want morning/evening reminders for supplements and habits in v0.2?
5. **Auth model:** local-only (no auth) vs. single-passphrase, given the dashboard may end up exposed to the home network?
6. **Lab reference ranges:** use the lab's printed ranges, or maintain a personal preferred-range table that overrides them?

---

## 16. Out of scope (explicit)

- Social media analytics (TikTok / Instagram / YouTube). The owner is not a content creator.
- Multi-user support, sharing, family accounts.
- Coaching, prescription, or diagnostic features.
- Real-time push from Apple Health (not technically available without an iOS companion app).
- Replacing Garmin Connect or Apple Health as primary capture devices.
