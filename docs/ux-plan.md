# Coffee Chat Product, UX & Information Architecture Plan

**Status:** Canonical UX/IA Redesign Blueprint (2026-11-24). Supersedes the 17-line reskin memo from commit `5015314`. Complements [docs/intent.md](intent.md), [docs/spec.md](spec.md), [docs/engineering/mvp-redesign/spec.md](engineering/mvp-redesign/spec.md), and [docs/acceptance/first-loop/spec.md](acceptance/first-loop/spec.md).

---

## 1. Why Commit `5015314` Failed & How This Redesign Solves It

Commit `5015314` attempted to turn a protocol console into a consumer product by renaming headers (`My Roastery` → `My Table`, `Source Compare` → `Tables`), adding a demo seed, and wrapping clipboard snippets in dialogs. An inspection of the codebase shows **nine structural UX/IA failures** that prevented it from working as a real daily service:

1. **Inconsistent vocabulary & leaked protocol syntax:** Pages mixed `"Take"`, `"Perspective"`, `"Bean"`, `"Shelf"`, and `"Saved Voices"`, while clipboard handoff dialogs exposed raw MCP tool syntax (`compare_perspectives(url="...")`, `list_beans(scope="public", ownerHandle="...")`, `scope="public"`) directly to end users.
2. **Flat `/me` list hiding existing relational & revision power:** `getBean` already returns full `bean_revisions` history for owners, and `packages/core` models `supersedes`, `refines`, and `tensions_with` relations—yet `/me` rendered a flat searchable list with no lifecycle grouping, no revision timeline, and no tension-resolution flow.
3. **Monolith 9-field capture form:** Marketed as "10-second capture", the form forced every author to complete a single-origin field, title, take, trade-off (with 4 static starter strings), and boundary all at once, while omitting multi-origin support (core supports 1–8 origins).
4. **Prompt-copy illusion instead of real AI connection awareness:** Clicking `"Use in my AI"` only copied static text. Pages never checked whether the user held an active connected AI grant (`oauth_grants`) or guided them from connection → first capture → first decision reuse.
5. **Zero stats or reflection insights:** Neither owners nor visitors saw any breakdown of judgment domains (`tags`), reading vs work balance, AI-captured vs web-captured ratio, revision momentum, unresolved tensions, or table contributor activity.
6. **Non-hydrated Saved/Shelf state on browse pages:** Server pages (`/`, `/@[handle]`, `/sources/[id]`) initialized `savedIds` / `savedPerson` to empty client state (`[]` / `false`), causing saved items to appear unsaved on every page reload. Saved individual takes in `/me` also dropped their `tradeoff` preview and source-table link.
7. **Missing explicit provider account-linking UI:** `/me` Settings rendered `Unlink` buttons (even on the last login method) with zero UI to link GitHub or Google accounts, while Better Auth's `accountLinking.enabled: false` blocked both implicit merging and explicit `/api/auth/link-social` callbacks.
8. **Empty production `/` & client-only filtering:** When `COFFEE_CHAT_SEED_DEMO` was off (production default), `/` rendered empty. Even when populated, Home loaded only 12 recent public items and filtered solely in browser memory.
9. **Shallow card comparison without personal stance awareness:** `/sources/[id]` stacked cards in a grid without structured axis-by-axis comparison and never told a signed-in user whether they already held a private or public take on that same URL.

### Point-by-Point Differentiation Matrix (`5015314` vs Redesigned Service)

| Dimension | Commit `5015314` | Redesigned Coffee Chat Service | Why Users Return (Retention Loop) |
|---|---|---|---|
| **Mental Model & Copy** | Inconsistent Bean/Take/Shelf labels + leaked MCP function calls in handoff prompts | **Two-Tier Coffee Chat Vocabulary**: signature Coffee Chat terms (**Bean**, **Roast**, **Brew**, **My Roastery**, **Tasting Notes**, **Shelf**, **Tables**) paired with subtle plain-language sub-labels underneath (*Confirmed take*, *Capture & confirm*, *Apply in my AI*, *Personal workspace*, *Stats & insights*, *Saved voices & takes*); zero protocol/tool syntax anywhere | Distinctive brand soul with zero learning curve: feels unmistakably like Coffee Chat while staying immediately self-explanatory |
| **Capture Flow** | 9-field single-origin monolith form up front | **Progressive 2-Stage Roast** (*Quick Spark* → *Roast & Confirm*), 1–8 origins (*Reading Origin* or *Work Origin*), private by default | Lowers capture friction while reading or mid-task while preserving full JCS confirmation |
| **Personal Workspace (`/me` — My Roastery)** | Flat card list with `All/Private/Public` filter | **My Roastery** (*Personal judgment workspace*) grouped by decision domain (`tags`), origin kind, and lifecycle (`Active`, `In Tension`, `Superseded`, `Private`), with inline **Roast Log** (*Revision timeline*) & **Tension/Supersession Resolution** | Daily utility: resolves contradictions, tracks how thinking evolved, and keeps active AI criteria sharp |
| **AI Integration (Brew)** | Static clipboard prompt modal ignoring actual connection state | **Live Brew Readiness** driven by real `oauth_grants` status + plain-language **Brew** (*Apply in my AI*) handoffs + 30-second host setup on `/connect` (**Brew Setup**) | Users see at a glance which AI hosts carry their live Beans and get immediate payoff in real tasks |
| **Stats & Insights (Tasting Notes)** | Two raw count badges (`public` / `private`) | **Tasting Notes** (`/me?tab=insights` — *Personal stats & insights*: `StatCard` KPIs, domain distribution `Chart` + `Progress`, origin/capture mix, Roast Log & tension health, AI hosts, Shelf) + strictly public-only **Table & Profile Tasting Notes** | Reflection loop: shows blind spots (e.g., all reading, zero work calls; unresolved tensions; thin domains) |
| **Sharing & Comparison (`/sources/[id]` — Tables)** | Unstructured card grid; ignores signed-in user's private stance | **Axis-by-Axis Table Matrix** (Origin Quote → My Take → Trade-off → Boundary) + **Your Stance Banner** (private or public) + `work_episode` redaction gate | Makes disagreements concrete and actionable before deciding whether to put a Bean on the Table or keep it Private |
| **Shelf & Discovery (`/`, `/@[handle]`)** | Unhydrated save buttons; client-side 12-item search; blank when unseeded | **Live-Hydrated Shelf** (*Saved voices & takes*) across all pages; server-backed search & pagination; purposeful unseeded onboarding on `/` | Returning visitors find their Shelf intact, discover new public Tables, and never hit dead ends |
| **Account & `@openboa/yogurt` Foundation** | Unlink-only accounts; `.cc-*` custom CSS; `<Link><Button>` markup; `app/` excluded from `yogurt check` | Explicit GitHub/Google linking + last-method guard; full `@openboa/yogurt` layout/stats primitives; `apps/web/src/app/` covered by `yogurt check` | Clean, accessible, theme-aware (`auto`/`light`/`dark`) interface with zero custom CSS debt |

