/* ==========================================================================
   JK CHOPP — SCRIPT.JS (com MENU + accordion)
   ========================================================================== */

/* === 00) HELPERS ======================================================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt = {
  money: (v) => (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  num:   (v) => (Number(v || 0)).toLocaleString("pt-BR"),
  date:  (v) => (v ? new Date(v).toLocaleDateString("pt-BR") : ""),
};
const uid = () => Math.random().toString(36).slice(2, 9);
const parseBRL = (str) => Number(String(str ?? "").replace(/\./g, "").replace(",", ".") || 0);

/* === 01) PERSISTÊNCIA / ESTADO ========================================= */
const DEF = {
  clientes:   [],
  produtos:   [],
  pedidos:    [],
  contratos:  [],
  financeiro: [],
  agenda:     [],
  perfil:     { nome: "", nascimento: "", setor: "", fotoB64: "" },
};
function load() { try { return JSON.parse(localStorage.getItem("jk_data")) || { ...DEF }; } catch { return { ...DEF }; } }
function save() { localStorage.setItem("jk_data", JSON.stringify(DB)); }
function reset() { localStorage.removeItem("jk_data"); DB = { ...DEF }; renderActive(); }
let DB = load();

/* === 01.1) MENU com subitens (accordion) =============================== */
const MENU = [
  { id: "home", label: "Início", icon: "🏠" },   // novo item Home
  { id: "agendamentos", label: "Agenda", icon: "📅" },

  {
    label: "Contatos", icon: "📞",
    children: [
      { id: "clientes_pf",   label: "Clientes Físicos",   icon: "👤" },
      { id: "clientes_pj",   label: "Clientes Jurídicos", icon: "🏢" },
      { id: "fornecedores",  label: "Fornecedores",       icon: "🛒" },
      { id: "funcionarios",  label: "Funcionários",       icon: "🧑‍💼" },
      { id: "grupos_preco",  label: "Grupos de Preço",    icon: "👥" },
      { id: "interacoes",    label: "Interações",         icon: "💬" },
      { id: "transportadoras", label: "Transportadoras",  icon: "🚚" },
    ],
  },

  { id: "produtos",       label: "Equipamentos/Produtos", icon: "🧰" },
  { id: "estoque",        label: "Estoque",               icon: "📦" },
  { id: "financeiro_in",  label: "Entradas financeiras",  icon: "➕" },
  { id: "financeiro_out", label: "Saídas financeiras",    icon: "➖" },
  { id: "nfe_boletos",    label: "NF-e e Boletos",        icon: "🧾" },
  { id: "relatorios",     label: "Relatórios",            icon: "📊" },
  { id: "contratos",      label: "Contratos",             icon: "📄" },
  { id: "ajuda",          label: "Central de ajuda",      icon: "❓" },
];

/* rota ativa */
let ACTIVE = localStorage.getItem("jk_tab") || "home";

/* === 02) TEMA + TOPO ==================================================== */
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
  a.click(); URL.revokeObjectURL(url);
}
function handleImport(ev) {
  const f = ev.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try { DB = { ...DEF, ...JSON.parse(r.result) }; save(); renderActive(); ev.target.value=""; alert("Importação concluída ✅"); }
    catch { alert("Arquivo inválido ❌"); }
  };
  r.readAsText(f);
}
function bindTopbarActions() {
  $("#btnTheme")?.addEventListener("click", toggleTheme);
  $("#btnExport")?.addEventListener("click", doExport);
  $("#importFile")?.addEventListener("change", handleImport);
  $("#btnReset")?.addEventListener("click", () => { if (confirm("Isto vai apagar os dados locais. Deseja continuar?")) reset(); });
}

/* === 03) NAVEGAÇÃO (Drawer/Menu) ======================================= */
const drawer   = $("#menuDrawer");
const backdrop = $("#backdrop");
const menuList = $("#menuList");
function openMenu()  { drawer?.classList.add("open");  backdrop?.classList.add("open");  drawer?.setAttribute("aria-hidden","false"); }
function closeMenu() { drawer?.classList.remove("open");backdrop?.classList.remove("open");drawer?.setAttribute("aria-hidden","true"); }
function toggleMenu(){ drawer?.classList.contains("open") ? closeMenu() : openMenu(); }

/* opcional: manter barra de abas visível; aqui não usamos mais TABS */
function buildTabs(){ /* sem uso — mantendo para compatibilidade */ }

