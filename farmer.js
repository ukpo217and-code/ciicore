/* CII / VPI — Farmer Public Profile + Card
   Reads only the intentionally-public Supabase views (never raw tables).
   No secret keys here — this is the anon/publishable key, safe for the browser. */

const CII_FARMER_CONFIG = {
  SUPABASE_URL: "https://jmltamnqlqewwsqvcvme.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbHRhbW5xbHFld3dzcXZjdm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDk4MzEsImV4cCI6MjA5ODU4NTgzMX0.eP4ZQUqvfYOaSHSA06ogG-KHQVNNGAWIdAMgqunO0hw",
  SITE_URL: "https://ciicore.com",
};

/* ---------- farmer code from URL ---------- */

function getFarmerCodeFromPath() {
  // matches /farmer/IFAD-F001 and /farmer/IFAD-F001/card
  const m = window.location.pathname.match(/\/farmer\/([^/]+)/i);
  if (!m) return null;
  return decodeURIComponent(m[1]).toUpperCase();
}

function canonicalProfileUrl(code) {
  return `${CII_FARMER_CONFIG.SITE_URL}/farmer/${code}`;
}

/* ---------- Supabase REST (PostgREST) ---------- */

async function sbSelect(view, farmerCode) {
  const url = `${CII_FARMER_CONFIG.SUPABASE_URL}/rest/v1/${view}?farmer_code=eq.${encodeURIComponent(
    farmerCode
  )}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: CII_FARMER_CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CII_FARMER_CONFIG.SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`${view} request failed (${res.status})`);
  return res.json();
}

async function loadFarmer(code) {
  const [profileRows, progressionRows, interventionRows] = await Promise.all([
    sbSelect("vw_public_farmer_profiles", code),
    sbSelect("vw_public_farmer_progression", code),
    sbSelect("vw_public_farmer_interventions", code),
  ]);

  if (!profileRows.length) return null;

  return {
    profile: profileRows[0],
    progression: progressionRows[0] || null,
    interventions: interventionRows || [],
  };
}

/* ---------- formatting helpers ---------- */

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtStatusLabel(status) {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusToneClass(status) {
  switch (status) {
    case "progress_verified":
      return "tone-good";
    case "attention_required":
      return "tone-bad";
    case "follow_up_due":
    case "evidence_awaiting_verification":
      return "tone-warn";
    case "profile_only":
      return "tone-muted";
    default:
      return "tone-neutral";
  }
}

/* ---------- QR (rendered dynamically from farmer_code — no QR table) ---------- */

function qrImageUrl(text, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    text
  )}`;
}

/* ============================================================
   PROFILE PAGE
   ============================================================ */

async function initProfilePage() {
  const code = getFarmerCodeFromPath();
  const loadingEl = document.getElementById("farmerLoading");
  const notFoundEl = document.getElementById("farmerNotFound");
  const contentEl = document.getElementById("farmerContent");

  if (!code) {
    loadingEl.hidden = true;
    notFoundEl.hidden = false;
    return;
  }

  try {
    const data = await loadFarmer(code);
    loadingEl.hidden = true;

    if (!data) {
      notFoundEl.hidden = false;
      document.getElementById("farmerNotFoundCode").textContent = code;
      return;
    }

    renderProfile(data, code);
    contentEl.hidden = false;
  } catch (err) {
    loadingEl.hidden = true;
    notFoundEl.hidden = false;
    document.getElementById("farmerNotFoundCode").textContent = code;
    console.error(err);
  }
}