### The Repeat-Use Retention Loop

1. **Roast in context:** While working with an AI host (or reading on the web), a user roasts a quick decision call or excerpt as a private spark and confirms the key trade-off and boundary into a **Bean** (*Confirmed take*).
2. **Accumulate & resolve in My Roastery:** On `/me`, new Beans land in decision domains. When two Beans conflict (`In Tension`) or a newer decision replaces an older one (`Updated Mind`), **My Roastery** surfaces the unresolved tension and full **Roast Log** (*Revision timeline*) so personal criteria stay coherent.
3. **Reflect via Tasting Notes:** `/me?tab=insights` (**Tasting Notes** — *Personal stats & insights*) shows which domains are well-covered, whether insights come mostly from reading or real work calls, and how many confirmed Beans are ready to Brew.
4. **Brew in real work:** Because an AI host is connected via `/connect` (**Brew Setup**), the user's active confirmed Beans (plus saved voices on their **Shelf**) shape real work decisions without repeating past corrections.
5. **Compare on Tables & share selectively:** When reading a widely discussed link (`/sources/[id]`), the user sees how their private or public Bean compares axis-by-axis with other voices at the Table—and puts a Bean **On the Table** (*Shared publicly*) only when they explicitly choose (with mandatory redaction confirmation for Work Origins).

---

## 2. Two-Tier Coffee Chat Terminology System (Signature Term + Subtle Sub-Label)

Coffee Chat preserves its distinctive brand identity without sacrificing immediate clarity by pairing **Coffee Chat signature terms** (prominent primary label) with **subtle plain-language sub-labels** right underneath them. Raw protocol, database, and MCP syntax remain strictly prohibited on every user surface.

### 2.1 Dual-Label Vocabulary Table

| Internal / Core Concept | Primary Label (Coffee Chat Voice) | Subtle Sub-Label (Plain-Language Underneath) | Strictly Prohibited on User Surfaces |
|---|---|---|---|
| `Bean` | **Bean** | *Confirmed take* | `"Bean record"`, `"payload"`, `"entity"` |
| Capture / Create flow | **Roast** (*Roast a Bean*) | *Capture & confirm a take* | `"prepare_bean"`, `"save_bean"` |
| AI application (`Brew`) | **Brew** (*Brew in my AI*) | *Apply in my AI* | `list_beans(...)`, `compare_perspectives(...)`, `scope="public"`, `ownerHandle="..."` |
| `/me` personal hub | **My Roastery** | *Personal judgment workspace* | `"RoasteryClient"`, `"dashboard"` |
| `/me?tab=workspace` | **My Beans** | *Workspace & history* | `"beans table"` |
| `/me?tab=insights` | **Tasting Notes** | *Personal stats & insights* | `"analytics"`, `"telemetry"` |
| `/me?tab=saved` (`shelf_items`) | **Shelf** | *Saved voices & takes* | `"shelf_items"`, `"reference table"` |
| `/me?tab=settings` | **AI & Account** | *Connected AI apps & sign-in* | `"OAuth 2.1 grant"`, `"grantId"`, `"PKCE"`, `"DCR"` |
| `/connect` | **Brew Setup** | *Connect your AI apps* | `"MCP server config"`, `"Streamable HTTP"` |
| `/sources` & `/sources/[id]` | **Tables** / **Table** | *Compare takes on a source* | `"Source Compare"`, `"originId"` |
| `source_excerpt` | **Reading Origin** | *From something I read* | `"source_excerpt"`, `"normalizedUrl"` |
| `work_episode` | **Work Origin** | *From a call I made at work* | `"work_episode"`, `"episodeSummary"` |
| `take` | **My Take** | *What clicked for you* | `"interpretation field"` |
| `tradeoff` | **Trade-off** | *What mattered more* | `"tradeoff field"` |
| `boundary` | **Boundary** | *When it doesn't apply* | `"withhold boundary"` |
| `uncertainty` | **Open Question** | *What's still uncertain (optional)* | `"uncertainty field"` |
| `tags` | **Domains** | *Decision topics* | `"jsonb tags"` |
| `visibility = private \| public` | **Private** / **On the Table** | *Only me & my AI* / *Shared publicly* | `"visibility enum"` |
| `supersedes` | **Updated Mind** | *Replaces an earlier Bean* | `"supersedes edge"` |
| `refines` | **Refined** | *Builds on an earlier Bean* | `"refines edge"` |
| `tensions_with` | **In Tension** | *Conflicts with another Bean* | `"tensions_with edge"` |
| `bean_revisions` | **Roast Log** | *Revision timeline* | `"bean_revisions"`, `"revisionNumber"` |
| `agent_attested` / `ui_attested` | **AI-Roasted** / **Web-Roasted** | *Captured in AI* / *Written on Web* | `"agent_attested"`, `"ui_attested"`, `"JCS digest"` |
| Copyable AI handoff prompt | Natural human sentence (e.g., *"Check my Coffee Chat Beans on this topic and apply the relevant trade-offs—respect each boundary."*) | Context label beneath button (*Works with your connected AI*) | `list_beans(...)`, `compare_perspectives(...)`, `prepare_bean`, `scope="public"`, `ownerHandle="..."` |

