/* ==========================================================================
   JK CHOPP — SCRIPT.JS (COMPLETO, ORGANIZADO E COMENTADO)
   SPA simples com Drawer/Accordion, templates leves via JS e estado local.
   Seções:
   00) Helpers
   01) Estado/Persistência
   02) Topbar (tema/backup/import/reset)
   03) Navegação (Drawer + Accordion + Rotas)
   04) Telas (Home, Clientes, Produtos, Pedidos, Financeiro, Contratos, Agenda)
   05) Relatórios → Relatório de Repasse (sua tela integrada)
   06) Placeholders + Roteador
   07) Boot
   ========================================================================== */
// No início do arquivo, após as declarações
function checkAuth() {
    if (!authSystem.checkAuth()) {
        showLoginModal();
        return false;
    }
    return true;
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
}

// Modifique o boot sequence
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação primeiro
    if (!checkAuth()) {
        // Bind eventos do modal de login
        document.getElementById('btnLogin')?.addEventListener('click', () => {
            const user = document.getElementById('loginUser').value;
            const pass = document.getElementById('loginPass').value;
            
            if (authSystem.login(user, pass)) {
                hideLoginModal();
                initializeApp();
            } else {
                alert('Usuário ou senha inválidos!');
            }
        });
        
        document.getElementById('closeLogin')?.addEventListener('click', hideLoginModal);
        return;
    }
    
    initializeApp();
});

function initializeApp() {
    bindTopbarActions();
    bindDrawerActions();
    buildMenu();
    renderActive();
    
    // Adicionar botão de logout no topbar
    addLogoutButton();
}

function addLogoutButton() {
    const topActions = document.querySelector('.top-actions');
    if (topActions && !document.getElementById('btnLogout')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn danger';
        logoutBtn.id = 'btnLogout';
        logoutBtn.innerHTML = '🚪 Sair';
        logoutBtn.title = 'Logout';
        logoutBtn.onclick = () => {
            if (confirm('Deseja sair do sistema?')) {
                authSystem.logout();
            }
        };
        topActions.appendChild(logoutBtn);
    }
}
/* === 00) HELPERS ======================================================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmt = {
  money: (v) => (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  num:   (v) => (Number(v || 0)).toLocaleString("pt-BR"),
  date:  (v) => (v ? new Date(v).toLocaleDateString("pt-BR") : ""),
};
const uid = () => Math.random().toString(36).slice(2, 9);

/** Converte "1.234,56", "1234.56" ou "1234" → 1234.56 */
function toNumber(v){
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v == null) return 0;
  const s0 = String(v).trim();
  if (!s0) return 0;
  const hasComma = s0.includes(","), hasDot = s0.includes(".");
  let s = s0;
  if (hasComma && hasDot){
    const lc = s0.lastIndexOf(","), ld = s0.lastIndexOf(".");
    s = (lc > ld) ? s0.replace(/\./g,"").replace(",",".") : s0.replace(/,/g,"");
  } else if (hasComma){
    s = s0.replace(",",".");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

/** Converte "R$ 1.234,56" → 1234.56 */
const parseBRL = (str) => Number(String(str ?? "").replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",", ".") || 0);

/** HTML para botão de ação com ícone */
const iconBtn = (act, id, title, emoji) =>
  `<button class="icon-btn" data-act="${act}" data-id="${id}" title="${title}">${emoji}</button>`;

/* === 01) ESTADO / PERSISTÊNCIA ========================================= */
const DEF = {
  clientes:   [],
  produtos:   [],
  pedidos:    [],
  contratos:  [],
  financeiro: [],
  agenda:     [],
  perfil:     { nome: "", nascimento: "", setor: "", fotoB64: "" },

  // Novo: estado do Relatório de Repasse (sua tela integrada)
  repasse: {
    header: { dataIni: "", dataFim: "", dataPagamento: "" },
    split:  { percMarcos: 50, percJK: 50 },
    clientes: [
      // { id, cliente, marca, qtdLitros, custoPorLitro, qtdBarris, venda }
    ],
    despesas: [
      // { id, descricao, valor, obs, partJK, partMarcos, pago }
    ]
  }
};

let DB = load();

function load() {
  try {
    const obj = JSON.parse(localStorage.getItem("jk_data")) || { ...DEF };
    // Garantir estrutura repasse mesmo em bases antigas
    if (!obj.repasse) obj.repasse = JSON.parse(JSON.stringify(DEF.repasse));
    if (!obj.repasse.header) obj.repasse.header = { ...DEF.repasse.header };
    if (!obj.repasse.split)  obj.repasse.split  = { ...DEF.repasse.split };
    if (!Array.isArray(obj.repasse.clientes)) obj.repasse.clientes = [];
    if (!Array.isArray(obj.repasse.despesas)) obj.repasse.despesas = [];
    return obj;
  } catch { return { ...DEF }; }
}
function save() { localStorage.setItem("jk_data", JSON.stringify(DB)); }
function reset() {
  localStorage.removeItem("jk_data");
  DB = { ...DEF };
  renderActive();
}

/* === 02) TOPBAR (tema/backup/import/reset) ============================== */
function toggleTheme() {
  const next = document.body.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem("jk_theme", next);
}
(function initTheme() {
  const t = localStorage.getItem("jk_theme") || "dark";
  document.body.setAttribute("data-theme", t);
})();

function doExport() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "jkchopp_backup.json" });
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(ev) {
  const f = ev.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const incoming = JSON.parse(r.result);
      // mesclar garantindo repasse
      DB = { ...DEF, ...incoming };
      if (!DB.repasse) DB.repasse = JSON.parse(JSON.stringify(DEF.repasse));
      save();
      ev.target.value = "";
      renderActive();
      alert("Importação concluída ✅");
    } catch {
      alert("Arquivo inválido ❌");
    }
  };
  r.readAsText(f);
}

function bindTopbarActions() {
  $("#btnTheme")?.addEventListener("click", toggleTheme);
  $("#btnExport")?.addEventListener("click", doExport);
  $("#importFile")?.addEventListener("change", handleImport);
  $("#btnReset")?.addEventListener("click", () => {
    if (confirm("Isto vai apagar os dados locais. Deseja continuar?")) reset();
  });
  $("#btnPerfil")?.addEventListener("click", () => {
    alert("Perfil do usuário — em breve 😉");
  });
}

/* === 03) NAVEGAÇÃO (Drawer + Accordion + Rotas) ======================== */
const MENU = [
  { id: "home",           label: "Início",               icon: "🏠" },
  { id: "agendamentos",   label: "Agenda",               icon: "📅" },

  {
    label: "Contatos", icon: "📞",
    children: [
      { id: "clientes_pf",     label: "Clientes Físicos",   icon: "👤" },
      { id: "clientes_pj",     label: "Clientes Jurídicos", icon: "🏢" },
      { id: "fornecedores",    label: "Fornecedores",       icon: "🛒" },
      { id: "funcionarios",    label: "Funcionários",       icon: "🧑‍💼" },
      { id: "grupos_preco",    label: "Grupos de Preço",    icon: "👥" },
      { id: "interacoes",      label: "Interações",         icon: "💬" },
      { id: "transportadoras", label: "Transportadoras",    icon: "🚚" },
    ],
  },

  { id: "produtos",       label: "Equipamentos/Produtos", icon: "🧰" },
  { id: "estoque",        label: "Estoque",               icon: "📦" },
  { id: "financeiro",     label: "Financeiro",            icon: "💰" },
  { id: "nfe_boletos",    label: "NF-e e Boletos",        icon: "🧾" },

  {
    label: "Relatórios", icon: "📊",
    children: [
      { id: "relatorios",   label: "Painel",               icon: "🗂️" },
      { id: "rel_repasse",  label: "Relatório de Repasse", icon: "💸" },
    ],
  },

  { id: "contratos",      label: "Contratos",             icon: "📄" },
  { id: "ajuda",          label: "Central de ajuda",      icon: "❓" },
];

let ACTIVE = localStorage.getItem("jk_tab") || "home";

const drawer   = $("#menuDrawer");
const backdrop = $("#backdrop");
const menuList = $("#menuList");

