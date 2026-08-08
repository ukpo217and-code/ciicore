# CIIcore — Platform &amp; Go-to-Market Strategy

This document accompanies the website prototype (`index.html` and
subpages) and covers the deliverables that live behind the site rather
than on it: information architecture, data model, API design, SEO,
content strategy, lead generation, roadmap, and analytics.

---

## 1. Information Architecture &amp; Navigation

**Top-level nav (mega-menu):**

- **Product** — What is CII? · Reference Architecture · Pulse Platform · Marketplace &amp; Intent Exchange
- **Solutions** — FarmerPulse · GovPulse · HealthPulse · EduPulse · BusinessPulse · CommunityPulse · ResearchPulse · EnterprisePulse
- **Developers** — API &amp; Developers · Documentation · Knowledge Center
- **Resources** — Case Studies · Blog · Knowledge Center
- **Pricing** (top-level, single link — pricing is a conversion-critical page and should never be buried in a dropdown)
- **Partners** (top-level)
- **Utility**: Contact (ghost button) · Get Started (primary button) — present on every page

**URL structure:**
```
/                          Home
/what-is-cii               Explainer + reference architecture
/pulse-platform            All 8 Pulses (#anchors per Pulse)
/marketplace               Intent Exchange deep dive (currently anchor on home)
/developers                API reference + docs entry point
/case-studies              Index + /case-studies/:slug
/blog                      Index + /blog/:slug
/pricing
/partners
/contact
/get-started
```