### 2.2 Dual-Label Rendering Rules in `@openboa/yogurt@0.2.0-local.1`

Sub-labels use `@openboa/yogurt`'s native secondary-text slots and muted tokens—never custom `.cc-*` CSS:
- **Page Headers (`PageHeader` from `@openboa/yogurt/top`):** `title` holds the Coffee Chat primary term (e.g., `"My Roastery"`, `"Tasting Notes"`, `"Tables"`, `"Brew Setup"`); `detail` (or `subtitle`) renders the subtle plain-language sub-label directly underneath (e.g., `"Personal judgment workspace"`, `"Personal stats & insights"`, `"Compare takes on a source"`).
- **My Roastery Sidebar (`SidebarItem` from `@openboa/yogurt/sidebar-layout`):** `label` holds the Coffee Chat term (`"My Beans"`, `"Tasting Notes"`, `"Shelf"`, `"AI & Account"`); `0.2.0`'s native `description` prop renders the subtle plain-language sub-label right beneath each expanded sidebar item (`"Workspace & history"`, `"Personal stats & insights"`, `"Saved voices & takes"`, `"Connected AI apps & sign-in"`).
- **Cards, Section Headers & List Rows (`Card`, `ListHeader`, `ListRow`):** `title` holds the Coffee Chat term; `description` (`Card`, `ListRow`) or `detail` (`ListHeader`) displays the plain-language sub-label right beneath it.
- **KPI Metrics (`StatCard` from `@openboa/yogurt/motion-stat-card` & `Count`):** `label` holds the Coffee Chat metric name (e.g., `"Beans"`, `"Shelf"`); `detail` renders the small plain-language explanation underneath (e.g., `"Confirmed takes · 12 private, 4 public"`).
- **Form Fields (`TextField`, `Textarea`, `Select`):** `label` holds the primary field title (`"My Take"`, `"Trade-off"`, `"Boundary"`); `help` displays the concise plain-language prompt directly underneath (`"What mattered more"`, `"When it doesn't apply"`).
- **Top Navigation (`Navbar` / `NavigationList`):** Top-bar destinations (`Destination.label: string`) show the crisp Coffee Chat term (`Explore`, `Tables`, `My Roastery`, `Brew Setup`, `Roast a Bean`) so headers never wrap awkwardly, while every destination immediately pairs it with its subtle plain-language sub-label in `PageHeader.detail`.

*(Technical attestation details such as payload digest verification and JCS schema version may appear only inside an optional collapsed `"Verification details"` disclosure inside the Bean Inspector—never in primary copy.)*

---

## 3. Information Architecture & Complete Sitemap

### 3.1 Global Shell & Navigation

- **Public & Shared Pages (`/`, `/sources`, `/sources/[id]`, `/@[handle]`, `/connect`, `/signin`, `/oauth/consent`):**
  - Clean top header built with `@openboa/yogurt` `NavigationList`, brand wordmark + geometric mark (see §5.2 on `ProjectMark` fallback), primary links (**Explore**, **Tables**, **My Roastery**, **Brew Setup**), primary CTA (**Roast a Bean**), appearance switcher (**Auto / Light / Dark** using `Moon`/`Sun` icons), and signed-in profile link (`/@handle`) + **Sign out** (or **Sign in**).