function openMenu()  { drawer?.classList.add("open");  backdrop?.classList.add("open");  drawer?.setAttribute("aria-hidden","false"); }
function closeMenu() { drawer?.classList.remove("open");backdrop?.classList.remove("open");drawer?.setAttribute("aria-hidden","true"); }
function toggleMenu(){ drawer?.classList.contains("open") ? closeMenu() : openMenu(); }

function bindDrawerActions() {
  $("#btnMenu")?.addEventListener("click", toggleMenu);
  $("#btnCloseMenu")?.addEventListener("click", closeMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && drawer?.classList.contains("open")) closeMenu();
  });
}

function buildMenu() {
  if (!menuList) return;
  menuList.innerHTML = "";

  MENU.forEach(group => {
    if (group.children?.length) {
      const parent = document.createElement("div");
      parent.className = "menu-item menu-parent";
      parent.innerHTML = `<span>${group.icon || "📁"} ${group.label}</span><span class="caret">▶</span>`;

      const sub = document.createElement("div");
      sub.className = "submenu";

      group.children.forEach(child => {
        const btn = document.createElement("button");
        btn.className = "submenu-item";
        btn.textContent = `${child.icon || "•"} ${child.label}`;
        btn.dataset.id = child.id;
        btn.onclick = () => {
          ACTIVE = child.id; localStorage.setItem("jk_tab", ACTIVE);
          renderActive(); highlightActiveMenu(); closeMenu();
        };
        sub.appendChild(btn);
      });

      parent.addEventListener("click", (ev) => {
        if (ev.target.closest(".submenu-item")) return;
        parent.classList.toggle("open");
        sub.classList.toggle("open");
      });

      menuList.appendChild(parent);
      menuList.appendChild(sub);
      return;
    }

    const single = document.createElement("button");
    single.className = "menu-item";
    single.textContent = `${group.icon || "•"} ${group.label}`;
    single.dataset.id = group.id;
    single.onclick = () => {
      ACTIVE = group.id; localStorage.setItem("jk_tab", ACTIVE);
      renderActive(); highlightActiveMenu(); closeMenu();
    };
    menuList.appendChild(single);
  });

  highlightActiveMenu();
}
function highlightActiveMenu() {
  $$(".menu-item", menuList).forEach(e => e.classList.remove("active","open"));
  $$(".submenu", menuList).forEach(e => e.classList.remove("open"));
  $$(".submenu-item", menuList).forEach(e => e.classList.remove("active"));

  const child = $(`.submenu-item[data-id="${ACTIVE}"]`, menuList);
  if (child) {
    child.classList.add("active");
    const sub = child.closest(".submenu");
    const parent = sub?.previousElementSibling;
    sub?.classList.add("open");
    parent?.classList.add("open");
    return;
  }
  $(`.menu-item[data-id="${ACTIVE}"]`, menuList)?.classList.add("active");
}

/* === 04) TELAS ========================================================== */
/* ---- HOME -------------------------------------------------------------- */
function renderHome() {
  const wrap = document.createElement("div");
  wrap.className = "grid-home";

  const abertos = DB.pedidos.filter(p => ["Aberto","Em Atendimento"].includes(p.status)).length;
  const concluidos = DB.pedidos.filter(p => p.status === "Concluído").length;

  const cardPedidos = document.createElement("section");
  cardPedidos.className = "card card-stats";
  cardPedidos.innerHTML = `
    <h3>Pedidos — Visão Geral</h3>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">${abertos}</span>
        <span class="stat-label">Abertos / Aguardando pagamento</span>
      </div>
      <div class="stat">
        <span class="stat-value">${concluidos}</span>
        <span class="stat-label">Concluídos</span>
      </div>
    </div>
    <div class="row">
      <button class="btn success" id="goNovoPedido">➕ Novo Pedido</button>
      <button class="btn" id="goPedidos">📋 Ver todos</button>
    </div>
  `;
  cardPedidos.querySelector("#goNovoPedido")?.addEventListener("click", () => {
    const cliente = prompt("Cliente (nome)"); if (!cliente) return;
    const itens = prompt("Itens (ex.: Chopeira x1; Barril 50L x2)");
    const total = parseBRL(prompt("Total (R$)") ?? 0);
    DB.pedidos.unshift({ id: uid(), codigo: ("P" + Date.now()).slice(-6), cliente, itens, total, status: "Aberto" });
    save(); renderActive();
  });
  cardPedidos.querySelector("#goPedidos")?.addEventListener("click", () => {
    ACTIVE = "pedidos"; localStorage.setItem("jk_tab", ACTIVE); renderActive();
  });

  const cardAgenda = document.createElement("section");
  cardAgenda.className = "card";
  cardAgenda.innerHTML = `
    <h3>Agenda — Próximos compromissos</h3>
    <div class="toolbar">
      <div class="row">
        <input id="home_ag_titulo" class="input" placeholder="Título" />
        <input id="home_ag_data"   class="input" type="date" />
        <input id="home_ag_hora"   class="input" type="time" />
        <button class="btn success" id="homeAddAgenda">➕ Adicionar</button>
        <button class="btn" id="goAgenda">📅 Abrir Agenda</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table-compact">
        <thead><tr><th>Data</th><th>Hora</th><th>Título</th><th></th></tr></thead>
        <tbody id="home_ag_tbody"></tbody>
      </table>
    </div>
  `;

  function listMiniAgenda() {
    const tbody = cardAgenda.querySelector("#home_ag_tbody");
    const rows = DB.agenda.slice().sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora)).slice(0, 6);
    tbody.innerHTML = rows.map(a => `
      <tr>
        <td>${fmt.date(a.data)}</td>
        <td>${a.hora || "—"}</td>
        <td>${a.titulo}</td>
        <td>${iconBtn("del", a.id, "Excluir", "🗑️")}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="empty">Sem agendamentos...</td></tr>`;
  }
  cardAgenda.addEventListener("click", (ev) => {
    const b = ev.target.closest("button.icon-btn"); if (!b) return;
    const id = b.dataset.id;
    DB.agenda = DB.agenda.filter(x => x.id !== id);
    save(); listMiniAgenda();
  });
  cardAgenda.querySelector("#homeAddAgenda")?.addEventListener("click", () => {
    const titulo = cardAgenda.querySelector("#home_ag_titulo").value.trim();
    const data   = cardAgenda.querySelector("#home_ag_data").value;
    const hora   = cardAgenda.querySelector("#home_ag_hora").value;
    if (!titulo || !data) { alert("Informe título e data."); return; }
    DB.agenda.push({ id: uid(), titulo, data, hora });
    save();
    cardAgenda.querySelector("#home_ag_titulo").value = "";
    listMiniAgenda();
  });
  cardAgenda.querySelector("#goAgenda")?.addEventListener("click", () => {
    ACTIVE = "agendamentos"; localStorage.setItem("jk_tab", ACTIVE); renderActive();
  });

  listMiniAgenda();
  wrap.appendChild(cardPedidos);
  wrap.appendChild(cardAgenda);
  return wrap;
}