/* Menu com accordion */
function buildMenu() {
  if (!menuList) return;
  menuList.innerHTML = "";

  MENU.forEach(group => {
    if (group.children?.length) {
      // pai + caret
      const parent = document.createElement("div");
      parent.className = "menu-item menu-parent";
      parent.innerHTML = `<span>${group.icon || "📁"} ${group.label}</span><span class="caret">▶</span>`;

      // contêiner de sub-itens
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
        if (ev.target.closest(".submenu-item")) return; // não colapsa ao clicar no filho
        parent.classList.toggle("open"); sub.classList.toggle("open");
      });

      menuList.appendChild(parent);
      menuList.appendChild(sub);
      return;
    }

    // item simples
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

  // se é um subitem
  const child = $(`.submenu-item[data-id="${ACTIVE}"]`, menuList);
  if (child) {
    child.classList.add("active");
    const sub = child.closest(".submenu");
    const parent = sub?.previousElementSibling;
    sub?.classList.add("open"); parent?.classList.add("open");
    return;
  }
  // se é item simples
  $(`.menu-item[data-id="${ACTIVE}"]`, menuList)?.classList.add("active");
}

function bindDrawerActions() {
  $("#btnMenu")?.addEventListener("click", toggleMenu);
  $("#btnCloseMenu")?.addEventListener("click", closeMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && drawer?.classList.contains("open")) closeMenu(); });
}

/* === 04) TELAS ========================================================== */