- **Authenticated Workspace (`/me` — My Roastery):**
  - Uses `@openboa/yogurt` `SidebarLayout` (`variant="inset"`, `collapse="rail"`, responsive mobile drawer via `SidebarTrigger`) on desktop and collapses cleanly to mobile rail/tabs:
    - `SidebarHeader`: Owner identity (`@handle`, display name, active Brew readiness status pill).
    - `SidebarContent` (`SidebarGroup` + `SidebarItem`):
      1. **My Beans** (`/me` or `/me?tab=workspace`, `PageHeader.detail`: *Workspace & history*) — active Beans, lifecycle & domain filters, detail & Roast Log / relation inspector.
      2. **Tasting Notes** (`/me?tab=insights`, `PageHeader.detail`: *Personal stats & insights*) — deterministic personal stats & trends.
      3. **Shelf** (`/me?tab=saved`, `PageHeader.detail`: *Saved voices & takes*) — live-hydrated followed authors & saved public Beans.
      4. **AI & Account** (`/me?tab=settings`, `PageHeader.detail`: *Connected AI apps & sign-in*) — connected AI apps (`oauth_grants`), linked sign-in accounts (GitHub/Google), and JSON/Markdown export.
    - `SidebarFooter`: Quick `+ Roast a Bean` trigger + link to `/connect` (**Brew Setup**).

### 3.2 Route Map

| Route | Auth | Purpose (Primary · *Sub-label*) | Primary Actions |
|---|---|---|---|
| `/` | Public (optional session) | **Explore** · *Fresh Beans & active tables* | Server-backed search across public Beans & Tables; featured comparison Table; active voices; honest unseeded starter guide when DB has 0 public Beans; live-hydrated Shelf buttons |
| `/me` | Required (`→ /signin?returnTo=/me`) | **My Roastery** · *Personal judgment workspace* | Switch between `My Beans`, `Tasting Notes`, `Shelf`, `AI & Account`; progressive 2-stage Roast (`?compose=1`); inspect/edit/revise Beans; resolve tensions; toggle `Private` / `On the Table`; export |
| `/sources` | Public (optional session) | **Tables** · *Compare takes on a source* | Server-backed search/sort of all public URLs with 1+ public Beans; contributor counts; click into `/sources/[id]` |
| `/sources/[id]` | Public (optional session) | **Table** · *Side-by-side takes on one source* | Axis-by-axis matrix across all public Beans on that URL; signed-in **Your Stance Banner** (private/public/none); **Roast a Bean** pre-filled with URL; live-hydrated **Save to Shelf** |
| `/@[handle]` (`/u/[handle]`) | Public (optional session) | **Voice Profile** · *Public Beans & Coffee Chat* | Display name, `@handle`, invariant `publicCount` + `privateCount` counts, public-only Tasting Notes summary, public Beans, live-hydrated **Add to Shelf** (`person` & `bean`), plain-language **Brew** handoff |
| `/connect` | Public (optional session) | **Brew Setup** · *Connect your AI apps* | Live connected-host badge (if signed in & active `oauth_grants` exist), 5-host setup switcher (Codex, Claude Code, ChatGPT, Antigravity, Cursor), plain-language starter prompts (zero MCP syntax) |
| `/signin` | Public (redirects if authed) | **Sign In** · *Enter your Roastery* | GitHub & Google OAuth buttons (Better Auth), non-production local test-auth presets (when `COFFEE_CHAT_ENABLE_TEST_AUTH=true`), `returnTo` preservation |
| `/oauth/consent` | Required (`→ /signin?returnTo=...`) | **Brew Authorization** · *Connect an AI app* | Review requesting AI client, resource, requested permissions (`Read Beans`, `Save confirmed Beans`, `Stay connected`), Approve / Deny |

---

## 4. Three End-to-End Pillars & User Journeys

### 4.1 Pillar 1 — Personal Workflow (**My Roastery** · *Personal judgment workspace*)

#### Journey A: Progressive 2-Stage Roast (Web Capture)
Accessible from **Roast a Bean** (*New take*) in the header, `/me?compose=1`, or **Roast a Bean on this Table** on `/sources/[id]` (pre-filled with that URL):
1. **Stage 1 — Quick Spark (*Capture Context & Core Thought*):**
   - Choose origin kind via `SegmentedControl`: **Reading Origin** (*From something I read* — `source_excerpt`) or **Work Origin** (*From a call I made at work* — `work_episode`).
   - Add **1 to 8 origins** (supporting multi-origin synthesis directly in UI; default 1 row open, `+ Add another origin` up to 8):
     - *Reading Origin*: URL, optional title, optional quote, optional section/page locator.
     - *Work Origin*: Short description of the work call/situation, optional project/PR locator.
   - Enter **Headline** (`title`, max 180) and **My Take** (`take`, `help`: *"What clicked for you"*, max 4000).
   - Helper action: *Continue to Roast & Confirm →* (moves to Stage 2 inside the same `Sheet` with a segmented 2-step `Progress` indicator without any intermediate DB write).