/* ---- CLIENTES ---------------------------------------------------------- */
function renderClientes() {
  const tpl = document.importNode($("#tpl-clientes").content, true);
  const TB  = $("tbody", tpl);
  const info = $("#infoClientes", tpl);

  function maskDoc() {
    const tipo = $("#cli_tipo", tpl).value;
    const el = $("#cli_doc", tpl);
    let v = el.value.replace(/\D/g, "");
    if (tipo === "PF") {
      v = v.padEnd(11,"").slice(0,11).replace(
        /(\d{3})(\d{3})(\d{3})(\d{0,2})/,
        (_,a,b,c,d)=> d?`${a}.${b}.${c}-${d}`: c?`${a}.${b}.${c}`: b?`${a}.${b}`: a
      );
    } else {
      v = v.padEnd(14,"").slice(0,14).replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
        (_,a,b,c,d,e)=> e?`${a}.${b}.${c}/${d}-${e}`: d?`${a}.${b}.${c}/${d}`: c?`${a}.${b}.${c}`: b?`${a}.${b}`: a
      );
    }
    el.value = v;
  }
  $("#cli_tipo", tpl).addEventListener("change", maskDoc);
  $("#cli_doc", tpl).addEventListener("input", maskDoc);

  function clear() {
    ["cli_id","cli_doc","cli_nome","cli_fantasia","cli_contato","cli_end"].forEach(id => $("#"+id, tpl).value="");
    $("#cli_tipo", tpl).value = "PF";
    $("#cli_fixo", tpl).checked = false;
    $("#cli_ativo", tpl).checked = true;
    $("#cli_delivery", tpl).checked = false;
  }
  $("#btnLimparCliente", tpl).onclick = clear;

  $("#btnSalvarCliente", tpl).onclick = () => {
    const obj = {
      id: $("#cli_id", tpl).value || uid(),
      tipo: $("#cli_tipo", tpl).value,
      doc: $("#cli_doc", tpl).value.trim(),
      nome: $("#cli_nome", tpl).value.trim(),
      fantasia: $("#cli_fantasia", tpl).value.trim(),
      contato: $("#cli_contato", tpl).value.trim(),
      end: $("#cli_end", tpl).value.trim(),
      fixo: $("#cli_fixo", tpl).checked,
      ativo: $("#cli_ativo", tpl).checked,
      delivery: $("#cli_delivery", tpl).checked,
      criado: Date.now(),
    };
    if (!obj.doc || !obj.nome) { alert("Preencha Documento e Nome."); return; }
    const i = DB.clientes.findIndex((x) => x.id === obj.id);
    if (i >= 0) DB.clientes[i] = obj; else DB.clientes.push(obj);
    save(); list(); clear(); if (obj.fixo) ensureContrato(obj);
  };

  function ensureContrato(cli) {
    const exist = DB.contratos.find((c) => c.clienteId === cli.id);
    if (!exist) {
      DB.contratos.push({ id: uid(), clienteId: cli.id, cliente: cli.nome, status: "Pendente", data: Date.now() });
      save();
    }
  }

  function list() {
    const q = $("#buscaClientes", tpl).value.toLowerCase();
    const rows = DB.clientes
      .filter((c) => !q || [c.nome, c.doc, c.contato].some((v) => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    info.textContent = rows.length + " cliente(s)";
    TB.innerHTML = rows.map(c => `
      <tr>
        <td>${c.nome}</td><td>${c.tipo}</td><td>${c.doc}</td>
        <td>${c.contato || ""}</td>
        <td>${c.fixo ? '<span class="tag ok">Ponto Fixo</span>' : "—"}</td>
        <td>
          ${iconBtn("edit", c.id, "Editar", "✏️")}
          ${iconBtn("del",  c.id, "Excluir", "🗑️")}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="empty">Sem clientes...</td></tr>`;
  }
  $("#buscaClientes", tpl).addEventListener("input", list);

  TB.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    const id = b.dataset.id; const c = DB.clientes.find((x) => x.id === id);
    if (b.dataset.act === "edit" && c) {
      $("#cli_id", tpl).value = c.id; $("#cli_tipo", tpl).value = c.tipo;
      $("#cli_doc", tpl).value = c.doc; maskDoc();
      $("#cli_nome", tpl).value = c.nome; $("#cli_fantasia", tpl).value = c.fantasia || "";
      $("#cli_contato", tpl).value = c.contato || ""; $("#cli_end", tpl).value = c.end || "";
      $("#cli_fixo", tpl).checked = !!c.fixo; $("#cli_ativo", tpl).checked = !!c.ativo;
      $("#cli_delivery", tpl).checked = !!c.delivery;
    }
    if (b.dataset.act === "del" && confirm("Excluir este cliente?")) {
      DB.clientes = DB.clientes.filter((x) => x.id !== id);
      DB.pedidos  = DB.pedidos.filter((p) => p.clienteId !== id);
      DB.contratos= DB.contratos.filter((k) => k.clienteId !== id);
      save(); list();
    }
  });

  if (ACTIVE === "clientes_pf" || ACTIVE === "clientes_pj") {
    $("#cli_tipo", tpl).value = ACTIVE === "clientes_pf" ? "PF" : "PJ";
  }

  list();
  return tpl;
}

/* ---- PRODUTOS ---------------------------------------------------------- */
function renderProdutos() {
  const tpl = document.importNode($("#tpl-produtos").content, true);
  const TB  = $("tbody", tpl);

  function clear() {
    ["prd_id","prd_nome","prd_codigo","prd_preco"].forEach(id => $("#"+id, tpl).value="");
    $("#prd_tipo", tpl).value = "Chopeira";
    $("#prd_estoque_ctrl", tpl).checked = true;
  }
  $("#btnLimparProduto", tpl).onclick = clear;

  $("#btnSalvarProduto", tpl).onclick = () => {
    const obj = {
      id: $("#prd_id", tpl).value || uid(),
      tipo: $("#prd_tipo", tpl).value,
      nome: $("#prd_nome", tpl).value.trim(),
      codigo: $("#prd_codigo", tpl).value.trim(),
      preco: parseBRL($("#prd_preco", tpl).value),
      estoque: 0,
      ctrl: $("#prd_estoque_ctrl", tpl).checked,
    };
    if (!obj.nome) { alert("Informe o nome do produto."); return; }
    const i = DB.produtos.findIndex((x) => x.id === obj.id);
    if (i >= 0) DB.produtos[i] = obj; else DB.produtos.push(obj);
    save(); list(); clear();
  };

  function list() {
    const q = $("#buscaProdutos", tpl).value.toLowerCase();
    const rows = DB.produtos
      .filter((p) => !q || [p.nome,p.tipo,p.codigo].some(v => (v||"").toLowerCase().includes(q)))
      .sort((a,b) => a.nome.localeCompare(b.nome));
    $("#infoProdutos", tpl).textContent = rows.length + " produto(s)";
    TB.innerHTML = rows.map(p => `
      <tr>
        <td>${p.nome}</td><td>${p.tipo}</td><td>${p.codigo || "—"}</td>
        <td>${fmt.money(p.preco)}</td><td>${p.ctrl ? p.estoque : '<span class="muted">N/C</span>'}</td>
        <td>
          ${iconBtn("edit", p.id, "Editar", "✏️")}
          ${iconBtn("del",  p.id, "Excluir", "🗑️")}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="empty">Sem produtos...</td></tr>`;
  }

  TB.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    const id = b.dataset.id; const p = DB.produtos.find((x)=>x.id===id);
    if (b.dataset.act === "edit" && p) {
      $("#prd_id", tpl).value = p.id; $("#prd_tipo", tpl).value = p.tipo;
      $("#prd_nome", tpl).value = p.nome; $("#prd_codigo", tpl).value = p.codigo || "";
      $("#prd_preco", tpl).value = String(p.preco).replace(".", ",");
      $("#prd_estoque_ctrl", tpl).checked = !!p.ctrl;
    }
    if (b.dataset.act === "del" && confirm("Excluir este produto?")) {
      DB.produtos = DB.produtos.filter((x)=>x.id!==id); save(); list();
    }
  });

  $("#buscaProdutos", tpl).addEventListener("input", list);
  list(); return tpl;
}