/* ---- HOME (Dashboard) -------------------------------------------------- */
function renderHome() {
  const wrap = document.createElement("div");
  wrap.className = "grid-home";

  // ====== CARDS DE PEDIDOS
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
    // atalho: mesmo "novoPedido()" do módulo de pedidos
    const cliente = prompt("Cliente (nome)"); if (!cliente) return;
    const itens = prompt("Itens (ex.: Chopeira x1; Barril 50L x2)");
    const total = parseBRL(prompt("Total (R$)") ?? 0);
    DB.pedidos.unshift({ id: uid(), codigo: ("P" + Date.now()).slice(-6), cliente, itens, total, status: "Aberto" });
    save(); renderActive();                 // atualiza painel
  });
  cardPedidos.querySelector("#goPedidos")?.addEventListener("click", () => {
    ACTIVE = "pedidos"; localStorage.setItem("jk_tab", ACTIVE); renderActive();
  });

  // ====== MINI-AGENDA (Cadastro + Próximos)
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
    const rows = DB.agenda
      .slice()
      .sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora))
      .slice(0, 6); // mostra até 6 próximos
    tbody.innerHTML = rows.map(a => `
      <tr>
        <td>${fmt.date(a.data)}</td>
        <td>${a.hora || "—"}</td>
        <td>${a.titulo}</td>
        <td><button class="icon-btn danger-text" data-id="${a.id}" title="Excluir">🗑️</button></td>
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

  // ====== MONTAGEM DO GRID
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
      v = v.padEnd(11,"").slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_,a,b,c,d)=> d?`${a}.${b}.${c}-${d}`: c?`${a}.${b}.${c}`: b?`${a}.${b}`: a);
    } else {
      v = v.padEnd(14,"").slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_,a,b,c,d,e)=> e?`${a}.${b}.${c}/${d}-${e}`: d?`${a}.${b}.${c}/${d}`: c?`${a}.${b}.${c}`: b?`${a}.${b}`: a);
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
    if (!exist) { DB.contratos.push({ id: uid(), clienteId: cli.id, cliente: cli.nome, status: "Pendente", data: Date.now() }); save(); }
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
          <button class="icon-btn" data-act="edit" data-id="${c.id}" title="Editar">✏️</button>
          <button class="icon-btn" data-act="del"  data-id="${c.id}" title="Excluir">🗑️</button>
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

  // Auto-filtro quando vier de submenu PF/PJ
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
    $("#prd_tipo", tpl).value = "Chopeira"; $("#prd_estoque_ctrl", tpl).checked = true;
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
          <button class="icon-btn" data-act="edit" data-id="${p.id}">✏️</button>
          <button class="icon-btn" data-act="del"  data-id="${p.id}">🗑️</button>
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
        <td><button class="icon-btn" data-act="del" data-id="${p.id}">🗑️</button></td>
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
          <button class="icon-btn" data-act="gerar" data-id="${r.clienteId}" title="Gerar">📄</button>
          <button class="icon-btn" data-act="ass"   data-id="${r.clienteId}" title="Marcar assinado">✅</button>
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
    if (b.dataset.act==="gerar") { const w = window.open("","_blank"); w.document.write(contratoHTML(cli)); w.document.close(); }
    if (b.dataset.act==="ass")   { const k = DB.contratos.find(x=>x.clienteId===id); if (k) { k.status="Assinado"; k.data=Date.now(); save(); list(); } }
  });

  $("#btnGerarContratoSelecionado", tpl).onclick = () => {
    const nome = prompt("Nome do cliente ponto fixo:");
    const cli = DB.clientes.find(c => c.fixo && c.nome.toLowerCase() === String(nome||"").toLowerCase());
    if (!cli) { alert("Cliente não localizado ou não é Ponto Fixo."); return; }
    const w = window.open("","_blank"); w.document.write(contratoHTML(cli)); w.document.close();
  };

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
          <button class="icon-btn" data-act="edit" data-id="${x.id}">✏️</button>
          <button class="icon-btn" data-act="del"  data-id="${x.id}">🗑️</button>
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
    if (b.dataset.act==="del" && confirm("Excluir título?")) { DB.financeiro = DB.financeiro.filter(y=>y.id!==id); save(); list(); }
  });

  $("#buscaFinanceiro", tpl).addEventListener("input", list);
  $("#filtroTipoFin", tpl).addEventListener("change", list);
  list(); return tpl;
}

/* ---- AGENDAMENTOS + CALENDÁRIO ---------------------------------------- */
function renderAgenda() {
  const tpl = document.importNode($("#tpl-agendamentos").content, true);
  const TB  = $("tbody", tpl);

  // ===== Helpers de data
  const toYMD = (d) => {
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
  };
  const fromYMD = (s) => {
    const [y,m,d] = (s||"").split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m-1, d);
  };

// ===== Estado de mês exibido (começa no mês "hoje")
let calRef = new Date();
calRef.setDate(1);

// Seleção inicial: hoje (UMA vez)
let selectedYMD = toYMD(new Date());
$("#ag_data", tpl).value = $("#ag_data", tpl).value || selectedYMD;

  // ===== CRUD já existente
  $("#btnAddAgenda", tpl).onclick = () => {
    const a = { id: uid(), titulo: $("#ag_titulo", tpl).value.trim(), data: $("#ag_data", tpl).value, hora: $("#ag_hora", tpl).value };
    if (!a.titulo || !a.data) { alert("Informe título e data."); return; }
    DB.agenda.push(a); save(); list(); $("#ag_titulo", tpl).value = "";
    // Atualiza pontos no calendário caso o dia adicionado esteja visível
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
        <td><button class="icon-btn" data-act="del" data-id="${a.id}">🗑️</button></td>
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

  // ===== Calendário
  const elTitle = $("#calTitle", tpl);
  const elGrid  = $("#calGrid", tpl);

  function buildCalendar() {
    // Título do mês (pt-BR)
   elTitle.textContent = calRef.toLocaleDateString("pt-BR", { month:"long", year:"numeric" });

    // 1) Primeiro dia do mês e índice (0=Dom, 1=Seg,...)
    const first = new Date(calRef.getFullYear(), calRef.getMonth(), 1);
    let start = new Date(first);

    // Queremos começar na **segunda-feira** da semana que contém o dia 1
    const dow = (first.getDay() + 6) % 7;   // transforma: seg=0,... dom=6
    start.setDate(first.getDate() - dow);   // volta para a segunda

    // 2) Quantidade de células: 35 (5 semanas) ou 42 (6 semanas)
    // Gera 42 e depois decide esconder a última linha se todos forem "fora"
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      cells.push(d);
    }

    // 3) Render
    const month = calRef.getMonth();
    const todayYMD = toYMD(new Date());
    // Mapa de contagem de agendamentos por dia
    const counts = DB.agenda.reduce((acc, a) => {
      if (!a.data) return acc;
      acc[a.data] = (acc[a.data] || 0) + 1;
      return acc;
    }, {});
    elGrid.innerHTML = cells.map(d => {
      const ymd = toYMD(d);
      const outside = d.getMonth() !== month ? "outside" : "";
      const wknd     = [6,0].includes(d.getDay()) ? "wknd" : "";         // sábado/domingo
const isToday  = ymd === todayYMD ? "today" : "";
const selected = ymd === selectedYMD ? "selected" : "";
      const dots = (counts[ymd] || 0);
      return `
        <button class="cal-day ${outside} ${wknd} ${isToday} ${selected}" data-ymd="${ymd}" ...>
          <span class="dnum">${d.getDate()}</span>
          <div class="cal-dots">${dots ? Array.from({length: Math.min(dots, 4)}).map(()=>'<span class="cal-dot"></span>').join('') : ""}</div>
        </button>
      `;
    }).join("");

    // 4) Se a última linha (células 35–41) for toda "fora", removemos visualmente
    const lastRow = Array.from(elGrid.children).slice(35, 42);
    const allOutside = lastRow.every(c => c.classList.contains("outside"));
    if (allOutside) lastRow.forEach(c => c.style.display = "none");
  }

  // Navegação do calendário
  $("#calPrev",  tpl).onclick = () => { calRef.setMonth(calRef.getMonth() - 1); buildCalendar(); };
$("#calNext",  tpl).onclick = () => { calRef.setMonth(calRef.getMonth() +  1); buildCalendar(); };
$("#calToday", tpl).onclick = () => {
  const now = new Date();
  calRef = new Date(now.getFullYear(), now.getMonth(), 1);
  buildCalendar();
};

/// Clique em um dia => selecionar, preencher data, filtrar e redesenhar
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

// exemplo de compromissos
const compromissos = {
  "2025-09-13": ["Reunião com cliente"],
  "2025-09-18": ["Entrega projeto", "Aniversário João"],
  "2025-09-25": ["Consulta médica"]
};

function renderCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const grid = document.querySelector(".cal-grid");
  grid.innerHTML = "";

  // calcula dia inicial (domingo=0)
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  // células antes do mês
  for (let i = 0; i < startDay; i++) {
    const cell = document.createElement("div");
    cell.className = "cal-day outside";
    grid.appendChild(cell);
  }

  // dias do mês
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cell = document.createElement("div");
    cell.className = "cal-day";

    // número do dia
    const num = document.createElement("div");
    num.className = "dnum";
    num.textContent = d;
    cell.appendChild(num);

    // bolinhas se houver compromissos
    if (compromissos[dateStr]) {
      const dotsWrap = document.createElement("div");
      dotsWrap.className = "cal-dots";
      compromissos[dateStr].forEach(() => {
        const dot = document.createElement("span");
        dot.className = "cal-dot";
        dotsWrap.appendChild(dot);
      });
      cell.appendChild(dotsWrap);
    }

    grid.appendChild(cell);
  }
}

  // Primeira renderização
  buildCalendar();
  list();
  return tpl;
}

/* ---- RELATÓRIOS -------------------------------------------------------- */
function renderRelatorios() {
  const tpl  = document.importNode($("#tpl-relatorios").content, true);
  const area = $("#areaRelatorio", tpl);

  function render(tipo) {
    let html = "";
    if (tipo === "clientes") {
      html = `<h3>Clientes (${DB.clientes.length})</h3><ul>` +
             DB.clientes.map(c => `<li>${c.nome} — ${c.tipo} ${c.doc} ${c.fixo ? '<span class="tag fix">Ponto Fixo</span>' : ''}</li>`).join("") + `</ul>`;
    }
    if (tipo === "produtos") {
      html = `<h3>Produtos (${DB.produtos.length})</h3><ul>` +
             DB.produtos.map(p => `<li>${p.nome} (${p.tipo}) — ${fmt.money(p.preco)}</li>`).join("") + `</ul>`;
    }
    if (tipo === "pedidos") {
      html = `<h3>Pedidos (${DB.pedidos.length})</h3><ul>` +
             DB.pedidos.map(p => `<li>#${p.codigo} — ${p.cliente} — ${p.status} — ${fmt.money(p.total || 0)}</li>`).join("") + `</ul>`;
    }
    if (tipo === "financeiro") {
      const rec = DB.financeiro.filter(x=>x.tipo==="Receber").reduce((s,x)=>s+x.valor,0);
      const pag = DB.financeiro.filter(x=>x.tipo==="Pagar").reduce((s,x)=>s+x.valor,0);
      html = `<h3>Financeiro</h3>
              <p>Receber: <b>${fmt.money(rec)}</b> • Pagar: <b>${fmt.money(pag)}</b> • Saldo: <b>${fmt.money(rec - pag)}</b></p>
              <ul>` + DB.financeiro.map(x => `<li>${x.tipo} — ${x.doc} — ${x.cliente || "-"} — ${fmt.money(x.valor)} — ${x.venc ? fmt.date(x.venc) : "-"}</li>`).join("") + `</ul>`;
    }
    area.innerHTML = `<div class="card">${html}</div>`;
  }

  function toCSV() {
    const tipo = $("#rel_tipo", tpl).value;
    const rows = [];
    if (tipo === "clientes") {
      rows.push(["Nome","Tipo","Documento","Contato","Ponto Fixo"]);
      DB.clientes.forEach(c => rows.push([c.nome,c.tipo,c.doc,c.contato||"",c.fixo?"Sim":"Não"]));
    } else if (tipo === "produtos") {
      rows.push(["Nome","Tipo","Código","Preço","Estoque"]);
      DB.produtos.forEach(p => rows.push([p.nome,p.tipo,p.codigo||"",p.preco,p.ctrl?p.estoque:"NC"]));
    } else if (tipo === "pedidos") {
      rows.push(["#","Cliente","Itens","Total","Status"]);
      DB.pedidos.forEach(p => rows.push([p.codigo,p.cliente,p.itens||"",p.total||0,p.status]));
    } else if (tipo === "financeiro") {
      rows.push(["Doc","Cliente","Valor","Tipo","Vencimento"]);
      DB.financeiro.forEach(x => rows.push([x.doc,x.cliente||"",x.valor,x.tipo,x.venc||""]));
    }
    const csv = rows.map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `relatorio_${tipo}.csv` });
    a.click(); URL.revokeObjectURL(url);
  }

  $("#btnGerarRelatorio", tpl).onclick = () => render($("#rel_tipo", tpl).value);
  $("#btnCSV", tpl).onclick = toCSV;
  render("clientes"); return tpl;
}