2. **Stage 2 — Roast & Confirm (*Trade-off, Boundary, Links & Attestation*):**
   - **Trade-off** (`tradeoff`, `help`: *"What mattered more"*, required, max 2000) + **Boundary** (`boundary`, `help`: *"When it doesn't apply"*, required, max 2000), aided by concise human examples (not hardcoded radio spam).
   - Optional expandable disclosure: **Open Question** (`uncertainty`, `help`: *"What's still uncertain"*), **Domains** (`tags`, `help`: *"Decision topics"*, up to 12), and **Connect to an existing Bean** (`relations`: **Updated Mind** `supersedes`, **Refined** `refines`, **In Tension** `tensions_with` + optional note; self-links and `supersedes` cycles prevented).
   - Visibility defaults strictly to **Private** (*Only me & my AI*). Selecting **On the Table** (*Shared publicly*) when any origin is a **Work Origin** immediately reveals the mandatory redaction check (`"Confirm work context contains no private employer/client secrets"` → `redactionConfirmed: true`).
   - Clicking **Confirm & save Bean** (`Button tone="brand"`) executes `POST /api/beans` (`mode: "prepare"` → canonical RFC 8785 JCS digest + `operationKey`) followed immediately by `POST /api/beans` (`saveBean`, `attestationKind: "ui_attested"`), surfacing confirmation feedback via `Toast`.

#### Journey B: My Roastery, Roast Log & Tension Resolution (`/me`)
1. **Filter & Find (`FilterBar`):**
   - Server-backed search (`q`), **Domains** chip/select filter (`tags`), **Origin** filter (*All*, *Reading Origin*, *Work Origin*), and **Lifecycle** segmented filter:
     - **Active** (not superseded, no unresolved `tensions_with`)
     - **In Tension** (`hasTension = true`)
     - **Superseded** (`supersededByBeanId !== null`)
     - **Private Only** (`visibility === "private"`)
2. **Bean Inspector (`Sheet` or split detail pane):**
   - Displays full **My Take**, **Trade-off**, **Boundary**, **Open Question**, all 1–8 origins, **Domains**, and capture badge (**AI-Roasted** · *Captured in AI* vs **Web-Roasted** · *Written on Web*).
   - **Roast Log (*Revision timeline* — `bean_revisions`):** Renders chronological immutable snapshots (`rev 1`, `rev 2`, …) with date, attestation source, and field changes (`title`, `take`, `tradeoff`, `boundary`) using Yogurt `Trace` / `List`.
   - **Relation Map & Inline Resolution:** Lists incoming and outgoing **Updated Mind** (`supersedes`), **Refined** (`refines`), and **In Tension** (`tensions_with`) links. If `hasTension` is true, displays an inline action banner (**Resolve tension**):
     - *Roast a reconciling Bean* (opens Progressive Roast pre-linked with `supersedes` or `refines` to the conflicting Bean(s)), OR
     - *Edit this Bean* (updates fields + increments `version` with `expectedVersion` lock), OR
     - *Remove tension link* (updates outgoing `fromBeanId` relations via new confirmed revision; if the `tensions_with` link is *incoming*—where `saveBean` only replaces outgoing `fromBeanId` edges—the action edits or routes directly to the originating `fromBeanId` Bean).
   - **Lifecycle Actions:**
     - **Put on the Table / Keep Private** (*Share publicly / Make private* — 1-click visibility toggle with `expectedVersion`; if `work_episode` → `public`, opens `Dialog` with an explicit redaction `Checkbox` and confirm `Button` enforcing `redactionConfirmed: true`—using `Dialog` because `ConfirmDialog` has no `children` prop; handles `409 VERSION_CONFLICT` with a clear reload-latest prompt).
     - **Delete Bean** (explicit `ConfirmDialog` → hard delete with non-resurrection receipt).
   - **Brew Readiness Banner (*AI Connection Status*):** Shows whether the user has an active AI host connected (`oauth_grants.filter(g => !g.revokedAt).length > 0`). If connected, provides a plain-language **"Brew in my AI"** (*Apply in my AI*) prompt; if not connected, links directly to `/connect` (**Brew Setup**).

---

### 4.2 Pillar 2 — Sharing Perspectives (**Tables & Shelf** · *Compare takes & save voices*)

#### Journey C: Tables & Axis-by-Axis Comparison (`/sources` & `/sources/[id]`)
1. **Tables Directory (`/sources` — `PageHeader`: `Tables` / `Compare takes on a source`):**
   - `PageHeader` + `FilterBar` with server-backed search across source titles/URLs and pagination.
   - Each row/card (`ListRow` / `Card`) shows source title, normalized URL domain, contributor count (`N voices`, `M Beans`), and direct link to `/sources/[id]`.
2. **Table View (`/sources/[id]`):**
   - **Table Summary Header (`RecordFacts` / `Badge`):** Source title, clickable external link (`rel="noopener noreferrer"`), public contributor count, and public Bean count.
   - **Your Stance Banner (when signed in, when at least 1 public Bean exists on this Table):**
     - Note: If `0` public Beans exist for that URL, `/sources/[id]` returns `404` even if the signed-in viewer owns a private Bean on that URL (preserving non-enumerability of private-only source IDs).
     - If user has a **public Bean** on this URL: highlights *"Your Bean is on this Table"* with jump/edit link.
     - If user has a **private Bean** on this URL: highlights *"You have N private Bean(s) on this source (hidden from others)"* with a private side-by-side preview drawer or *"Put a Bean on this Table"* action—never exposing the private Bean to anyone else.
     - If user has no Bean yet: offers **Roast a Bean for this Table** (*Add your take* — opens Progressive Roast pre-filled with this URL).
   - **Axis-by-Axis Comparison Matrix (`Table` / `DataTable` on desktop, stacked structured `Card`s on narrow viewports):**
     - Rows represent each public Bean (`Voice` | `Origin Quote & Locator` | `My Take` | `Trade-off · What mattered more` | `Boundary · When it doesn't apply` | `Shelf`).
     - Every **Save to Shelf** button is live-hydrated from the signed-in user's `shelf_items` (`{ targetType, targetId, shelfItemId }`) so saved state persists across reloads and unsave passes `shelfItemId` directly to `DELETE /api/shelf`.
     - **Brew this Table** (*Ask my AI about this Table*) opens a plain-language handoff dialog referencing the source URL/title in human English (zero raw `compare_perspectives(...)` syntax).