/* ---- PEDIDOS ----------------------------------------------------------- */
function renderPedidos() {
  const tpl = document.importNode($("#tpl-pedidos").content, true);
  const TB  = $("tbody", tpl);

  function novoPedido() {
    const cliente = prompt("Cliente (nome)"); if (!cliente) return;
    const itens = prompt("Itens (ex.: Chopeira x1; Barril 50L x2)");
    const total = parseBRL(prompt("Total (R$)") ?? 0);
    DB.pedidos.unshift({ id: uid(), codigo: ("P" + Date.now()).slice(-6), cliente, itens, total, status: "Aberto" });
    save(); list();
  }
  $("#btnNovoPedido", tpl).onclick = novoPedido;

  function list() {
    const q  = $("#buscaPedidos", tpl).value.toLowerCase();
    const fs = $("#filtroStatus", tpl).value;
    const rows = DB.pedidos.filter(p =>
      (!q  || [p.cliente,p.codigo,p.itens].some(v => (v||"").toLowerCase().includes(q))) &&
      (!fs || p.status === fs)
    );
    $("#vazioPedidos", tpl).classList.toggle("hidden", rows.length>0);
    TB.innerHTML = rows.map(p => `
      <tr>
        <td>${p.codigo}</td><td>${p.cliente}</td><td>${p.itens || "—"}</td>
        <td>${fmt.money(p.total || 0)}</td>
        <td>
          <select data-id="${p.id}" class="input selStatus">
            ${["Aberto","Em Atendimento","Concluído","Recebido"].map(s=>`<option ${p.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>
        <td>${iconBtn("del", p.id, "Excluir", "🗑️")}</td>
      </tr>
    `).join("");
  }
  TB.addEventListener("change", (ev) => {
    const s = ev.target.closest(".selStatus"); if (!s) return;
    const p = DB.pedidos.find((x)=>x.id===s.dataset.id); if (!p) return;
    p.status = s.value; save();
  });
  TB.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.act==="del" && confirm("Excluir pedido?")) {
      DB.pedidos = DB.pedidos.filter(x=>x.id!==b.dataset.id); save(); list();
    }
  });
  $("#buscaPedidos", tpl).addEventListener("input", list);
  $("#filtroStatus", tpl).addEventListener("change", list);
  list(); return tpl;
}

/* ---- FINANCEIRO -------------------------------------------------------- */
function renderFinanceiro() {
  const tpl = document.importNode($("#tpl-financeiro").content, true);
  const TB  = $("tbody", tpl);

  function clear() {
    ["fin_id","fin_doc","fin_cliente","fin_valor","fin_venc"].forEach(id => $("#"+id, tpl).value="");
    $("#fin_tipo", tpl).value = "Receber";
  }
  $("#btnLimparTitulo", tpl).onclick = clear;

  $("#btnSalvarTitulo", tpl).onclick = () => {
    const t = {
      id: $("#fin_id", tpl).value || uid(),
      doc: $("#fin_doc", tpl).value.trim(),
      cliente: $("#fin_cliente", tpl).value.trim(),
      valor: parseBRL($("#fin_valor", tpl).value),
      tipo: $("#fin_tipo", tpl).value,
      venc: $("#fin_venc", tpl).value,
    };
    if (!t.doc || !t.valor) { alert("Informe Documento e Valor."); return; }
    const i = DB.financeiro.findIndex(x=>x.id===t.id);
    if (i>=0) DB.financeiro[i]=t; else DB.financeiro.push(t);
    save(); list(); clear();
  };

  function saldo() {
    const rec = DB.financeiro.filter(x=>x.tipo==="Receber").reduce((s,x)=>s+x.valor,0);
    const pag = DB.financeiro.filter(x=>x.tipo==="Pagar").reduce((s,x)=>s+x.valor,0);
    $("#finSaldo", tpl).textContent = fmt.money(rec - pag);
  }

  function list() {
    const q = $("#buscaFinanceiro", tpl).value.toLowerCase();
    const ft = $("#filtroTipoFin", tpl).value;
    const rows = DB.financeiro
      .filter(x => (!q || [x.doc,x.cliente].some(v=>(v||"").toLowerCase().includes(q))) && (!ft || x.tipo===ft))
      .sort((a,b) => (a.venc||"").localeCompare(b.venc||""));
    TB.innerHTML = rows.map(x=>`
      <tr>
        <td>${x.doc}</td><td>${x.cliente || "—"}</td><td>${fmt.money(x.valor)}</td>
        <td>${x.tipo}</td><td>${x.venc ? fmt.date(x.venc) : "—"}</td>
        <td>
          ${iconBtn("edit", x.id, "Editar", "✏️")}
          ${iconBtn("del",  x.id, "Excluir", "🗑️")}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="empty">Sem títulos...</td></tr>`;
    saldo();
  }

  TB.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    const id = b.dataset.id; const x = DB.financeiro.find(y=>y.id===id);
    if (b.dataset.act==="edit" && x) {
      $("#fin_id", tpl).value=x.id; $("#fin_doc", tpl).value=x.doc; $("#fin_cliente", tpl).value=x.cliente||"";
      $("#fin_valor", tpl).value=String(x.valor).replace(".", ","); $("#fin_tipo", tpl).value=x.tipo; $("#fin_venc", tpl).value=x.venc||"";
    }
    if (b.dataset.act==="del" && confirm("Excluir título?")) {
      DB.financeiro = DB.financeiro.filter(y=>y.id!==id); save(); list();
    }
  });

  $("#buscaFinanceiro", tpl).addEventListener("input", list);
  $("#filtroTipoFin", tpl).addEventListener("change", list);
  list(); return tpl;
}

/* ---- CONTRATOS --------------------------------------------------------- */
function renderContratos() {
  const tpl = document.importNode($("#tpl-contratos").content, true);
  const TB  = $("tbody", tpl);

  function list() {
    const rows = DB.clientes.filter(c=>c.fixo).map(c=>{
      const k = DB.contratos.find(x=>x.clienteId===c.id) || { status:"Pendente", data: Date.now() };
      return { id:k.id||uid(), clienteId:c.id, cliente:c.nome, status:k.status, data:k.data };
    });
    TB.innerHTML = rows.map(r=>`
      <tr>
        <td>${r.cliente}</td>
        <td>${r.status==="Assinado" ? '<span class="tag ok">Assinado</span>' : '<span class="tag warn">Pendente</span>'}</td>
        <td>${fmt.date(r.data)}</td>
        <td>
          ${iconBtn("gerar", r.clienteId, "Gerar contrato", "📄")}
          ${iconBtn("ass",   r.clienteId, "Marcar assinado", "✅")}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="empty">Sem clientes ponto fixo...</td></tr>`;
  }

  function contratoHTML(cli) {
    return `<!DOCTYPE html><html lang="pt-br"><meta charset="utf-8"><title>Contrato - ${cli.nome}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.5;margin:40px} h1{font-size:18px} .muted{color:#555}
      .box{border:1px solid #ccc;padding:14px;border-radius:8px}</style>
      <h1>Contrato de Comodato — JK CHOPP</h1>
      <p><b>Contratante:</b> JK CHOPP • CNPJ 00.000.000/0000-00</p>
      <p><b>Contratado:</b> ${cli.nome} (${cli.tipo}) — Doc: ${cli.doc}<br><span class="muted">Endereço: ${cli.end || "-"} • Contato: ${cli.contato || "-"}</span></p>
      <div class="box">
        <p>Este contrato estabelece o comodato de equipamentos (chopeira/barris/cilindros) para o ponto fixo do contratado, conforme disponibilidade e condições comerciais acordadas. Prazo indeterminado, podendo ser rescindido por qualquer parte com 30 dias de antecedência.</p>
        <ul>
          <li>Responsabilidade de guarda e conservação dos equipamentos;</li>
          <li>Reposição por danos causados por mau uso;</li>
          <li>Visitas técnicas mediante agendamento;</li>
          <li>Valores e consumos conforme tabelas vigentes.</li>
        </ul>
      </div>
      <p class="muted">Assinaturas digitais/eletrônicas podem ser anexadas a este documento.</p>
      <p>Data: ${new Date().toLocaleDateString("pt-BR")}</p>
      <p>__________________________<br>JK CHOPP</p>
      <p>__________________________<br>${cli.nome}</p>`;
  }

  TB.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    const id = b.dataset.id; const cli = DB.clientes.find(c=>c.id===id);
    if (!cli) { alert("Cliente não encontrado."); return; }
    if (b.dataset.act==="gerar") {
      const w = window.open("","_blank");
      w.document.write(contratoHTML(cli)); w.document.close();
    }
    if (b.dataset.act==="ass") {
      const k = DB.contratos.find(x=>x.clienteId===id);
      if (k) { k.status="Assinado"; k.data=Date.now(); save(); list(); }
    }
  });

  $("#btnGerarContratoSelecionado", tpl).onclick = () => {
    const nome = prompt("Nome do cliente ponto fixo:");
    const cli = DB.clientes.find(c => c.fixo && c.nome.toLowerCase() === String(nome||"").toLowerCase());
    if (!cli) { alert("Cliente não localizado ou não é Ponto Fixo."); return; }
    const w = window.open("","_blank"); w.document.write(contratoHTML(cli)); w.document.close();
  };

  list(); return tpl;
}

/* ---- AGENDA ------------------------------------------------------------ */
function renderAgenda() {
  const tpl = document.importNode($("#tpl-agendamentos").content, true);
  const TB  = $("tbody", tpl);

  const z2 = (n) => String(n).padStart(2, "0");
  const toYMD = (d) => `${d.getFullYear()}-${z2(d.getMonth()+1)}-${z2(d.getDate())}`;

  let calRef = new Date(); calRef.setDate(1);
  let selectedYMD = toYMD(new Date());
  $("#ag_data", tpl).value = $("#ag_data", tpl).value || selectedYMD;

  $("#btnAddAgenda", tpl).onclick = () => {
    const a = {
      id: uid(),
      titulo: $("#ag_titulo", tpl).value.trim(),
      data: $("#ag_data", tpl).value,
      hora: $("#ag_hora", tpl).value
    };
    if (!a.titulo || !a.data) { alert("Informe título e data."); return; }
    DB.agenda.push(a); save(); list(); $("#ag_titulo", tpl).value = "";
    buildCalendar();
  };

  function list() {
    const q = $("#buscaAgenda", tpl).value.toLowerCase();
    const rows = DB.agenda
      .filter(a => !q || [a.titulo,a.data,a.hora].some(v => (v||"").toLowerCase().includes(q)))
      .sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora));
    TB.innerHTML = rows.map(a=>`
      <tr>
        <td>${fmt.date(a.data)}</td><td>${a.hora || "—"}</td><td>${a.titulo}</td>
        <td>${iconBtn("del", a.id, "Excluir", "🗑️")}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="empty">Sem agendamentos...</td></tr>`;
  }

  TB.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.act==="del" && confirm("Excluir agendamento?")) {
      DB.agenda = DB.agenda.filter(x=>x.id!==b.dataset.id); save(); list(); buildCalendar();
    }
  });
  $("#buscaAgenda", tpl).addEventListener("input", list);

  const elTitle = $("#calTitle", tpl);
  const elGrid  = $("#calGrid", tpl);

  function buildCalendar() {
    elTitle.textContent = calRef.toLocaleDateString("pt-BR", { month:"long", year:"numeric" });

    const first = new Date(calRef.getFullYear(), calRef.getMonth(), 1);
    const dow = (first.getDay() + 6) % 7; // seg=0
    const start = new Date(first); start.setDate(first.getDate() - dow);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      cells.push(d);
    }

    const month = calRef.getMonth();
    const todayYMD = toYMD(new Date());
    const counts = DB.agenda.reduce((acc, a) => {
      if (!a.data) return acc;
      acc[a.data] = (acc[a.data] || 0) + 1;
      return acc;
    }, {});

    elGrid.innerHTML = cells.map(d => {
      const ymd = toYMD(d);
      const outside = d.getMonth() !== month ? "outside" : "";
      const wknd    = [6,0].includes(d.getDay()) ? "wknd" : "";
      const isToday = ymd === todayYMD ? "today" : "";
      const selected= ymd === selectedYMD ? "selected" : "";
      const dots = (counts[ymd] || 0);
      return `
        <button class="cal-day ${outside} ${wknd} ${isToday} ${selected}" data-ymd="${ymd}">
          <span class="dnum">${d.getDate()}</span>
          <div class="cal-dots">${dots ? Array.from({length: Math.min(dots, 4)}).map(()=>'<span class="cal-dot"></span>').join('') : ""}</div>
        </button>
      `;
    }).join("");

    const lastRow = Array.from(elGrid.children).slice(35, 42);
    const allOutside = lastRow.every(c => c.classList.contains("outside"));
    if (allOutside) lastRow.forEach(c => c.style.display = "none");
  }

  $("#calPrev",  tpl).onclick = () => { calRef.setMonth(calRef.getMonth() - 1); buildCalendar(); };
  $("#calNext",  tpl).onclick = () => { calRef.setMonth(calRef.getMonth() + 1); buildCalendar(); };
  $("#calToday", tpl).onclick = () => { const now = new Date(); calRef = new Date(now.getFullYear(), now.getMonth(), 1); buildCalendar(); };

  tpl.addEventListener("click", (ev) => {
    const b = ev.target.closest(".cal-day"); if (!b) return;
    const ymd = b.dataset.ymd;
    selectedYMD = ymd;
    $("#ag_data", tpl).value = ymd;
    $("#buscaAgenda", tpl).value = ymd.split("-").reverse().join("/");
    $("#ag_titulo", tpl).focus();
    buildCalendar();
    list();
  });

  buildCalendar();
  list();
  return tpl;
}

function renderRelatorios() {
  const tpl = document.importNode($("#tpl-relatorios").content, true);

  // (Opcional) ligações simples para os botões do template
  $("#btnGerarRelatorio", tpl)?.addEventListener("click", () => {
    alert("Gerador de relatório: em breve.");
  });
  $("#btnCSV", tpl)?.addEventListener("click", () => {
    alert("Exportar CSV: em breve.");
  });

  return tpl;
}

/* === 05) RELATÓRIOS → RELATÓRIO DE REPASSE (SEM UI DE %) =============== */
function renderRelRepasse() {
  // Garante uma linha inicial em cada tabela para começar
  if (!DB.repasse.clientes.length) DB.repasse.clientes.push({ id:uid(), cliente:"", marca:"", qtdLitros:30, custoPorLitro:0, qtdBarris:1, venda:0 });
  if (!DB.repasse.despesas.length) DB.repasse.despesas.push({ id:uid(), descricao:"", valor:0, obs:"", partJK:0, partMarcos:0, pago:false });

  const wrap = document.createElement("section");
  wrap.className = "stack";

  // — Cabeçalho
  const head = document.createElement("div");
  head.className = "card";
  head.innerHTML = `
    <div class="row space-between">
      <h3>Relatório de Repasse</h3>
      <div class="row">
        <button class="btn" id="repPrint">⬇️ Baixar PDF</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="row">
        <label class="pill">Data início
          <input id="rep_dataIni" class="input" type="date">
        </label>
        <label class="pill">Data fim
          <input id="rep_dataFim" class="input" type="date">
        </label>
        <label class="pill">Data pagamento
          <input id="rep_dataPag" class="input" type="date">
        </label>
      </div>
    </div>
  `;
  wrap.appendChild(head);

  // — Vendas
  const vendas = document.createElement("section");
  vendas.className = "card";
  vendas.innerHTML = `
    <div class="row space-between">
      <h4>Fechamento de Duas Semanas – Vendas</h4>
      <button id="repAddCliente" class="btn">+ Adicionar linha</button>
    </div>
    <div class="table-wrap">
      <table class="table-compact" id="repTblVendas">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Marca do Chopp</th>
            <th class="right">Qtde (L)</th>
            <th class="right">Custo p/L</th>
            <th class="right">Qtde. Barris</th>
            <th class="right">Custo</th>
            <th class="right">Venda</th>
            <th class="right">Parte Marcos</th>
            <th class="right">Parte JK</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr>
            <td colspan="5"><b>Totais</b></td>
            <td id="repTotCusto" class="right"><b>R$ 0,00</b></td>
            <td id="repTotVenda" class="right"><b>R$ 0,00</b></td>
            <td id="repTotM" class="right"><b>R$ 0,00</b></td>
            <td id="repTotJ" class="right"><b>R$ 0,00</b></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  wrap.appendChild(vendas);

  // — Despesas
  const despesas = document.createElement("section");
  despesas.className = "card";
  despesas.innerHTML = `
    <div class="row space-between">
      <h4>Despesas</h4>
      <button id="repAddDespesa" class="btn">+ Adicionar despesa</button>
    </div>
    <div class="table-wrap">
      <table class="table-compact" id="repTblDespesas">
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="right">Valor</th>
            <th>Obs</th>
            <th class="right">Part. JK</th>
            <th class="right">Part. Marcos</th>
            <th>Pago?</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr>
            <td><b>Totais</b></td>
            <td id="repTotDespVal" class="right"><b>R$ 0,00</b></td>
            <td></td>
            <td id="repTotDespJK" class="right"><b>R$ 0,00</b></td>
            <td id="repTotDespM" class="right"><b>R$ 0,00</b></td>
            <td></td><td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  wrap.appendChild(despesas);

  // — Resultados
  const resumo = document.createElement("section");
  resumo.className = "card";
  resumo.innerHTML = `
    <h4>Cálculo</h4>
    <div class="grid-3">
      <div class="calc-box amber">
        <div class="row space-between"><span>Parte Marcos</span><b id="resParteM">R$ 0,00</b></div>
        <div class="row space-between"><span>− Despesas Marcos</span><b id="resDespM">R$ 0,00</b></div>
        <div class="row space-between big"><span>Total a pagar Marcos</span><b id="resTotalM">R$ 0,00</b></div>
        <hr>
      </div>
      <div class="calc-box sky">
        <div class="row space-between"><span>Parte JK</span><b id="resParteJ">R$ 0,00</b></div>
        <div class="row space-between"><span>− Despesas JK</span><b id="resDespJ">R$ 0,00</b></div>
        <div class="row space-between big"><span>Saldo JK</span><b id="resSaldoJ">R$ 0,00</b></div>
        <hr>
      </div>
      <div class="calc-box green">
        <div class="row space-between"><span>Vendas</span><b id="resVendas">R$ 0,00</b></div>
        <div class="row space-between"><span>Custos</span><b id="resCustos">R$ 0,00</b></div>
        <div class="row space-between"><span>Despesas</span><b id="resDespesas">R$ 0,00</b></div>
        <hr>
        <div class="row space-between big"><span>Lucro Líquido</span><b id="resLucro">R$ 0,00</b></div>
      </div>
    </div>
  `;
  wrap.appendChild(resumo);

  // — Referências de DOM (sem percM/percJ)
  const H = {
    ini: $("#rep_dataIni", head),
    fim: $("#rep_dataFim", head),
    pag: $("#rep_dataPag", head),
  };
  const TBL = {
    vendasTbody: $("#repTblVendas tbody", vendas),
    totCusto:    $("#repTotCusto", vendas),
    totVenda:    $("#repTotVenda", vendas),
    totM:        $("#repTotM", vendas),
    totJ:        $("#repTotJ", vendas),
    despesasTbody: $("#repTblDespesas tbody", despesas),
    totDespVal:    $("#repTotDespVal", despesas),
    totDespJK:     $("#repTotDespJK", despesas),
    totDespM:      $("#repTotDespM", despesas),
  };
  const OUT = {
    parteM: $("#resParteM", resumo),
    despM:  $("#resDespM", resumo),
    totalM: $("#resTotalM", resumo),
    parteJ: $("#resParteJ", resumo),
    despJ:  $("#resDespJ", resumo),
    saldoJ: $("#resSaldoJ", resumo),
    vendas: $("#resVendas", resumo),
    custos: $("#resCustos", resumo),
    despesas: $("#resDespesas", resumo),
    lucro:  $("#resLucro", resumo),
  };

  const ST = DB.repasse;
  // Header inicial
  H.ini.value = ST.header.dataIni || "";
  H.fim.value = ST.header.dataFim || "";
  H.pag.value = ST.header.dataPagamento || "";

  // — Renderizações
  function renderVendas(){
    // split fixo pelo estado (padrão 50/50 — sem UI)
    const pM = (toNumber(ST.split.percMarcos)/100) || 0.5;
    const pJ = (toNumber(ST.split.percJK)/100)     || 0.5;

    const rows = ST.clientes.map(r=>{
      const litros = Math.max(0, toNumber(r.qtdLitros));
      const barris = Math.max(1, toNumber(r.qtdBarris) || 1);
      const cpl    = Math.max(0, toNumber(r.custoPorLitro));
      const venda  = Math.max(0, toNumber(r.venda));
      const custo  = cpl * litros * barris;
      const lucro  = venda - custo;

      return `
        <tr data-id="${r.id}">
          <td><input class="input" data-field="cliente" value="${r.cliente||""}" placeholder="Nome do cliente"></td>
          <td><input class="input" data-field="marca"   value="${r.marca||""}"   placeholder="Marca do chopp"></td>
          <td class="right"><input class="input right" data-field="qtdLitros"     type="number" step="0.01" value="${r.qtdLitros||0}"></td>
          <td class="right"><input class="input right" data-field="custoPorLitro" type="number" step="0.01" value="${r.custoPorLitro||0}"></td>
          <td class="right"><input class="input right" data-field="qtdBarris"     type="number" step="1"    value="${r.qtdBarris||1}"></td>
          <td class="right">${fmt.money(custo)}</td>
          <td class="right"><input class="input right" data-field="venda" type="number" step="0.01" value="${r.venda||0}"></td>
          <td class="right"><span>${fmt.money(lucro*pM)}</span></td>
          <td class="right"><span>${fmt.money(lucro*pJ)}</span></td>
          <td>${iconBtn("del", r.id, "Remover", "🗑️")}</td>
        </tr>`;
    }).join("");
    TBL.vendasTbody.innerHTML = rows || `<tr><td colspan="10" class="empty">Sem linhas...</td></tr>`;
  }

  function renderDespesas(){
    const rows = ST.despesas.map(d=>`
      <tr data-id="${d.id}">
        <td><input class="input" data-field="descricao" value="${d.descricao||""}" placeholder="Ex.: Combustível da semana"></td>
        <td class="right"><input class="input right" data-field="valor" type="number" step="0.01" value="${d.valor||0}"></td>
        <td><input class="input" data-field="obs" value="${d.obs||""}" placeholder="Observações"></td>
        <td class="right"><input class="input right" data-field="partJK" type="number" step="0.01" value="${d.partJK||0}"></td>
        <td class="right"><input class="input right" data-field="partMarcos" type="number" step="0.01" value="${d.partMarcos||0}"></td>
        <td class="center"><input type="checkbox" data-field="pago" ${d.pago?"checked":""}></td>
        <td>${iconBtn("del", d.id, "Remover", "🗑️")}</td>
      </tr>
    `).join("");
    TBL.despesasTbody.innerHTML = rows || `<tr><td colspan="7" class="empty">Sem despesas...</td></tr>`;
  }

  function renderTotais(){
    const pM=(toNumber(ST.split.percMarcos)/100)||0.5;
    const pJ=(toNumber(ST.split.percJK)/100)||0.5;

    let totCusto=0, totVenda=0, totM=0, totJ=0;
    ST.clientes.forEach(r=>{
      const litros = Math.max(0,toNumber(r.qtdLitros));
      const barris = Math.max(1,toNumber(r.qtdBarris) || 1);
      const cpl    = Math.max(0,toNumber(r.custoPorLitro));
      const venda  = Math.max(0,toNumber(r.venda));
      const custo  = cpl * litros * barris;
      const lucro  = venda - custo;
      totCusto += custo; totVenda += venda;
      totM += lucro * pM; totJ += lucro * pJ;
    });

    let totDespVal=0, totDespJK=0, totDespM=0;
    ST.despesas.forEach(d=>{
      const v = Math.max(0,toNumber(d.valor));
      const pj= Math.max(0,toNumber(d.partJK));
      const pm= Math.max(0,toNumber(d.partMarcos));
      totDespVal += v; totDespJK += pj; totDespM += pm;
    });

    // Tabelas
    TBL.totCusto.textContent = fmt.money(totCusto);
    TBL.totVenda.textContent = fmt.money(totVenda);
    TBL.totM.textContent     = fmt.money(totM);
    TBL.totJ.textContent     = fmt.money(totJ);
    TBL.totDespVal.textContent = fmt.money(totDespVal);
    TBL.totDespJK.textContent  = fmt.money(totDespJK);
    TBL.totDespM.textContent   = fmt.money(totDespM);

    // Painéis finais
    OUT.parteM.textContent = fmt.money(totM);
    OUT.despM.textContent  = fmt.money(totDespM);
    OUT.totalM.textContent = fmt.money(totM - totDespM);

    OUT.parteJ.textContent = fmt.money(totJ);
    OUT.despJ.textContent  = fmt.money(totDespJK);
    OUT.saldoJ.textContent = fmt.money(totJ - totDespJK);

    OUT.vendas.textContent   = fmt.money(totVenda);
    OUT.custos.textContent   = fmt.money(totCusto);
    OUT.despesas.textContent = fmt.money(totDespVal);
    OUT.lucro.textContent    = fmt.money(totVenda - totCusto - totDespVal);
  }

  // — Eventos
  $("#repAddCliente", vendas).addEventListener("click", () => {
    ST.clientes.push({ id:uid(), cliente:"", marca:"", qtdLitros:30, custoPorLitro:0, qtdBarris:1, venda:0 });
    save(); renderVendas(); renderTotais();
  });
  $("#repAddDespesa", despesas).addEventListener("click", () => {
    ST.despesas.push({ id:uid(), descricao:"", valor:0, obs:"", partJK:0, partMarcos:0, pago:false });
    save(); renderDespesas(); renderTotais();
  });

  // Edição inline — vendas
  $("#repTblVendas tbody", vendas).addEventListener("input", (e)=>{
    const tr = e.target.closest("tr[data-id]"); if (!tr) return;
    const id = tr.getAttribute("data-id");
    const f  = e.target.getAttribute("data-field");
    const row = ST.clientes.find(x=>x.id===id); if (!row || !f) return;

    row[f] = e.target.value;

    const litros = Math.max(0,toNumber(row.qtdLitros));
    const barris = Math.max(1,toNumber(row.qtdBarris) || 1);
    const cpl    = Math.max(0,toNumber(row.custoPorLitro));
    const venda  = Math.max(0,toNumber(row.venda));
    const custo  = cpl * litros * barris;
    const lucro  = venda - custo;
    const pM=(toNumber(ST.split.percMarcos)/100)||0.5;
    const pJ=(toNumber(ST.split.percJK)/100)||0.5;
    const tds = tr.querySelectorAll("td");
    if (tds[5]) tds[5].textContent = fmt.money(custo);
    if (tds[7]?.querySelector("span")) tds[7].querySelector("span").textContent = fmt.money(lucro*pM);
    if (tds[8]?.querySelector("span")) tds[8].querySelector("span").textContent = fmt.money(lucro*pJ);

    save(); renderTotais();
  });
  $("#repTblVendas tbody", vendas).addEventListener("click", (e)=>{
    const b = e.target.closest("button[data-act='del']"); if (!b) return;
    const id = b.dataset.id;
    ST.clientes = ST.clientes.filter(x=>x.id!==id);
    save(); renderVendas(); renderTotais();
  });

  // Edição inline — despesas
  $("#repTblDespesas tbody", despesas).addEventListener("input", (e)=>{
    const tr = e.target.closest("tr[data-id]"); if (!tr) return;
    const id = tr.getAttribute("data-id");
    const f  = e.target.getAttribute("data-field");
    const row = ST.despesas.find(x=>x.id===id); if (!row || !f) return;

    if (f === "pago") row.pago = !!e.target.checked; else row[f] = e.target.value;

    if (f === "valor"){
      const v  = toNumber(row.valor);
      const pj = v * ((toNumber(ST.split.percJK)||50)/100);
      const pm = v - pj;
      row.partJK = pj; row.partMarcos = pm;
      tr.querySelector('[data-field="partJK"]').value = pj.toFixed(2);
      tr.querySelector('[data-field="partMarcos"]').value = pm.toFixed(2);
    } else if (f === "partJK"){
      const v  = toNumber(row.valor);
      const pj = toNumber(row.partJK);
      row.partMarcos = v - pj;
      tr.querySelector('[data-field="partMarcos"]').value = row.partMarcos.toFixed(2);
    } else if (f === "partMarcos"){
      const v  = toNumber(row.valor);
      const pm = toNumber(row.partMarcos);
      row.partJK = v - pm;
      tr.querySelector('[data-field="partJK"]').value = row.partJK.toFixed(2);
    }

    save(); renderTotais();
  });
  $("#repTblDespesas tbody", despesas).addEventListener("click", (e)=>{
    const b = e.target.closest("button[data-act='del']"); if (!b) return;
    const id = b.dataset.id;
    ST.despesas = ST.despesas.filter(x=>x.id!==id);
    save(); renderDespesas(); renderTotais();
  });

  // Datas do cabeçalho
  H.ini.addEventListener("input", e=>{ ST.header.dataIni = e.target.value || ""; save(); });
  H.fim.addEventListener("input", e=>{ ST.header.dataFim = e.target.value || ""; save(); });
  H.pag.addEventListener("input", e=>{ ST.header.dataPagamento = e.target.value || ""; save(); });

// ================= PDF / IMPRESSÃO =================
$("#repPrint", head).addEventListener("click", () => {
  const pM = (toNumber(ST.split.percMarcos) / 100) || 0.5;
  const pJ = (toNumber(ST.split.percJK)     / 100) || 0.5;

  let totC=0, totV=0, totM=0, totJ=0;
  const rowsV = ST.clientes.map(r=>{
    const litros=Math.max(0,toNumber(r.qtdLitros));
    const barris=Math.max(1,toNumber(r.qtdBarris)||1);
    const cpl=Math.max(0,toNumber(r.custoPorLitro));
    const venda=Math.max(0,toNumber(r.venda));
    const custo=cpl*litros*barris;
    const lucro=venda-custo;
    totC+=custo; totV+=venda; totM+=lucro*pM; totJ+=lucro*pJ;
    return `
      <tr>
        <td>${r.cliente||""}</td><td>${r.marca||""}</td>
        <td class="r">${litros.toFixed(2)}</td><td class="r">${fmt.money(cpl)}</td><td class="r">${barris}</td>
        <td class="r">${fmt.money(custo)}</td><td class="r">${fmt.money(venda)}</td>
        <td class="r">${fmt.money(lucro*pM)}</td><td class="r">${fmt.money(lucro*pJ)}</td>
      </tr>`;
  }).join("");

  let tDesp=0, tJK=0, tM=0;
  const rowsD = ST.despesas.map(d=>{
    const v=toNumber(d.valor); const pj=toNumber(d.partJK); const pm=toNumber(d.partMarcos);
    tDesp+=v; tJK+=pj; tM+=pm;
    return `
      <tr>
        <td>${d.descricao||""}</td>
        <td class="r">${fmt.money(v)}</td>
        <td>${d.obs||""}</td>
        <td class="r">${fmt.money(pj)}</td>
        <td class="r">${fmt.money(pm)}</td>
        <td>${d.pago?"Sim":"Não"}</td>
      </tr>`;
  }).join("");

  const saldoM = totM - tM;
  const saldoJ = totJ - tJK;
  const lucroB = totV - totC - tDesp;

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Repasse - JK CHOPP</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Arial; color:#111; margin:0; }
  #print-toolbar {
    position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ddd;
    display: flex; gap: 8px; justify-content: flex-end; padding: 10px 12px; z-index: 10;
  }
  #print-toolbar button {
    border: 1px solid #ccc; background:#fff; padding: 8px 12px; border-radius: 8px; cursor: pointer;
  }
  #print-toolbar button:hover { border-color:#999; }
  main { padding: 16px; }
  
  /* Cabeçalho da empresa */
  .empresa-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f59e0b;
  }
  .logo-empresa {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    object-fit: contain;
    border: 2px solid #f59e0b;
    padding: 4px;
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .empresa-info h1 {
    margin: 0;
    font-size: 24px;
    color: #f59e0b;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .empresa-info .cnpj {
    color: #666;
    font-size: 14px;
    margin: 4px 0;
    font-weight: 600;
  }
  .empresa-info .doc-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-top: 8px;
  }
  
  /* Período */
  .periodo {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 20px 0;
  }
  .periodo-box {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 14px;
    text-align: center;
    background: #fafafa;
  }
  .periodo-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 6px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .periodo-value {
    font-weight: 700;
    color: #333;
    font-size: 14px;
  }
  
  /* Tabelas */
  table{ border-collapse:collapse; width:100%; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th,td{ padding:10px 12px; border:1px solid #ddd; vertical-align:middle; }
  thead{ background:#f8f9fa; font-weight:600; color: #333; }
  tfoot{ background:#f8f9fa; font-weight:600; }
  .r{ text-align:right; }
  
  /* Cálculos */
  .calculos-grid { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 20px;
    margin: 30px 0;
  }
  .calc-box { 
    border: 1px solid #e0e0e0; 
    border-radius: 10px; 
    padding: 18px;
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .calc-box.amber { border-left: 4px solid #f59e0b; }
  .calc-box.sky { border-left: 4px solid #60a5fa; }
  .calc-box.green { border-left: 4px solid #22c55e; }
  
  .row{ display:flex; justify-content:space-between; margin: 10px 0; align-items: center; }
  .big { font-size: 15px; font-weight: 700; margin-top: 14px; color: #222; }
  hr { border: none; border-top: 1px solid #e0e0e0; margin: 14px 0; }
  
  .muted{ color:#666; font-size:12px; }
  
  h2 {
    color: #333;
    border-bottom: 1px solid #f59e0b;
    padding-bottom: 8px;
    margin: 25px 0 15px 0;
    font-size: 18px;
  }
  
  @media print { 
    #print-toolbar { display:none !important; } 
    main{ padding:0; }
    .calculos-grid { break-inside: avoid; }
    table { break-inside: avoid; }
    .empresa-header { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div id="print-toolbar">
    <button id="btnSave" onclick="window.print()">🖨️ Imprimir/Salvar como PDF</button>
    <button id="btnClose" onclick="window.close()">✕ Fechar</button>
  </div>
  <main>
    <!-- Cabeçalho da empresa -->
    <div class="empresa-header">
      <img src="logojk.png" alt="JK CHOPP" class="logo-empresa">
      <div class="empresa-info">
        <h1>JK CHOPP</h1>
        <div class="cnpj">CNPJ: 60.856.264/0001-73</div>
        <div class="muted">Especialistas em Chopp</div>
        <div class="doc-title">RELATÓRIO DE REPASSE FINANCEIRO</div>
      </div>
    </div>

    <!-- Período -->
    <div class="periodo">
      <div class="periodo-box">
        <div class="periodo-label">Período Inicial</div>
        <div class="periodo-value">${ST.header.dataIni || "Não informado"}</div>
      </div>
      <div class="periodo-box">
        <div class="periodo-label">Período Final</div>
        <div class="periodo-value">${ST.header.dataFim || "Não informado"}</div>
      </div>
      <div class="periodo-box">
        <div class="periodo-label">Data de Pagamento</div>
        <div class="periodo-value">${ST.header.dataPagamento || "Não agendada"}</div>
      </div>
    </div>

    <!-- Vendas -->
    <h2>📊 Fechamento de Vendas - Período de Duas Semanas</h2>
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Marca do Chopp</th>
          <th class="r">Quantidade (L)</th>
          <th class="r">Custo por Litro</th>
          <th class="r">Qtde. Barris</th>
          <th class="r">Custo Total</th>
          <th class="r">Valor de Venda</th>
          <th class="r">Parte Marcos</th>
          <th class="r">Parte JK</th>
        </tr>
      </thead>
      <tbody>${rowsV}</tbody>
      <tfoot>
        <tr>
          <td colspan="5"><b>TOTAIS</b></td>
          <td class="r"><b>${fmt.money(totC)}</b></td>
          <td class="r"><b>${fmt.money(totV)}</b></td>
          <td class="r"><b>${fmt.money(totM)}</b></td>
          <td class="r"><b>${fmt.money(totJ)}</b></td>
        </tr>
      </tfoot>
    </table>

    <!-- Despesas -->
    <h2>💸 Despesas do Período</h2>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th class="r">Valor Total</th>
          <th>Observações</th>
          <th class="r">Parte JK</th>
          <th class="r">Parte Marcos</th>
          <th>Pago?</th>
        </tr>
      </thead>
      <tbody>${rowsD}</tbody>
      <tfoot>
        <tr>
          <td><b>TOTAIS</b></td>
          <td class="r"><b>${fmt.money(tDesp)}</b></td>
          <td></td>
          <td class="r"><b>${fmt.money(tJK)}</b></td>
          <td class="r"><b>${fmt.money(tM)}</b></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- Cálculos -->
    <h2>🧮 Resumo Financeiro - Rateio 50/50</h2>
    <div class="calculos-grid">
      <div class="calc-box amber">
        <h3 style="margin:0 0 12px 0; color: #f59e0b;">💼 Marcos</h3>
        <div class="row"><span>Parte das Vendas</span><b>${fmt.money(totM)}</b></div>
        <div class="row"><span>− Despesas</span><b>${fmt.money(tM)}</b></div>
        <hr>
        <div class="row big"><span>Total a Receber</span><b style="color: #f59e0b;">${fmt.money(saldoM)}</b></div>
      </div>
      
      <div class="calc-box sky">
        <h3 style="margin:0 0 12px 0; color: #60a5fa;">🏢 JK CHOPP</h3>
        <div class="row"><span>Parte das Vendas</span><b>${fmt.money(totJ)}</b></div>
        <div class="row"><span>− Despesas</span><b>${fmt.money(tJK)}</b></div>
        <hr>
        <div class="row big"><span>Saldo Final</span><b style="color: #60a5fa;">${fmt.money(saldoJ)}</b></div>
      </div>
      
      <div class="calc-box green">
        <h3 style="margin:0 0 12px 0; color: #22c55e;">📈 Resultado Geral</h3>
        <div class="row"><span>Vendas Brutas</span><b>${fmt.money(totV)}</b></div>
        <div class="row"><span>− Custos</span><b>${fmt.money(totC)}</b></div>
        <div class="row"><span>− Despesas</span><b>${fmt.money(tDesp)}</b></div>
        <hr>
        <div class="row big"><span>Lucro Líquido</span><b style="color: #22c55e;">${fmt.money(lucroB)}</b></div>
      </div>
    </div>

    <!-- Rodapé -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #f59e0b; text-align: center; color: #666; font-size: 12px;">
      <div style="margin-bottom: 8px; font-weight: 600;">Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>
      <div>JK CHOPP • CNPJ 60.856.264/0001-73 • Sistema Interno de Gestão</div>
      <div class="muted" style="margin-top: 4px;">Este documento é confidencial e de uso interno</div>
    </div>
  </main>
</body></html>`;

    // === imprimir via IFRAME invisível ===
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => iframe.remove(), 500);
        }, 50);
      } catch (e) {
        console.error(e);
        alert("Não foi possível preparar a impressão.");
        iframe.remove();
      }
    };

    if ("srcdoc" in iframe) {
      iframe.srcdoc = html;
    } else {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }
});
// <-- FECHA o addEventListener corretamente
  // =============== PDF / IMPRESSÃO — FIM ===============

  // Render inicial
  renderVendas();
  renderDespesas();
  renderTotais();
  return wrap;
}

