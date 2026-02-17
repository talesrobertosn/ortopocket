(() => {
  const els = {
    sidebar: document.getElementById("sidebar"),
    nav: document.getElementById("nav"),
    content: document.getElementById("content"),
    topbarTitle: document.getElementById("topbarTitle"),
    searchInput: document.getElementById("searchInput"),
    menuToggle: document.getElementById("menuToggle"),
  };

  const state = {
    pages: [],
    pageById: new Map(),
    filtered: [],
    currentId: null,
  };

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function setSidebarOpen(open){
    if(open) els.sidebar.classList.add("open");
    else els.sidebar.classList.remove("open");
  }

  function parseRoute(){
    const raw = (location.hash || "#/p/home").replace(/^#\/?/, "");
    const parts = raw.split("/");
    if(parts[0] === "p" && parts[1]) return parts[1];
    return "home";
  }

  function toHref(id){ return `#/p/${encodeURIComponent(id)}`; }

  function groupBySection(pages){
    const map = new Map();
    for(const p of pages){
      const section = p.section || "Outros";
      if(!map.has(section)) map.set(section, []);
      map.get(section).push(p);
    }
    for(const [k, arr] of map.entries()){
      arr.sort((a,b) => a.title.localeCompare(b.title, "pt-BR"));
      map.set(k, arr);
    }
    return map;
  }

  function buildNav(pages){
    const grouped = groupBySection(pages);
    const sections = Array.from(grouped.keys()).sort((a,b) => a.localeCompare(b, "pt-BR"));

    const html = sections.map(section => {
      const items = grouped.get(section).map(p => {
        const active = (p.id === state.currentId) ? "active" : "";
        const tags = (p.tags || []).join(" ");
        return `<a class="${active}" href="${toHref(p.id)}" data-id="${escapeHtml(p.id)}" data-tags="${escapeHtml(tags)}">${escapeHtml(p.title)}</a>`;
      }).join("");

      return `
        <details class="nav-section" open>
          <summary>${escapeHtml(section)}</summary>
          <div class="nav-items">${items}</div>
        </details>
      `;
    }).join("");

    els.nav.innerHTML = html;

    els.nav.querySelectorAll("a[data-id]").forEach(a => {
      a.addEventListener("click", () => {
        if(window.matchMedia("(max-width: 900px)").matches) setSidebarOpen(false);
      });
    });
  }

  function applySearch(q){
    const query = (q || "").trim().toLowerCase();
    if(!query){
      state.filtered = [...state.pages];
      return;
    }

    state.filtered = state.pages.filter(p => {
      const hay = [
        p.title,
        p.section,
        ...(p.tags || [])
      ].join(" ").toLowerCase();
      return hay.includes(query);
    });
  }

  async function loadMarkdown(file){
    const res = await fetch(file, { cache: "no-store" });
    if(!res.ok) throw new Error(`Falha ao carregar: ${file}`);
    return await res.text();
  }

  function setActiveNav(id){
    els.nav.querySelectorAll("a[data-id]").forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-id") === id);
    });
  }

  function toolShell(title, innerHtml){
    const div = document.createElement("div");
    div.className = "tool";
    div.innerHTML = `
      <div class="tool-title">${escapeHtml(title)}</div>
      ${innerHtml}
    `;
    return div;
  }

  function toNum(v){
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  function format(n, decimals=2){
    if(!Number.isFinite(n)) return "—";
    return n.toFixed(decimals).replace(".", ",");
  }

  function classifySeverity(level){
    if(level === 0) return "Normal/limítrofe";
    if(level === 1) return "Leve";
    if(level === 2) return "Moderada";
    if(level === 3) return "Grave";
    return "—";
  }

  function renderTool(toolName){
    if(toolName === "insall-salvati"){
      const node = toolShell("Calculadora – Insall–Salvati", `
        <div class="tool-grid">
          <label>Comprimento do tendão patelar (TL), em mm
            <input id="tl" inputmode="decimal" placeholder="ex.: 52" />
          </label>
          <label>Comprimento da patela (PL), em mm
            <input id="pl" inputmode="decimal" placeholder="ex.: 45" />
          </label>
        </div>
        <div class="tool-actions">
          <button class="btn" id="calc">Calcular</button>
          <button class="btn" id="clear">Limpar</button>
        </div>
        <div class="result" id="out"><strong>Resultado:</strong> —</div>
        <div class="note">
          Referência prática (adultos): normal ~0,8–1,2; patela alta &gt;1,2; patela baixa &lt;0,8.
        </div>
      `);

      els.content.appendChild(node);

      node.querySelector("#calc").addEventListener("click", () => {
        const tl = toNum(node.querySelector("#tl").value);
        const pl = toNum(node.querySelector("#pl").value);
        const out = node.querySelector("#out");

        if(!Number.isFinite(tl) || !Number.isFinite(pl) || pl <= 0){
          out.innerHTML = `<strong>Resultado:</strong> valores inválidos.`;
          return;
        }

        const ratio = tl / pl;
        let interp = "Normal/limítrofe";
        if(ratio > 1.2) interp = "Sugestivo de patela alta";
        else if(ratio < 0.8) interp = "Sugestivo de patela baixa";

        out.innerHTML = `<strong>Resultado:</strong> TL/PL = ${format(ratio, 2)}. Interpretação: ${escapeHtml(interp)}.`;
      });

      node.querySelector("#clear").addEventListener("click", () => {
        node.querySelector("#tl").value = "";
        node.querySelector("#pl").value = "";
        node.querySelector("#out").innerHTML = `<strong>Resultado:</strong> —`;
      });

      return;
    }

    if(toolName === "tad"){
      const node = toolShell("Calculadora – TAD (Tip–Apex Distance)", `
        <div class="tool-grid">
          <label>Distância no AP (mm)
            <input id="ap" inputmode="decimal" placeholder="ex.: 12" />
          </label>
          <label>Distância no perfil (mm)
            <input id="lat" inputmode="decimal" placeholder="ex.: 10" />
          </label>
        </div>
        <div class="tool-actions">
          <button class="btn" id="calc">Calcular</button>
          <button class="btn" id="clear">Limpar</button>
        </div>
        <div class="result" id="out"><strong>Resultado:</strong> —</div>
        <div class="note">
          Regra prática usada em osteossíntese do fêmur proximal: alvo frequentemente citado &lt;25 mm (menor risco de cut-out), considerando técnica e qualidade da redução.
        </div>
      `);

      els.content.appendChild(node);

      node.querySelector("#calc").addEventListener("click", () => {
        const ap = toNum(node.querySelector("#ap").value);
        const lat = toNum(node.querySelector("#lat").value);
        const out = node.querySelector("#out");

        if(!Number.isFinite(ap) || !Number.isFinite(lat) || ap < 0 || lat < 0){
          out.innerHTML = `<strong>Resultado:</strong> valores inválidos.`;
          return;
        }

        const tad = ap + lat;
        let interp = "Alvo não atingido (rever posicionamento / técnica)";
        if(tad < 25) interp = "Alvo geralmente considerado adequado (<25 mm)";

        out.innerHTML = `<strong>Resultado:</strong> TAD = ${format(tad, 1)} mm. Interpretação: ${escapeHtml(interp)}.`;
      });

      node.querySelector("#clear").addEventListener("click", () => {
        node.querySelector("#ap").value = "";
        node.querySelector("#lat").value = "";
        node.querySelector("#out").innerHTML = `<strong>Resultado:</strong> —`;
      });

      return;
    }

    if(toolName === "hallux-valgus"){
      const node = toolShell("Calculadora – Hallux Valgus (gravidade por ângulos informados)", `
        <div class="tool-grid">
          <label>HVA – Hallux Valgus Angle (graus)
            <input id="hva" inputmode="decimal" placeholder="ex.: 28" />
          </label>
          <label>IMA – Intermetatarsal Angle (graus)
            <input id="ima" inputmode="decimal" placeholder="ex.: 13" />
          </label>
          <label>DMAA – Distal Metatarsal Articular Angle (graus) (opcional)
            <input id="dmaa" inputmode="decimal" placeholder="ex.: 12" />
          </label>
          <label>Critério para gravidade final
            <select id="rule">
              <option value="max">Pior categoria (HVA/IMA/DMAA)</option>
              <option value="hva">Somente HVA</option>
              <option value="ima">Somente IMA</option>
            </select>
          </label>
        </div>
        <div class="tool-actions">
          <button class="btn" id="calc">Classificar</button>
          <button class="btn" id="clear">Limpar</button>
        </div>
        <div class="result" id="out"><strong>Resultado:</strong> —</div>
        <div class="note">
          Faixas práticas comuns: HVA normal &lt;15; leve 15–20; moderada 21–40; grave &gt;40. IMA normal &lt;9; leve 9–11; moderada 12–15; grave ≥16.
          DMAA varia por referência; aqui é apenas informativo se você optar por “pior categoria”.
        </div>
      `);

      els.content.appendChild(node);

      function levelHVA(hva){
        if(!Number.isFinite(hva)) return null;
        if(hva < 15) return 0;
        if(hva <= 20) return 1;
        if(hva <= 40) return 2;
        return 3;
      }

      function levelIMA(ima){
        if(!Number.isFinite(ima)) return null;
        if(ima < 9) return 0;
        if(ima <= 11) return 1;
        if(ima <= 15) return 2;
        return 3;
      }

      function levelDMAA(dmaa){
        if(!Number.isFinite(dmaa)) return null;
        if(dmaa < 10) return 0;
        if(dmaa <= 15) return 1;
        if(dmaa <= 20) return 2;
        return 3;
      }

      node.querySelector("#calc").addEventListener("click", () => {
        const hva = toNum(node.querySelector("#hva").value);
        const ima = toNum(node.querySelector("#ima").value);
        const dmaa = toNum(node.querySelector("#dmaa").value);
        const rule = node.querySelector("#rule").value;
        const out = node.querySelector("#out");

        const lhva = levelHVA(hva);
        const lima = levelIMA(ima);
        const ldmaa = levelDMAA(dmaa);

        if(!Number.isFinite(hva) && !Number.isFinite(ima)){
          out.innerHTML = `<strong>Resultado:</strong> informe ao menos HVA ou IMA.`;
          return;
        }

        let finalLevel = null;
        if(rule === "hva") finalLevel = lhva;
        else if(rule === "ima") finalLevel = lima;
        else {
          const levels = [lhva, lima, ldmaa].filter(v => v !== null);
          finalLevel = Math.max(...levels);
        }

        const parts = [];
        if(Number.isFinite(hva)) parts.push(`HVA ${format(hva, 1)}° → ${classifySeverity(lhva)}`);
        if(Number.isFinite(ima)) parts.push(`IMA ${format(ima, 1)}° → ${classifySeverity(lima)}`);
        if(Number.isFinite(dmaa)) parts.push(`DMAA ${format(dmaa, 1)}° → ${classifySeverity(ldmaa)}`);

        out.innerHTML = `<strong>Resultado:</strong> Gravidade final: ${escapeHtml(classifySeverity(finalLevel))}.<br/>${escapeHtml(parts.join(" | "))}`;
      });

      node.querySelector("#clear").addEventListener("click", () => {
        node.querySelector("#hva").value = "";
        node.querySelector("#ima").value = "";
        node.querySelector("#dmaa").value = "";
        node.querySelector("#out").innerHTML = `<strong>Resultado:</strong> —`;
      });

      return;
    }
  }

  async function renderPage(id){
    const page = state.pageById.get(id);
    if(!page){
      els.topbarTitle.textContent = "Página não encontrada";
      els.content.innerHTML = `<h1>Página não encontrada</h1><p>Revise o link ou a configuração em <code>content/pages.json</code>.</p>`;
      return;
    }

    state.currentId = id;
    setActiveNav(id);
    els.topbarTitle.textContent = page.title;

    try{
      const md = await loadMarkdown(page.file);
      els.content.innerHTML = marked.parse(md);
      if(page.tool) renderTool(page.tool);
      document.title = `OrtoPocket · ${page.title}`;
    } catch(err){
      els.content.innerHTML = `<h1>Erro ao carregar conteúdo</h1><p>${escapeHtml(err.message)}</p>`;
    }
  }

  async function init(){
    els.menuToggle.addEventListener("click", () => {
      const open = !els.sidebar.classList.contains("open");
      setSidebarOpen(open);
    });

    const pages = await fetch("content/pages.json", { cache: "no-store" }).then(r => r.json());
    state.pages = pages;
    state.pageById = new Map(pages.map(p => [p.id, p]));
    state.filtered = [...pages];

    els.searchInput.addEventListener("input", (e) => {
      applySearch(e.target.value);
      buildNav(state.filtered);
      setActiveNav(state.currentId);
    });

    window.addEventListener("hashchange", () => {
      const id = parseRoute();
      renderPage(id);
    });

    buildNav(state.filtered);

    const id = parseRoute();
    renderPage(id);

    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  init().catch(err => {
    els.content.innerHTML = `<h1>Falha de inicialização</h1><p>${escapeHtml(err.message)}</p>`;
  });
})();