#### Journey D: Voice Profiles (`/@[handle]`), Shelf (`/me?tab=saved`) & Unseeded Explore (`/`)
1. **Voice Profile (`/@[handle]`):**
   - Displays `displayName`, `@handle`, invariant **On the Table (`publicCount`)** and **Private (`privateCount`)** counts, and public-only **Tasting Notes** summary (top public domains, public origin mix).
   - Lists public Beans + public-only relations (zero private content, origins, tags, timestamps, or edges touching private Beans).
   - Live-hydrated (`{ targetType, targetId, shelfItemId }`) **Add Voice to Shelf** button (`shelf_items` `person`) and per-Bean **Save to Shelf** button (`shelf_items` `bean`), plus plain-language **"Brew in my AI"** (*Explore their perspective in my AI*) dialog.
2. **Shelf (`/me?tab=saved` — `PageHeader`: `Shelf` / `Saved voices & takes`):**
   - **Saved Voices (`targetType: "person"`):** Displays author handle, live public Bean count, link to `/@[handle]`, and plain-language *"Include their public Beans when Brewing in my AI"* guidance.
   - **Saved Beans (`targetType: "bean"`):** Displays Bean title, author `@handle`, **`tradeoff` preview** (previously missing!), link to source Table `/sources/[id]` (via `ShelfEntryView.bean.firstSourceOriginId` when `source_excerpt` is present), and **Remove**. Any Bean switched back to `private` or deleted by its author disappears automatically.
3. **Explore (`/`) — Seeded vs Unseeded Production:**
   - **When public Beans exist:** Server-backed search & domain filter (`?q=&tag=&page=`), **Featured Table** (picking the public URL with the most contrasting voices, falling back cleanly if only 1 Bean exists), **Fresh Beans on the Table** (live-hydrated Save/Unsave to Shelf buttons via `{ targetType, targetId, shelfItemId }`), and **Active Voices** (`publicCount` + `privateCount` + top public domains).
   - **When 0 public Beans exist (unseeded production):** Renders a warm, purposeful **Start Coffee Chat** hero (`Result` / `Card` grid) explaining the 3-step loop (*Roast a private Bean* → *Set up Brew in your AI* → *Start the first shared Table*) with direct actions to `/signin`, `/me?compose=1`, and `/connect`—never an awkward blank screen.

---

### 4.3 Pillar 3 — Deterministic Stats & Insights (**Tasting Notes** · *Personal stats & insights*)

All stats and insights are **100% deterministic SQL/TypeScript aggregates** computed on the server—zero LLM calls, zero client guesswork, and zero unbacked metrics.

#### Owner-Only Tasting Notes (`/me?tab=insights`)
Rendered exclusively for the authenticated owner on `/me` using `@openboa/yogurt@0.2.0-local.1` data primitives (`PageHeader`: `title="Tasting Notes"`, `detail="Personal stats & insights"`):
1. **Top KPI Strip (`StatCard` from `@openboa/yogurt/motion-stat-card` / `Count`):**
   - **Beans** (*Confirmed takes* — total + `On the Table` vs `Private` split, optional monthly `series` sparkline)
   - **Judgment Health** (`Superseded` + `In Tension` + `Active` counts using mutually exclusive precedence `Superseded > In Tension > Active` so the three counts sum to `totalCount`)
   - **Connected AI Apps** (*Brew readiness* — active `oauth_grants` count, or `"None connected"` CTA)
   - **Shelf** (*Saved voices & takes* — live-resolved `listShelf` total, excluding private/deleted targets)
2. **Domains Breakdown (`Card` + `ListRow` / `Progress` + `Chart`):**
   - Ranked breakdown of top `tags` (*Decision topics*) across all owned Beans using `ListRow` + `Progress` bars (or `Chart` with `source: "Your confirmed Beans"`, `asOf` timestamp). Clicking a domain jumps to `/me?tab=workspace&tag=<tag>`.
3. **Origin & Roast Balance (`RecordFacts`):**
   - *Reading Origins* (`source_excerpt`) vs *Work Origins* (`work_episode`) presence counts (multi-origin Beans containing both kinds increment both counts).
   - *AI-Roasted* (`agent_attested` · *Captured in AI*) vs *Web-Roasted* (`ui_attested` · *Written on Web*) counts.
   - *Unique Sources Read* (distinct `normalizedUrl` count across owned `source_excerpt` origins).
4. **Roast Log & Evolution Momentum (`Chart` / `RecordFacts`):**
   - Total revisions recorded (`bean_revisions` across owned Beans), Beans refined (`refines`), Beans replaced (`supersedes`), and open tensions (`tensions_with`), plus recent monthly capture cadence rendered in `Chart` from `bean_revisions.createdAt`.