/* === 06) PLACEHOLDERS + ROTEADOR ======================================= */
function renderStub(titulo = "Em construção") {
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = `<h3>${titulo}</h3><p class="muted">Esta área ainda não foi implementada.</p>`;
  return el;
}

function renderActive() {
    if (!authSystem.isAuthenticated) return;
    
    // Verificar permissões para áreas restritas
    if (ACTIVE === 'financeiro' && !authSystem.hasPermission('admin')) {
        alert('Acesso restrito à administração!');
        ACTIVE = 'home';
        localStorage.setItem('jk_tab', ACTIVE);
    }
    
    const content = $("#content");
    if (!content) return;
    content.innerHTML = "";
    
    let view;
    
    switch (ACTIVE) {
        case "home":            view = renderHome();            break;
        case "clientes_pf":
        case "clientes_pj":     view = renderClientes();        break;
        case "produtos":        view = renderProdutos();        break;
        case "pedidos":         view = renderPedidos();         break;
        case "financeiro":
        case "financeiro_in":
        case "financeiro_out":  view = renderFinanceiro();      break;
        case "contratos":       view = renderContratos();       break;
        case "agendamentos":    view = renderAgenda();          break;
        case "rel_repasse":     view = renderRelRepasse();      break;

        case "fornecedores":    view = renderStub("Fornecedores");        break;
        case "funcionarios":    view = renderStub("Funcionários");        break;
        case "grupos_preco":    view = renderStub("Grupos de Preço");     break;
        case "interacoes":      view = renderStub("Interações");          break;
        case "transportadoras": view = renderStub("Transportadoras");     break;
        case "estoque":         view = renderStub("Estoque");             break;
        case "nfe_boletos":     view = renderStub("NF-e e Boletos");      break;
        case "ajuda":           view = renderStub("Central de Ajuda");    break;
        case "relatorios":      view = renderRelatorios();                break;

        default:                view = renderStub("Página não encontrada");
    }

    if (view) content.appendChild(view);
}

/* === 07) BOOT =========================================================== */
// ... código posterior mantido ...*/
document.addEventListener("DOMContentLoaded", () => {
  bindTopbarActions();
  bindDrawerActions();
  buildMenu();
  renderActive();
});