**Rationale:** Pulses live as anchors on one `/pulse-platform` page rather
than eight separate top-level pages at launch — this concentrates SEO
authority and keeps the shared-engine narrative ("one engine, eight
domains") intact. Once a Pulse (e.g. FarmerPulse) reaches its own
independent audience and content volume, split it to its own URL/subdomain
(pattern already proven — see the existing standalone FarmerPulse Intent
Exchange site) and 301-redirect the anchor.

---

## 2. Database Schema (Supabase / PostgreSQL)

Core tables, shared across every Pulse (Pulse-specific fields live in
`domain_attributes` jsonb rather than per-Pulse tables, so the engine
never needs schema migrations to add a new domain):

```sql
-- Organizations using CII (a Pulse tenant, an NGO, a government dept, etc.)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null,        -- 'government' | 'ngo' | 'agribusiness' | 'sme' | ...
  pulse text not null,           -- 'farmerpulse' | 'govpulse' | ...
  created_at timestamptz default now()
);

-- People (farmers, citizens, patients, students, customers — channel-agnostic)
create table people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  channel text not null,          -- 'whatsapp' | 'telegram' | 'web'
  channel_identifier text not null, -- phone number / chat id, hashed at rest
  display_name text,
  created_at timestamptz default now()
);

-- Raw captured conversation turns (the source of truth)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id),
  organization_id uuid references organizations(id),
  channel text not null,
  raw_text text not null,
  direction text not null,        -- 'inbound' | 'outbound'
  language text,
  created_at timestamptz default now()
);

-- Structured intents extracted from conversations (the core CII object)
create table intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  person_id uuid references people(id),
  source_conversation_id uuid references conversations(id),
  pulse text not null,
  intent_type text not null,       -- 'buy' | 'sell' | 'service_request' | 'complaint' | ...
  domain_attributes jsonb not null default '{}', -- commodity, quantity, symptom, subject, etc.
  location text,
  visibility text not null default 'private', -- 'private' | 'partners' | 'public'
  status text not null default 'open',        -- 'open' | 'matched' | 'closed' | 'expired'
  verified boolean default false,
  embedding vector(1536),          -- pgvector, for semantic search / RAG
  created_at timestamptz default now()
);
create index intents_embedding_idx on intents using ivfflat (embedding vector_cosine_ops);
create index intents_pulse_type_idx on intents (pulse, intent_type, visibility);

-- Matches between compatible intents (opportunity matching)
create table matches (
  id uuid primary key default gen_random_uuid(),
  intent_a_id uuid references intents(id),
  intent_b_id uuid references intents(id),
  score numeric,
  status text default 'suggested', -- 'suggested' | 'confirmed' | 'completed'
  created_at timestamptz default now()
);

-- Aggregated intelligence (materialized view, refreshed on schedule)
create materialized view intelligence_daily as
  select pulse, intent_type, domain_attributes->>'commodity' as subject,
         count(*) as volume, date_trunc('day', created_at) as day
  from intents group by 1,2,3,5;
```

**Row-level security:** every `select` on `intents` is scoped by
`visibility` (public rows readable by anyone; partner rows readable by
organizations with an accepted partnership record; private rows readable
only by the owning organization/person) — this is what lets a public
FarmerPulse listing reach the live feed while a HealthPulse conversation
stays private by default.

---

## 3. API Design

REST + Realtime, versioned at `/v1`. Full endpoint table lives on the
`/developers` page; summary:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/v1/conversations` | Ingest a raw message from any channel adapter |
| GET | `/v1/conversations/:id` | Retrieve a conversation + its extracted structure |
| POST | `/v1/intents` | Create a structured intent directly |
| GET | `/v1/intents` | Search/filter intents (type, commodity, location, date, visibility) |
| GET | `/v1/matches` | Retrieve generated matches |
| GET | `/v1/intelligence/summary` | Aggregated intelligence for a domain/org |
| POST | `/v1/webhooks/whatsapp` | WhatsApp Cloud API inbound webhook |
| POST | `/v1/webhooks/telegram` | Telegram inbound webhook |

Realtime: clients subscribe to `postgres_changes` on `intents` filtered by
`visibility=eq.public` (and, for authenticated org clients, their own
`organization_id`) — this single mechanism powers every Pulse's live feed,
ticker, and dashboard without polling.

---

## 4. SEO Strategy

- **Pillar/cluster model:** `/what-is-cii` is the pillar page targeting
  "conversational intelligence infrastructure" and "conversation
  intelligence platform"; each Pulse anchor and future Pulse subpage is a
  cluster page targeting domain-specific queries ("agricultural
  marketplace WhatsApp", "citizen feedback platform Nigeria", etc.).
- **Programmatic SEO opportunity:** FarmerPulse-style state/commodity
  pages ("Maize buyers in Kaduna") can be generated from live `intents`
  data once volume supports it — high-intent, low-competition long-tail.
- **Technical:** static-generatable pages (this prototype's structure
  maps directly to Next.js `generateStaticParams`), sub-second LCP target,
  semantic heading hierarchy already in place (`h1` per page, `h2` per
  section), descriptive `<title>`/meta description per page (done above).
- **Off-page:** case studies and blog posts targeted at government,
  NGO/development-partner, and agribusiness search intent, since those
  audiences research vendors before contacting sales.

## 5. Content Strategy &amp; Blog Plan

Three content tracks, mapped to the funnel:

1. **Awareness** — "What conversational intelligence is and isn't",
   "Why WhatsApp is the most under-used data source in [sector]",
   comparisons (CII vs. chatbot vs. CRM — expand the FAQ on `/what-is-cii`).
2. **Consideration** — Pulse-specific deep dives, architecture explainers,
   "how matching works" — written for a technical evaluator or program
   officer doing due diligence.
3. **Decision** — case studies with named partners once available,
   pricing/FAQ content, security &amp; data-residency explainers for
   government/NGO buyers.

Cadence: 2 posts/month at launch (1 awareness, 1 consideration), shifting
to weekly once a content team is in place; every post links to the
relevant Pulse and to `/get-started`.

## 6. Lead Generation Strategy

- **Primary conversion path:** every page's CTA leads to either
  `/get-started` (self-serve/pilot) or `/contact` (sales-assisted) — kept
  deliberately as two paths, not one, since government/NGO buyers expect
  a human conversation while SMEs expect self-serve.
- **Lead magnet:** the Knowledge Center (frameworks, architecture guides)
  gated only where it's genuinely valuable (e.g. an "Evaluating
  Conversational AI Vendors" guide for public-sector buyers) — the core
  explainer content stays open, since gating it would undercut the
  thought-leadership goal.
- **Qualification:** the `/get-started` and `/contact` forms both capture
  Pulse interest and channel, so sales/success can route leads without a
  discovery call.
- **Partnership channel:** the `/partners` section is itself a lead
  channel — technology and implementation partners bring pipeline in
  exchange for co-marketing.

## 7. Implementation Roadmap

**Phase 0 — Foundation (this deliverable):** static marketing site,
information architecture, design system, copy.

**Phase 1 (0–2 months):** wire `/get-started` and `/contact` forms to a
CRM via Edge Function; stand up the Supabase schema above; connect one
WhatsApp Business number end-to-end for a single pilot Pulse (FarmerPulse
already proves this pattern).

**Phase 2 (2–4 months):** Realtime feed on the homepage and Pulse pages
sourced from live `intents` data (replacing the current front-end
simulation); publish first 3–5 case studies; launch blog.

**Phase 3 (4–8 months):** self-serve onboarding flow (channel connection
wizard), billing integration for Starter/Growth plans, second and third
Pulses in production beyond FarmerPulse.

**Phase 4 (8+ months):** programmatic SEO pages from live data;
public API keys and developer sandbox; partner directory with live
partner-submitted profiles.

## 8. Analytics Framework

- **Marketing site:** page views, scroll depth on `/what-is-cii` and
  `/pulse-platform` (proxy for message comprehension), CTA click-through
  by source page, form starts vs. completions on `/get-started` and
  `/contact`.
- **Product (post-Phase 1):** conversations ingested per Pulse/day,
  intent-extraction accuracy (sampled human review), match rate and
  time-to-match, dashboard active users per organization.
- **Funnel:** visit → content engagement → form start → qualified lead →
  pilot → paid plan; instrument each step distinctly rather than
  collapsing to a single "conversion" event, since government/NGO cycles
  are materially longer than SME self-serve cycles.
- **Tooling assumption:** privacy-respecting analytics (no third-party ad
  pixels — consistent with CII's own data-handling posture) plus a
  product analytics tool wired to the Postgres event stream already
  described in the schema.

---

## Notes on scope of this prototype

- All eight Pulses are represented; FarmerPulse is the deepest because it
  mirrors the already-live FarmerPulse Intent Exchange build. The other
  seven have representative copy that should be reviewed by each domain's
  subject-matter owner before publishing.
- Testimonials on the homepage are explicitly labeled illustrative —
  replace with named, quoted partners as case studies are published.
- Metrics shown (conversations processed, states active, etc.) are
  illustrative placeholders for design purposes and should be replaced
  with real figures before launch, or removed if not yet available.