#### Public Tasting Notes (`/@[handle]` & `/sources/[id]`)
Strictly computed over `visibility = 'public'` rows (plus the invariant `publicCount` + `privateCount` aggregate on `/@[handle]`):
- **On `/@[handle]` (`RecordFacts` / `Badge dot={false}`):** `publicCount`, `privateCount` (count only), top public `tags` (max 5), and public origin mix (*N from reading · M from work*). Zero private tags, timestamps, origins, or edges ever enter this calculation.
- **On `/sources/[id]` (`RecordFacts`):** Contributor count, public Bean count, and shared domains across public Beans on that URL.

#### Explicitly Out of Scope (Not Fabricated)
Because the Zero-AI server does not track external AI prompt executions or page analytics, the UI MUST NOT display fabricated metrics such as view counts, impression counts, follower counts, or "times applied by AI" telemetry.

---

## 5. `@openboa/yogurt@0.2.0-local.1` Alignment & Setup Remediation

All UI specifications target **`@openboa/yogurt@0.2.0-local.1`** (`vendor/openboa-yogurt-0.2.0-local.1.tgz`, 87 core components, 29 motion components, 14 editable recipes), which bundles `@ui-sdk/core@0.1.0-beta.13` and `@ui-sdk/react@0.1.0-beta.13` as runtime dependencies. Product surfaces consume styled UI components exclusively from `@openboa/yogurt/<entry>` (and obey Yogurt `0.2.0` `@layer ui-sdk, yg.tokens, yg.base, yg.components, yg.patterns, yg.utilities;` cascade rules, monochrome default controls + fixed `#175174` `tone="brand"` primary CTAs, zero CSS gradients, zero static card drop shadows, even concentric radii, and `Badge dot={false}` on numeric counts).

### 5.1 Screen-to-Yogurt Component Mapping (`0.2.0-local.1`)