/* === 05) PERFIL ========================================================= */
function bindProfile() {
  $("#btnPerfil")?.addEventListener("click", async () => {
    const nome = prompt("Seu nome completo:", DB.perfil.nome || "")?.trim() || DB.perfil.nome;
    const nasc = prompt("Data de nascimento (AAAA-MM-DD):", DB.perfil.nascimento || "")?.trim() || DB.perfil.nascimento;
    const setor= prompt("Setor (ex.: Comercial, Eventos, Delivery):", DB.perfil.setor || "")?.trim() || DB.perfil.setor;
    let fotoB64 = DB.perfil.fotoB64 || "";
    const querFoto = confirm("Deseja selecionar/atualizar uma foto de perfil agora?");
    if (querFoto) { try { fotoB64 = await pickImageAsBase64(); } catch {} }
    DB.perfil = { nome: nome||"", nascimento: nasc||"", setor: setor||"", fotoB64: fotoB64||"" };
    save(); alert("Perfil atualizado ✅");
  });
}
function pickImageAsBase64() {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return reject();
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
    };
    input.click();
  });
}

/* === 06) ROTEAMENTO + BOOT ============================================= */
function renderComingSoon(titulo) {
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.innerHTML = `<h3>${titulo}</h3><p class="muted">Em breve…</p>`;
  return wrap;
}
// ROTAS — manter tudo dentro do objeto
const ROUTES = {
  // telas principais
  home:         renderHome,
  clientes:     renderClientes,
  produtos:     renderProdutos,
  pedidos:      renderPedidos,
  contratos:    renderContratos,
  financeiro:   renderFinanceiro,
  agendamentos: renderAgenda,
  relatorios:   renderRelatorios,

  // subitens do menu "Contatos"
  clientes_pf:  renderClientes,   // mapeia para a mesma tela de clientes
  clientes_pj:  renderClientes,

  // seções “Em breve…”
  fornecedores:     () => renderComingSoon("Fornecedores"),
  funcionarios:     () => renderComingSoon("Funcionários"),
  grupos_preco:     () => renderComingSoon("Grupos de Preço"),
  interacoes:       () => renderComingSoon("Interações"),
  transportadoras:  () => renderComingSoon("Transportadoras"),
  estoque:          () => renderComingSoon("Estoque"),
  financeiro_in:    () => renderComingSoon("Entradas financeiras"),
  financeiro_out:   () => renderComingSoon("Saídas financeiras"),
  nfe_boletos:      () => renderComingSoon("NF-e e Boletos"),
  ajuda:            () => renderComingSoon("Central de ajuda"),
};

function renderActive() {
  highlightActiveMenu();
  const c = $("#content"); if (!c) return; c.innerHTML = "";
  const fn = ROUTES[ACTIVE] || ROUTES.home;
  c.appendChild(fn());
}

function init() {
  bindTopbarActions();
  buildTabs();      // opcional
  buildMenu();      // novo MENU com accordion
  bindDrawerActions();
  bindProfile();
  renderActive();
}
document.addEventListener("DOMContentLoaded", init);