function renderProfile(data, code) {
  const { profile, progression, interventions } = data;

  document.title = `${profile.full_name} — Verified Farmer Profile | CII VPI`;

  document.getElementById("farmerName").textContent = profile.full_name;
  document.getElementById("farmerCode").textContent = profile.farmer_code;
  document.getElementById("farmerEnterprise").textContent = profile.enterprise || "—";
  document.getElementById("farmerCommunity").textContent = profile.community || "—";
  document.getElementById("farmerLga").textContent = profile.lga || "—";
  document.getElementById("farmerFarmSize").textContent = profile.farm_size_ha
    ? `${profile.farm_size_ha} ha`
    : "—";

  const badge = document.getElementById("verifiedBadge");
  badge.textContent =
    profile.verification_status === "verified" ? "Verified Farmer" : fmtStatusLabel(profile.verification_status);

  document.getElementById("cardLink").href = `/farmer/${code}/card`;

  const p = progression || {
    intervention_total: 0,
    intervention_verified: 0,
    intervention_pending: 0,
    intervention_issues: 0,
    evidence_total: 0,
    evidence_verified: 0,
    evidence_awaiting: 0,
    latest_verified_at: null,
    progression_status: "profile_only",
  };

  document.getElementById("statInterventionTotal").textContent = p.intervention_total;
  document.getElementById("statInterventionVerified").textContent = p.intervention_verified;
  document.getElementById("statInterventionPending").textContent = p.intervention_pending;
  document.getElementById("statInterventionIssues").textContent = p.intervention_issues;
  document.getElementById("statEvidenceTotal").textContent = p.evidence_total;
  document.getElementById("statEvidenceVerified").textContent = p.evidence_verified;
  document.getElementById("statEvidenceAwaiting").textContent = p.evidence_awaiting;
  document.getElementById("statLatestVerified").textContent = fmtDate(p.latest_verified_at);

  const statusEl = document.getElementById("progressionStatus");
  statusEl.textContent = fmtStatusLabel(p.progression_status);
  statusEl.className = `status-pill ${statusToneClass(p.progression_status)}`;

  // interventions list
  const listEl = document.getElementById("interventionsList");
  listEl.innerHTML = "";
  if (!interventions.length) {
    listEl.innerHTML = `<p class="empty-note">No interventions recorded yet for this farmer.</p>`;
  } else {
    interventions
      .slice()
      .sort((a, b) => new Date(b.assigned_on || 0) - new Date(a.assigned_on || 0))
      .forEach((iv) => {
        const row = document.createElement("div");
        row.className = "intervention-row";
        row.innerHTML = `
          <div class="intervention-main">
            <span class="intervention-type">${escapeHtml(iv.intervention_type || "Intervention")}</span>
            <span class="intervention-item">${escapeHtml(iv.item_name || "")}</span>
          </div>
          <div class="intervention-meta">
            <span class="status-pill ${statusToneClass(iv.status)}">${fmtStatusLabel(iv.status)}</span>
            <span class="intervention-date">Assigned ${fmtDate(iv.assigned_on)}</span>
            <span class="intervention-evidence">${iv.verified_evidence_count}/${iv.evidence_count} evidence verified</span>
          </div>
        `;
        listEl.appendChild(row);
      });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   CARD PAGE
   ============================================================ */

async function initCardPage() {
  const code = getFarmerCodeFromPath();
  const loadingEl = document.getElementById("cardLoading");
  const notFoundEl = document.getElementById("cardNotFound");
  const cardEl = document.getElementById("farmerCard");

  if (!code) {
    loadingEl.hidden = true;
    notFoundEl.hidden = false;
    return;
  }

  try {
    const data = await loadFarmer(code);
    loadingEl.hidden = true;

    if (!data) {
      notFoundEl.hidden = false;
      return;
    }

    renderCard(data.profile, code);
    cardEl.hidden = false;
  } catch (err) {
    loadingEl.hidden = true;
    notFoundEl.hidden = false;
    console.error(err);
  }
}

function renderCard(profile, code) {
  document.title = `Farmer Card — ${profile.full_name} | CII VPI`;

  document.getElementById("cardName").textContent = profile.full_name;
  document.getElementById("cardCode").textContent = profile.farmer_code;
  document.getElementById("cardEnterprise").textContent = profile.enterprise || "—";
  document.getElementById("cardLocation").textContent = [profile.community, profile.lga]
    .filter(Boolean)
    .join(", ");
  document.getElementById("cardVerified").textContent =
    profile.verification_status === "verified" ? "Verified" : fmtStatusLabel(profile.verification_status);

  const profileUrl = canonicalProfileUrl(code);
  document.getElementById("cardProfileUrl").textContent = profileUrl.replace(/^https?:\/\//, "");
  document.getElementById("cardProfileLink").href = profileUrl;

  const qrImg = document.getElementById("cardQr");
  qrImg.src = qrImageUrl(profileUrl);
  qrImg.alt = `QR code to ${profileUrl}`;
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "profile") initProfilePage();
  if (page === "card") initCardPage();

  const printBtn = document.getElementById("printCardBtn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