| Surface | `@openboa/yogurt` Entries Used (Verified in `packages/web/dist/entries/*.d.ts`) |
|---|---|
| Global Shell & Nav | `Yogurt` (`material="neutral"`, `appearance`), `Navbar` (`@openboa/yogurt/navbar`) / `NavigationList`, `Button` (`tone="brand"` on primary CTA only; monochrome neutral default), `IconButton`, `Link`, `Avatar`, `Icon` (`moon`/`sun`/`menu`) |
| `/me` Shell (**My Roastery**) | `SidebarLayout`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarItem` (with native `description` sub-label), `SidebarTrigger` (`@openboa/yogurt/sidebar-layout`), `Tabs`, `PageHeader` (`@openboa/yogurt/top`) |
| `/me` Workspace & Roast | `FilterBar`, `SearchField`, `Select`, `SegmentedControl`, `List` (`divided`), `ListRow` (`inlineMeta`, `description`, `actions`), `ListHeader`, `Badge` (`dot={false}` on counts), `Status`, `Sheet`, `Progress` (`presentation="segmented"` for 2-stage Roast), `Trace`, `TextField`, `Textarea`, `Checkbox`, `Switch`, `DisclosureRow` (`@openboa/yogurt/disclosure-row`), `Dialog` (redaction checkbox modal), `ConfirmDialog` (delete), `Toast`, `CopyButton` (`@openboa/yogurt/motion-copy-button`), `EmptyResult`, `Pagination` |
| `/me` Tasting Notes | `StatCard` (`@openboa/yogurt/motion-stat-card`), `Count`, `Chart` (`@openboa/yogurt/chart`), `Progress`, `RecordFacts`, `Card` (`density`, `variant`), `Grid`, `ListRow` |
| `/` & `/sources` | `PageHeader` (`@openboa/yogurt/top`), `FilterBar`, `GridList`, `List`, `ListRow`, `Card`, `Pagination`, `Result`, `EmptyResult`, `Badge` (`dot={false}` on counts), `Notice` |
| `/sources/[id]` | `PageHeader` (`@openboa/yogurt/top`), `Breadcrumb`, `RecordFacts`, `Table` / `DataTable`, `Card`, `Notice`, `Button`, `Dialog`, `CopyButton`, `Toast` |
| `/@[handle]` | `PageHeader` (`@openboa/yogurt/top`), `Avatar`, `RecordFacts`, `Badge` (`dot={false}` on counts), `List`, `ListRow`, `Card`, `Button`, `Dialog`, `CopyButton`, `EmptyResult` |
| `/connect`, `/signin`, `/oauth/consent` | `PageHeader` (`@openboa/yogurt/top`), `Tabs` / `SegmentedControl`, `Card`, `CodeBlock`, `CopyButton`, `Notice`, `Status`, `Button`, `ButtonGroup`, `TextField`, `Result` |

### 5.2 Mandatory Setup Remediation (8 Steps Upgrading to `0.2.0-local.1` & Closing Setup Gaps)

1. **Upgrade to `@openboa/yogurt@0.2.0-local.1`:** Pack `openboa-yogurt-0.2.0-local.1.tgz` into `vendor/`, update all 4 monorepo `package.json` pins (`root`, `packages/ui`, `packages/mcp-apps`, `apps/web`), update `yogurt.config.json` `"version": "0.2.0-local.1"`, update `README.md` `UI development with Yogurt` pin, and run `npm install` (resolving bundled `@ui-sdk/core` & `@ui-sdk/react` peers cleanly).
2. **Extend `yogurt.config.json` coverage:** Add `"app": { "target": "web", "root": "apps/web/src/app" }` so `npm run check:yogurt` validates all 4 surfaces including every App Router page, `layout.tsx`, and `globals.css`.
3. **Use verified per-entry imports & explicit `"use client"` boundaries:** Replace monolithic barrel imports (`from "@openboa/yogurt"`) with verified `0.2.0-local.1` per-entry imports (`@openboa/yogurt/button`, `@openboa/yogurt/card`, `@openboa/yogurt/navbar`, `PageHeader` from `@openboa/yogurt/top`, `DisclosureRow` from `@openboa/yogurt/disclosure-row`, all `Sidebar*` parts from `@openboa/yogurt/sidebar-layout`, `StatCard` from `@openboa/yogurt/motion-stat-card`, `CopyButton` from `@openboa/yogurt/motion-copy-button`, etc.). Because all 116 `packages/web/dist/entries/*.js` files start with `"use client";`, Server Components (`layout.tsx`, `sources/page.tsx`, `oauth/consent/page.tsx`) must never pass function props across the RSC boundary and must wrap interactive controls in explicit `"use client"` modules.
4. **Resolve the missing `"coffee-chat"` `ProjectMark`:** `@openboa/yogurt@0.2.0-local.1` `identity/art-data.d.ts` only includes `"openboa" | "yogurt" | "meatball" | "sourdough"`. Remove the misused `<AgentAvatar agent="bean-top" />` logo in `NavHeader.tsx` (agent silhouettes represent AI agents, not products) and render a dedicated Coffee Chat wordmark + simple geometric cup/bean SVG token-styled with `--yg-*` / `--boa-color-*` until `"coffee-chat"` is added to a future Yogurt release.
5. **Retire custom `.cc-*` CSS, inline styles, and unlayered overrides:** Delete all 21 custom `.cc-*` utility/layout classes in `packages/ui/src/styles.css` and inline layout styles, replacing them with Yogurt primitives (`SidebarLayout`, `Navbar`, `PageHeader`, `Card`, `FilterBar`, `Table`, `Grid`, `Stack`, `Inline`, `CodeBlock`, `Text`). Keep any minimal app-level stylesheet rules inside Yogurt's `@layer` cascade with zero CSS gradients, zero static card drop shadows, and no Light-mode `#F4F4F1`-on-`#F4F4F1` surface collisions.
6. **Fix all nested `<Link><Button>` invalid HTML & raw HTML drift:** Replace every `<Link href="..."><Button>...</Button></Link>` across all pages/components with valid single interactive elements (`ListRow href`, `Link`, or `Button` triggering `router.push`), and avoid raw `<button>`/`<input>`/`<select>`/`<p>`/`<h1..6>` bypassing Yogurt primitives.
7. **Align `material`, `appearance`, and `0.2.0` signal discipline:** Standardize `Yogurt` root on `material="neutral"` across both `apps/web/src/app/layout.tsx` and `packages/mcp-apps`, wire persistent `appearance` (`"auto" | "light" | "dark"`) switching, keep everyday controls monochrome (`--yg-inverse`), reserve `Button tone="brand"` (`#175174`) for primary commitment CTAs, and pass `dot={false}` on pure numeric count `Badge`s.
8. **Adopt `0.2.0` workflow, motion & stats primitives:** Use `SidebarLayout` (with `SidebarItem.description`), `Navbar`, `PageHeader`, `FilterBar`, `ListRow`, `StatCard`, `Chart`, `Progress`, `RecordFacts`, `DataTable`, `Sheet`, `Trace`, `CopyButton`, `Toast`, and `Result`.

---

## 6. Explicit Auth & Edge-State UX Contracts

- **Sign-in & `returnTo`:** Navigating to `/me` or `/oauth/consent` unauthenticated redirects to `/signin?returnTo=<encodedPath>`. Successful Better Auth (GitHub/Google) or dev-only `test-auth` login returns directly to `returnTo` (validated as a safe same-origin relative path: `returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")`, otherwise defaulting to `"/me"`).
- **Explicit Account Linking & Unlink Guard (`/me?tab=settings`):** Better Auth is configured with `accountLinking: { enabled: true, disableImplicitLinking: true, trustedProviders: ["github", "google"], allowDifferentEmails: true }`, keeping silent cross-provider merging on OAuth sign-in **disabled** while allowing authenticated users to explicitly link additional providers via `/api/auth/link-social` (`linkSocial()`). Settings lists currently linked providers (`github`, `google`, `local-test`), provides **Link GitHub** / **Link Google** buttons (disabled with tooltip if provider env vars are absent; local `test-auth` E2E exercises explicit linking via `test-auth`-gated `POST /api/accounts`), surfaces `409 ACCOUNT_ALREADY_LINKED` clearly if that provider identity belongs to another user, and disables or rejects **Unlink** on the last remaining method (`400 LAST_LOGIN_METHOD`).
- **Optimistic Concurrency & Redaction Feedback:** Concurrent edits/toggles encountering `409 VERSION_CONFLICT` display an inline `Notice` (`tone="warning"`) offering **Reload latest version** without discarding the user's drafted text. Publishing a *From Work* take without checking the redaction confirmation (`Dialog` + `Checkbox`) blocks submission (`400 REDACTION_REQUIRED`) with clear field-level focus.
