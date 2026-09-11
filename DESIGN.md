# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-09-11
- Primary product surfaces: `leetcode/progress-dashboard`, especially `/review`.
- Evidence reviewed: dashboard `README.md`, `app/components/Dashboard.tsx`, `app/globals.css`, `app/lib/types.ts`, `leetcode/progress.csv`, and the user's request for one topic per day and recall cards.

## Brand
- Personality: quiet, focused, direct Chinese study companion.
- Trust signals: exact catalog coverage, visible dates, source links, honest distinction between recall and independent coding.
- Avoid: celebrations that imply mastery from merely opening a solution; decorative dashboards competing with the question.

## Product goals
- Goals: review one category each day from September 12; recall from title and task before revealing the approach; keep self-assessments across reloads.
- Non-goals: new exercises, mixed daily spaced-review queues, automatic changes to coding mastery.
- Success signals: 100 unique cards; 97 scheduled problems plus 3 historically retired; front hides all answer material; ratings survive reload; schedule can be browsed in advance.

## Personas and jobs
- Primary persona: a Python learner who has attempted all 100 catalog problems.
- Jobs: remember the model, explain the steps and boundaries, then independently rewrite weak problems.
- Contexts: desktop study, mobile quick recall, previewing tomorrow's category.

## Information architecture
- Navigation: existing dashboard links prominently to `/review`; review page links back to the dashboard.
- Screens: daily category/card workspace, full dated plan, searchable 100-card library.
- Hierarchy: date/category -> question title and prompt/example -> recall draft -> reveal -> model/steps/pitfalls/complexity -> self-rating/next.

## Design principles
- Recall before recognition: hide answers until an explicit reveal, and reset reveal when changing cards.
- One category per day: weak-card repetition stays inside the selected category.
- Self-assessment is a memory aid; coding mastery still requires an actual code attempt.
- Assumption: fixed calendar schedule, selectable days for catch-up, around 45–75 minutes daily; no new reminders or scheduled jobs.

## Visual language
- Reuse existing CSS variables, dark/light themes, panel radii, green primary actions, amber/red secondary feedback.
- Use existing system Chinese fonts, restrained uppercase eyebrow text, 8px spacing rhythm, generous question typography.
- Prefer a stable reveal panel over animated 3D flips; no required imagery.

## Components
- Reuse `panel`, `primary-button`, `secondary-button`, brand and theme tokens.
- New: review workspace, daily/category selector, prompt card, answer panel, three recall ratings, progress list, dated schedule, search and weak-card filter.
- Ownership: review-specific styles live with the review route; no parallel design-system dependency.

## Accessibility
- Target: WCAG 2.2 AA principles; native labeled controls, visible keyboard focus, text labels with every color.
- Revealing uses `aria-expanded`/`aria-controls`; answer is absent from the visible tree until requested.
- Previous/next and self-rating work without shortcuts; keyboard shortcuts must ignore typing in input/textarea/select.
- No motion required; long text wraps and never relies on hover.

## Responsive behavior
- Desktop: compact category rail beside a spacious card; mobile: stacked controls and full-width card.
- Verify at 390px and a desktop viewport; touch targets at least 44px.

## Interaction states
- Loading: hydrate browser recall records before enabling grading.
- Empty: explain no matching cards and offer clear filter/reset action.
- Error: storage failures show unsaved warning while allowing practice and export.
- Success: rating feedback and completion count; last card offers same-category weak-card repetition.
- Disabled: rating before reveal; previous/next at ends; no false wraparound completion.
- Slow network: card data bundled locally; official question links are optional.

## Content voice
- Short concrete Chinese; prompts are clearly labeled paraphrased task summaries with original question links.
- Ratings: 会了 / 模糊 / 忘了, explicitly labeled as oral recall.
- Do not reveal algorithm names in prompt wording; date/category may necessarily indicate the broad topic.

## Implementation constraints
- Existing React/TypeScript/vinext, native CSS and browser storage; no new dependencies.
- Preserve historical CSV/attempt status and the completed September 11 plan.
- Store the full future plan in one JSON document consumed by the website; documentation mirrors it.
- Browser-local ratings with JSON export; no unauthenticated write API or automatic Git pushes from browser interactions.
- Validate coverage, date selection in Asia/Shanghai, rating serialization, filters, reveal/next behavior and persistence; run existing lint/typecheck/build/tests and browser smoke checks.

## Open questions
- None blocking. Later explicit user instructions may change daily workload or reinstate retired problems.
