/* =========================================================
   CII — CLIENT LOGIC
   Shared across all pages. Sections not present on a given
   page are simply skipped (each render function checks for
   its container before running).
   ========================================================= */
(function(){
  "use strict";

  /* ---------- NAV DROPDOWNS ---------- */
  document.querySelectorAll(".nav-item > button").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const item = btn.parentElement;
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll(".nav-item.open").forEach(i=>i.classList.remove("open"));
      if(!wasOpen) item.classList.add("open");
    });
  });
  document.addEventListener("click", ()=> document.querySelectorAll(".nav-item.open").forEach(i=>i.classList.remove("open")));

  const hamburger = document.getElementById("hamburger");
  const mainNav = document.getElementById("mainNav");
  if(hamburger){
    hamburger.addEventListener("click", ()=>{
      const isOpen = mainNav.style.display === "flex";
      mainNav.style.display = isOpen ? "" : "flex";
      mainNav.style.cssText += isOpen ? "" : "position:absolute;top:74px;left:0;right:0;background:var(--surface);flex-direction:column;align-items:flex-start;padding:16px 24px;border-bottom:1px solid var(--border);gap:2px;z-index:90;";
    });
  }

  /* ---------- PULSE LINE ANIMATION (hero signature) ---------- */
  const pulsePath = document.getElementById("pulsePath");
  const pulseDot = document.getElementById("pulseDot");
  if(pulsePath && pulseDot && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    const len = pulsePath.getTotalLength();
    let t = 0;
    function animatePulse(){
      t += 0.0035;
      if(t > 1) t = 0;
      const pt = pulsePath.getPointAtLength(t*len);
      pulseDot.setAttribute("cx", pt.x);
      pulseDot.setAttribute("cy", pt.y);
      requestAnimationFrame(animatePulse);
    }
    requestAnimationFrame(animatePulse);
  }

  /* ---------- LIFECYCLE LOOP ---------- */
  const LIFECYCLE = [
    {n:"01", name:"Conversation", desc:"A person messages naturally on WhatsApp, Telegram, or web chat — in their own words, no forms."},
    {n:"02", name:"Capture", desc:"Every message is ingested and stored verbatim, with sender, channel, and timestamp preserved as the source of truth."},
    {n:"03", name:"Understanding", desc:"Natural-language understanding parses meaning, language, tone, and entities from the raw conversation."},
    {n:"04", name:"Intent Detection", desc:"The system classifies what the person actually wants — buy, sell, report, ask, request, warn — as a structured intent."},
    {n:"05", name:"Memory", desc:"The conversation and its extracted meaning are written to durable, queryable memory — nothing is lost after the chat ends."},
    {n:"06", name:"Knowledge", desc:"Related conversations link together into a growing knowledge base for the person, organization, and domain."},
    {n:"07", name:"Intelligence", desc:"Patterns across thousands of conversations surface as trends, forecasts, and organizational insight."},
    {n:"08", name:"Recommendations", desc:"CII proposes next-best actions — a match, a follow-up, an alert — grounded in real conversational evidence."},
    {n:"09", name:"Automation", desc:"Routine responses, approvals, and workflows execute automatically through Make.com and Edge Functions."},
    {n:"10", name:"Opportunity Matching", desc:"Structured intents are matched against each other in real time — a buyer against a seller, a need against a resource."},
    {n:"11", name:"Dashboards", desc:"Decision-makers see live, structured views of what would otherwise be thousands of scattered chats."},
    {n:"12", name:"Organizational Learning", desc:"What's learned feeds back into the system's models and prompts — so the next conversation starts smarter."}
  ];
  const loopSvg = document.getElementById("loopSvg");
  const loopDetail = document.getElementById("loopDetail");
  if(loopSvg){
    const cx=240, cy=240, r=175;
    let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1D2740" stroke-width="1.5" stroke-dasharray="2 6"/>`;
    LIFECYCLE.forEach((step,i)=>{
      const angle = (i / LIFECYCLE.length) * Math.PI*2 - Math.PI/2;
      const x = cx + r*Math.cos(angle), y = cy + r*Math.sin(angle);
      const lx = cx + (r+34)*Math.cos(angle), ly = cy + (r+34)*Math.sin(angle);
      html += `<circle class="loop-node${i===0?' active':''}" data-idx="${i}" cx="${x}" cy="${y}" r="15"/>`;
      html += `<text class="loop-label${i===0?' active':''}" data-lbl="${i}" x="${x}" y="${y+3}" text-anchor="middle">${step.n}</text>`;
      html += `<text x="${lx}" y="${ly+3}" text-anchor="middle" font-size="9.5" fill="#7C88AC" font-family="Inter, sans-serif">${step.name}</text>`;
    });
    html += `<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="12" fill="#5FE0D6" font-family="JetBrains Mono, monospace" font-weight="600">THE PULSE LOOP</text>`;
    html += `<text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9.5" fill="#7C88AC">learning feeds the next conversation</text>`;
    loopSvg.innerHTML = html;

    function selectStep(i){
      loopSvg.querySelectorAll(".loop-node").forEach(n=>n.classList.remove("active"));
      loopSvg.querySelectorAll("[data-lbl]").forEach(n=>n.classList.remove("active"));
      loopSvg.querySelector(`.loop-node[data-idx="${i}"]`).classList.add("active");
      loopSvg.querySelector(`[data-lbl="${i}"]`).classList.add("active");
      const step = LIFECYCLE[i];
      loopDetail.innerHTML = `<span class="step-num">Step ${step.n}</span><h4>${step.name}</h4><p>${step.desc}</p>`;
    }
    loopSvg.addEventListener("click",(e)=>{
      const node = e.target.closest(".loop-node");
      if(!node) return;
      selectStep(+node.dataset.idx);
    });
    let auto = 0;
    setInterval(()=>{ auto = (auto+1) % LIFECYCLE.length; selectStep(auto); }, 3200);
  }

  /* ---------- ARCHITECTURE LAYERS ---------- */
  const ARCH = [
    {name:"Channels", tag:"Entry points", desc:"People reach CII where they already are — no new app to install, no login to remember.", tech:["WhatsApp Cloud API","Telegram","Web Chat"]},
    {name:"Capture & Ingestion", tag:"Edge Functions", desc:"Incoming messages are normalized, authenticated, and queued regardless of source channel.", tech:["Supabase Edge Functions","Webhooks","Message Queue"]},
    {name:"Understanding", tag:"NLU / LLM", desc:"OpenAI models extract intent, entities, sentiment, and language — turning free text into structured signal.", tech:["OpenAI APIs","Prompt Templates","Function Calling"]},
    {name:"Memory & Knowledge", tag:"Data layer", desc:"Conversations and their structured meaning are stored durably and made searchable by meaning, not just keywords.", tech:["PostgreSQL","pgvector","RAG"]},
    {name:"Intelligence & Automation", tag:"Orchestration", desc:"Rules, models, and workflows turn structured knowledge into recommendations, alerts, and automated actions.", tech:["Make.com","Edge Functions","Scheduled Jobs"]},
    {name:"Application Layer", tag:"Pulses", desc:"Domain-specific products — FarmerPulse, GovPulse, HealthPulse, and more — sit on the shared engine.", tech:["Pulse Apps","Dashboards","Public APIs"]},
    {name:"Delivery", tag:"Hosting & CI/CD", desc:"Every Pulse and the core platform ship continuously from a shared codebase.", tech:["GitHub","Vercel","CI/CD"]}
  ];
  const archStack = document.getElementById("archStack");
  const archDetail = document.getElementById("archDetail");
  if(archStack){
    archStack.innerHTML = ARCH.map((l,i)=>`
      <div class="arch-layer${i===0?' active':''}" data-idx="${i}">
        <div class="arch-layer__top"><span class="arch-layer__name">${l.name}</span><span class="arch-layer__tag">${l.tag}</span></div>
      </div>
    `).join("");
    function selectLayer(i){
      archStack.querySelectorAll(".arch-layer").forEach(el=>el.classList.remove("active"));
      archStack.querySelector(`[data-idx="${i}"]`).classList.add("active");
      const l = ARCH[i];
      archDetail.innerHTML = `<h4>${l.name}</h4><p>${l.desc}</p><div class="arch-detail__tech">${l.tech.map(t=>`<span>${t}</span>`).join("")}</div>`;
    }
    archStack.addEventListener("click",(e)=>{
      const layer = e.target.closest(".arch-layer");
      if(!layer) return;
      selectLayer(+layer.dataset.idx);
    });
    selectLayer(0);
  }

  /* ---------- PULSE ECOSYSTEM GRID ---------- */
  const PULSES = [
    {name:"FarmerPulse", domain:"Agriculture", icon:"🌾", color:"#0EA5A0", desc:"Turns WhatsApp conversations into verified buyer, seller, and service intents across agricultural value chains.", href:"pulse-platform.html#farmerpulse"},
    {name:"GovPulse", domain:"Government", icon:"🏛️", color:"#3651D4", desc:"Structures citizen conversations into service requests, complaints, and policy feedback for public institutions.", href:"pulse-platform.html#govpulse"},
    {name:"HealthPulse", domain:"Healthcare", icon:"🩺", color:"#D64545", desc:"Captures patient and community health conversations into structured records and early-warning signals.", href:"pulse-platform.html#healthpulse"},
    {name:"EduPulse", domain:"Education", icon:"🎓", color:"#B08900", desc:"Converts learner and educator conversations into progress tracking, support requests, and content gaps.", href:"pulse-platform.html#edupulse"},
    {name:"BusinessPulse", domain:"SMEs & Enterprise", icon:"💼", color:"#3651D4", desc:"Structures customer and supplier conversations into leads, orders, and service intelligence for growing businesses.", href:"pulse-platform.html#businesspulse"},
    {name:"CommunityPulse", domain:"Civil Society", icon:"🤝", color:"#0EA5A0", desc:"Helps NGOs and community organizations turn beneficiary conversations into programmatic insight.", href:"pulse-platform.html#more"},
    {name:"ResearchPulse", domain:"Research", icon:"🔬", color:"#7C4DFF", desc:"Structures interview and survey conversations into research-ready, queryable qualitative data.", href:"pulse-platform.html#more"},
    {name:"EnterprisePulse", domain:"Large Organizations", icon:"🏢", color:"#131C30", desc:"Applies the same engine internally — turning employee and customer conversations into institutional memory.", href:"pulse-platform.html#more"}
  ];
  const pulseGrid = document.getElementById("pulseGrid");
  if(pulseGrid){
    pulseGrid.innerHTML = PULSES.map(p=>`
      <div class="pulse-card">
        <div class="pulse-card__icon" style="background:${p.color}1A;color:${p.color}">${p.icon}</div>
        <div class="pulse-card__name">${p.name}</div>
        <div class="pulse-card__domain">${p.domain}</div>
        <p>${p.desc}</p>
        <a href="${p.href}">Learn more →</a>
      </div>
    `).join("");
  }

  /* ---------- SOLUTIONS GRID (audiences) ---------- */
  const SOLUTIONS = [
    ["Governments","GovPulse"], ["NGOs & Development Partners","CommunityPulse"], ["Agribusinesses","FarmerPulse"],
    ["SMEs & Enterprises","BusinessPulse"], ["Educational Institutions","EduPulse"], ["Healthcare Organizations","HealthPulse"],
    ["Financial Institutions","BusinessPulse"], ["Researchers","ResearchPulse"], ["AI Developers","Developer Platform"], ["Investors","Platform Overview"]
  ];
  const solutionsGrid = document.getElementById("solutionsGrid");
  if(solutionsGrid){
    solutionsGrid.innerHTML = SOLUTIONS.map(([aud,pulse])=>`<div class="solution-chip">${aud}<span>${pulse}</span></div>`).join("");
  }

  /* ---------- PARTNERS GRID ---------- */
  const partnersGrid = document.getElementById("partnersGrid");
  if(partnersGrid){
    const P = [["Technology Partners","Cloud, AI & channel providers"],["Implementation Partners","Deployment & training"],["Development Partners","Funding & programs"],["Research Partners","Evaluation & evidence"],["Government Partners","Public-sector pilots"]];
    partnersGrid.innerHTML = P.map(([a,b])=>`<div class="solution-chip">${a}<span>${b}</span></div>`).join("");
  }

  /* ---------- METRICS ---------- */
  const METRICS = [
    ["1.2M+","Conversations Processed"], ["36","States & Regions Active"], ["8","Pulses Live or in Pilot"],
    ["112K+","Structured Intents Created"], ["99.9%","Platform Uptime"]
  ];
  const metricsGrid = document.getElementById("metricsGrid");
  if(metricsGrid){
    metricsGrid.innerHTML = METRICS.map(([v,l])=>`<div class="metric"><span class="metric__value">${v}</span><span class="metric__label">${l}</span></div>`).join("");
  }

  /* ---------- TESTIMONIALS ---------- */
  const TESTIMONIALS = [
    {quote:"“Conversations that used to disappear into someone's phone are now searchable organizational knowledge.”", name:"Program Director", role:"Agricultural extension program (illustrative)"},
    {quote:"“We stopped losing citizen feedback in inboxes. Now every request is structured and tracked to resolution.”", name:"Digital Services Lead", role:"State government pilot (illustrative)"},
    {quote:"“Our field officers just chat the way they always have. CII does the structuring in the background.”", name:"Country Director", role:"Development partner (illustrative)"}
  ];
  const testimonialGrid = document.getElementById("testimonialGrid");
  if(testimonialGrid){
    testimonialGrid.innerHTML = TESTIMONIALS.map(t=>`
      <div class="testimonial">
        <div class="testimonial__quote">${t.quote}</div>
        <div class="testimonial__who">
          <div class="testimonial__avatar">${t.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
          <div><div class="testimonial__name">${t.name}</div><div class="testimonial__role">${t.role}</div></div>
        </div>
      </div>
    `).join("");
  }

})();
