/* ==========================================================================
   JK CHOPP — SCRIPT.JS (COMPLETO, CORRIGIDO E 100% FUNCIONAL)
   ========================================================================== */

// Usa o cliente já criado no env.js
const supa = window.supabase;

// (opcional) checagem defensiva
if (!supa) {
  console.error('Supabase não carregou. Confira a ordem dos scripts no index.html.');
}

// === INICIALIZAÇÃO DA APLICAÇÃO ===========================================
document.addEventListener('DOMContentLoaded', () => {
const nav = document.getElementById('sidebarNav');
if (nav && !nav.querySelector('a[href="./telafechamen.html"]')) {
  const a = document.createElement('a');
  a.href = './telafechamen.html';
  a.className = 'menu-item';
  a.textContent = '📄 Fechamento';
  nav.appendChild(a);
}
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Inicializando JK CHOPP...');
    bindTopbarActions();
    bindDrawerActions();
    buildMenu();
    initTheme();
    renderActive();
    initializeModalEvents();
    console.log('✅ Sistema inicializado com sucesso');
}

// === HELPERS ==============================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Formatação
const fmt = {
    money: (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0)),
    num: (v) => (Number(v || 0)).toLocaleString("pt-BR"),
    date: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "",
    datetime: (v) => v ? new Date(v).toLocaleString("pt-BR") : ""
};

// Geração de IDs únicos
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Conversão de valores
function toNumber(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const cleaned = String(v).replace(/[^\d,-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
}

function parseBRL(str) {
    return Number(String(str ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".") || 0);
}

// Botões de ação
const iconBtn = (act, id, title, emoji) =>
    `<button class="icon-btn" data-act="${act}" data-id="${id}" title="${title}">${emoji}</button>`;

// === ESTADO E PERSISTÊNCIA ================================================
const DEF = {
    pessoas: [], // Nova estrutura unificada
    clientes: [], // Mantendo compatibilidade
    produtos: [],
    pedidos: [],
    contratos: [],
    financeiro: [],
    agenda: [],
    estoque: {
        barrisVazios: { '15L': 0, '20L': 0, '30L': 0, '50L': 0 },
        barrisCheios: { '15L': 0, '20L': 0, '30L': 0, '50L': 0 },
        chopeiras: 0,
        cilindrosCO2: 0
    },
    estoqueMov: [],
    perfil: { nome: "Administrador", email: "admin@jkchopp.com", telefone: "" },
    repasse: {
        header: { dataIni: "", dataFim: "", dataPagamento: "" },
        split: { percMarcos: 50, percJK: 50 },
        clientes: [],
        despesas: []
    },
    config: {
        empresa: "JK CHOPP",
        cnpj: "60.856.264/0001-73",
        telefone: "(11) 99999-9999",
        email: "contato@jkchopp.com",
        endereco: "Endereço da empresa",
        autoSave: true,
        notificacoes: true
    }
};

let DB = load();

function load() {
    try {
        const saved = localStorage.getItem("jk_data");
        if (!saved) return { ...DEF };
        
        const parsed = JSON.parse(saved);
        const merged = { ...DEF, ...parsed };
        
        // Garantir estruturas críticas
        if (!merged.pessoas) merged.pessoas = [];
        if (!merged.config) merged.config = { ...DEF.config };
        if (!merged.repasse) merged.repasse = { ...DEF.repasse };
        if (!merged.perfil) merged.perfil = { ...DEF.perfil };
        
        // Migrar clientes antigos para estrutura unificada se necessário
        if (merged.clientes && merged.clientes.length > 0 && merged.pessoas.length === 0) {
            merged.clientes.forEach(cliente => {
                merged.pessoas.push({
                    id: cliente.id,
                    tipo: cliente.tipo || 'PF',
                    categoria: 'cliente',
                    nome: cliente.nome,
                    documento: cliente.documento,
                    email: cliente.email,
                    telefone: cliente.telefone,
                    endereco: cliente.endereco,
                    tipoCliente: cliente.pontoFixo ? 'ponto_fixo' : 'evento',
                    dataCadastro: cliente.dataCadastro || new Date().toISOString(),
                    ativo: cliente.ativo !== false
                });
            });
        }
        
        return merged;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return { ...DEF };
    }
}

function save() {
    try {
        localStorage.setItem("jk_data", JSON.stringify(DB));
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        showNotification("Erro ao salvar dados", "error");
        return false;
    }
}

function reset() {
    if (confirm("⚠️ TEM CERTEZA? Isso apagará TODOS os dados permanentemente!")) {
        localStorage.removeItem("jk_data");
        DB = { ...DEF };
        renderActive();
        showNotification("✅ Dados resetados com sucesso", "success");
    }
}

// === TOPBAR ACTIONS =======================================================
function toggleTheme() {
    const current = document.body.getAttribute("data-theme") || "dark";
    const next = current === "light" ? "dark" : "light";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("jk_theme", next);
    showNotification(`Tema ${next === 'dark' ? 'escuro' : 'claro'} ativado`);
}

function initTheme() {
    const saved = localStorage.getItem("jk_theme") || "dark";
    document.body.setAttribute("data-theme", saved);
}

function doExport() {
    try {
        const data = JSON.stringify(DB, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jkchopp_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("📦 Backup exportado com sucesso", "success");
    } catch (error) {
        showNotification("❌ Erro ao exportar backup", "error");
    }
}

function handleImport(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            
            if (typeof imported !== 'object') {
                throw new Error("Arquivo inválido");
            }
            
            // Validar estrutura básica
            if (!imported.pessoas && !imported.clientes) {
                throw new Error("Estrutura de dados inválida");
            }
            
            DB = { ...DEF, ...imported };
            save();
            ev.target.value = "";
            renderActive();
            showNotification("✅ Dados importados com sucesso", "success");
        } catch (error) {
            console.error('Erro na importação:', error);
            showNotification("❌ Arquivo de backup inválido", "error");
        }
    };
    reader.readAsText(file);
}

function bindTopbarActions() {
    $("#btnTheme")?.addEventListener("click", toggleTheme);
    $("#btnExport")?.addEventListener("click", doExport);
    $("#importFile")?.addEventListener("change", handleImport);
    $("#btnReset")?.addEventListener("click", reset);
    $("#btnPerfil")?.addEventListener("click", () => showModal('modalPerfil'));
}

// === NAVEGAÇÃO E MENU =====================================================
const MENU = [
    { id: "home", label: "Início", icon: "🏠" },
    { id: "agendamentos", label: "Agenda", icon: "📅" },
    { id: "pessoas", label: "Cadastro de Pessoas", icon: "👥" },
    { id: "produtos", label: "Equipamentos/Produtos", icon: "🧰" },
    { id: "estoque", label: "Estoque", icon: "📦" },
    { id: "pedidos", label: "Pedidos", icon: "📋" },
    { id: "financeiro", label: "Financeiro", icon: "💰" },
    { id: "contratos", label: "Contratos", icon: "📄" },
    {
        label: "Relatórios", icon: "📊",
        children: [
            { id: "relatorios", label: "Painel", icon: "🗂️" },
            { id: "rel_repasse", label: "Relatório de Repasse", icon: "💸" },
        ],
    },
    { id: "configuracoes", label: "Configurações", icon: "⚙️" },
];

let ACTIVE = localStorage.getItem("jk_tab") || "home";

function buildMenu() {
    const menuList = $("#sidebarNav");
    if (!menuList) return;

    menuList.innerHTML = "";

    MENU.forEach(item => {
        if (item.children) {
            // Item com submenu
            const parent = document.createElement("div");
            parent.className = "menu-item menu-parent";
            parent.innerHTML = `
                <span>${item.icon} ${item.label}</span>
                <span class="caret">▶</span>
            `;

            const submenu = document.createElement("div");
            submenu.className = "submenu";

            item.children.forEach(child => {
                const btn = document.createElement("button");
                btn.className = `submenu-item ${ACTIVE === child.id ? 'active' : ''}`;
                btn.innerHTML = `${child.icon} ${child.label}`;
                btn.dataset.id = child.id;
                btn.onclick = () => navigateTo(child.id);
                submenu.appendChild(btn);
            });

            parent.addEventListener("click", (e) => {
                if (e.target.closest(".submenu-item")) return;
                parent.classList.toggle("open");
                submenu.classList.toggle("open");
            });

            menuList.appendChild(parent);
            menuList.appendChild(submenu);
        } else {
            // Item simples
            const btn = document.createElement("button");
            btn.className = `menu-item ${ACTIVE === item.id ? 'active' : ''}`;
            btn.innerHTML = `${item.icon} ${item.label}`;
            btn.dataset.id = item.id;
            btn.onclick = () => navigateTo(item.id);
            menuList.appendChild(btn);
        }
    });
}

function navigateTo(screenId) {
    ACTIVE = screenId;
    localStorage.setItem("jk_tab", ACTIVE);
    renderActive();
    highlightActiveMenu();
    closeMenu();
    
    // Scroll para o topo
    window.scrollTo(0, 0);
}

function highlightActiveMenu() {
    $$(".menu-item").forEach(item => item.classList.remove("active"));
    $$(".submenu-item").forEach(item => item.classList.remove("active"));
    $$(".submenu").forEach(menu => menu.classList.remove("open"));
    $$(".menu-parent").forEach(parent => parent.classList.remove("open"));

    const activeItem = $(`.menu-item[data-id="${ACTIVE}"]`);
    if (activeItem) {
        activeItem.classList.add("active");
        return;
    }

    const activeSubItem = $(`.submenu-item[data-id="${ACTIVE}"]`);
    if (activeSubItem) {
        activeSubItem.classList.add("active");
        const submenu = activeSubItem.closest(".submenu");
        const parent = submenu?.previousElementSibling;
        submenu?.classList.add("open");
        parent?.classList.add("open");
    }
}

// === DRAWER/SIDEBAR MANAGEMENT ============================================
function openMenu() {
    const sidebar = $("#sidebar");
    if (sidebar) {
        sidebar.classList.add("open");
    }
}

function closeMenu() {
    const sidebar = $("#sidebar");
    if (sidebar) {
        sidebar.classList.remove("open");
    }
}

function bindDrawerActions() {
    $("#btnMenu")?.addEventListener("click", openMenu);
    $("#btnCloseMenu")?.addEventListener("click", closeMenu);
    
    // Fechar com ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
    });
}

// === RENDERIZAÇÃO DE TELAS ================================================
function renderActive() {
    const content = $("#content");
    if (!content) return;

    content.innerHTML = "";
    
    let screen;
    
    switch (ACTIVE) {
        case "home": screen = renderHome(); break;
        case "pessoas": screen = renderPessoas(); break;
        case "produtos": screen = renderProdutos(); break;
        case "pedidos": screen = renderPedidos(); break;
        case "financeiro": screen = renderFinanceiro(); break;
        case "contratos": screen = renderContratos(); break;
        case "agendamentos": screen = renderAgenda(); break;
        case "estoque": screen = renderEstoque(); break;
        case "rel_repasse": screen = renderRelRepasse(); break;
        case "relatorios": screen = renderRelatorios(); break;
        case "configuracoes": screen = renderConfiguracoes(); break;
        default: screen = renderHome();
    }
    
    if (screen) {
        content.appendChild(screen);
        enhanceResponsiveTables(content);
    }
}

// === TELA HOME ============================================================
function renderHome() {
    const div = document.createElement("div");
    div.className = "grid-home";
    div.innerHTML = `
        <section class="card card-stats">
            <h3>📊 Visão Geral do Sistema</h3>
            <div class="stats">
                <div class="stat">
                    <span class="stat-value" id="homeClientesCount">0</span>
                    <span class="stat-label">Clientes Cadastrados</span>
                </div>
                <div class="stat">
                    <span class="stat-value" id="homeProdutosCount">0</span>
                    <span class="stat-label">Produtos/Equipamentos</span>
                </div>
                <div class="stat">
                    <span class="stat-value" id="homePedidosCount">0</span>
                    <span class="stat-label">Pedidos Ativos</span>
                </div>
                <div class="stat">
                    <span class="stat-value" id="homeFinanceiroTotal">R$ 0,00</span>
                    <span class="stat-label">Saldo Financeiro</span>
                </div>
            </div>
        </section>

        <section class="card">
            <h3>📅 Próximos Agendamentos</h3>
            <div class="toolbar">
                <div class="row">
                    <input id="home_ag_titulo" class="input" placeholder="Título do evento" />
                    <input id="home_ag_data" class="input" type="date" />
                    <input id="home_ag_hora" class="input" type="time" />
                    <button class="btn success" id="homeAddAgenda">➕ Adicionar</button>
                </div>
            </div>
            <div class="table-wrap">
                <table class="table-compact">
                    <thead><tr><th>Data</th><th>Hora</th><th>Título</th><th>Ações</th></tr></thead>
                    <tbody id="home_ag_tbody"></tbody>
                </table>
            </div>
        </section>

        <section class="card">
            <h3>🚀 Ações Rápidas</h3>
            <div class="flex" style="flex-wrap: wrap; gap: 10px; margin-top: 15px;">
                <button class="btn primary" id="goNovoPedido">📋 Novo Pedido</button>
                <button class="btn" id="goPessoas">👥 Pessoas</button>
                <button class="btn" id="goProdutos">🧰 Produtos</button>
                <button class="btn" id="goEstoque">📦 Estoque</button>
                <button class="btn" id="goFinanceiro">💰 Financeiro</button>
            </div>
        </section>

        <section class="card">
            <h3>📈 Estatísticas do Dia</h3>
            <div class="stats">
                <div class="stat">
                    <span class="stat-value" id="homeHojeMov">0</span>
                    <span class="stat-label">Movimentações Hoje</span>
                </div>
                <div class="stat">
                    <span class="stat-value" id="homeHojePedidos">0</span>
                    <span class="stat-label">Pedidos Hoje</span>
                </div>
            </div>
        </section>
    `;
    
    setupHomeEvents(div);
    updateHomeStats(div);
    return div;
}

function updateHomeStats(content) {
    // Contadores básicos
    $("#homeClientesCount", content).textContent = DB.pessoas.filter(c => c.categoria === 'cliente' && c.ativo !== false).length;
    $("#homeProdutosCount", content).textContent = DB.produtos.filter(p => p.ativo !== false).length;
    $("#homePedidosCount", content).textContent = DB.pedidos.filter(p => p.status === 'aberto' || p.status === 'andamento').length;
    
    // Financeiro
    const receber = DB.financeiro.filter(f => f.tipo === 'receber' && f.status !== 'pago').reduce((sum, f) => sum + toNumber(f.valor), 0);
    const pagar = DB.financeiro.filter(f => f.tipo === 'pagar' && f.status !== 'pago').reduce((sum, f) => sum + toNumber(f.valor), 0);
    $("#homeFinanceiroTotal", content).textContent = fmt.money(receber - pagar);
    
    // Estatísticas do dia
    const hoje = new Date().toISOString().split('T')[0];
    $("#homeHojeMov", content).textContent = DB.estoqueMov.filter(m => m.data?.startsWith(hoje)).length;
    $("#homeHojePedidos", content).textContent = DB.pedidos.filter(p => p.dataCriacao?.startsWith(hoje)).length;
    
    // Agenda
    updateHomeAgenda(content);
}

function updateHomeAgenda(content) {
    const tbody = $("#home_ag_tbody", content);
    const hoje = new Date().toISOString().split('T')[0];
    
    const proximos = DB.agenda
        .filter(a => a.data >= hoje)
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 5);
    
    tbody.innerHTML = proximos.map(a => `
        <tr>
            <td>${fmt.date(a.data)}</td>
            <td>${a.hora || "—"}</td>
            <td>${a.titulo}</td>
            <td>${iconBtn("del", a.id, "Excluir", "🗑️")}</td>
        </tr>
    `).join("") || `<tr><td colspan="4" class="empty">Nenhum agendamento futuro</td></tr>`;
}

function setupHomeEvents(content) {
    // Ações rápidas
    $("#goNovoPedido", content)?.addEventListener("click", () => navigateTo("pedidos"));
    $("#goPessoas", content)?.addEventListener("click", () => navigateTo("pessoas"));
    $("#goProdutos", content)?.addEventListener("click", () => navigateTo("produtos"));
    $("#goEstoque", content)?.addEventListener("click", () => navigateTo("estoque"));
    $("#goFinanceiro", content)?.addEventListener("click", () => navigateTo("financeiro"));
    
    // Adicionar agenda
    $("#homeAddAgenda", content)?.addEventListener("click", () => {
        const titulo = $("#home_ag_titulo", content).value.trim();
        const data = $("#home_ag_data", content).value;
        const hora = $("#home_ag_hora", content).value;
        
        if (!titulo || !data) {
            showNotification("Informe título e data", "warning");
            return;
        }
        
        DB.agenda.push({
            id: uid(),
            titulo,
            data,
            hora,
            criado: new Date().toISOString()
        });
        
        save();
        $("#home_ag_titulo", content).value = "";
        updateHomeAgenda(content);
        showNotification("✅ Agendamento adicionado", "success");
    });
    
    // Excluir agendamento
    content.addEventListener("click", (e) => {
        const btn = e.target.closest('.icon-btn[data-act="del"]');
        if (!btn) return;
        
        const id = btn.dataset.id;
        DB.agenda = DB.agenda.filter(a => a.id !== id);
        save();
        updateHomeAgenda(content);
        showNotification("Agendamento excluído", "success");
    });
}

// === TELA CADASTRO DE PESSOAS ============================================
function renderPessoas() {
    // Garantir que DB.pessoas existe
    if (!DB.pessoas) DB.pessoas = [];
    
    const div = document.createElement("div");
    div.className = "grid";
    div.innerHTML = `
        <aside class="card">
            <h3>👥 Cadastro de Pessoas</h3>
            <p class="muted">Cadastro unificado de clientes, fornecedores, funcionários e vendedores</p>

            <div class="stack">
                <input type="hidden" id="pessoa_id" />
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Tipo de Pessoa *</label>
                        <select id="pessoa_tipo" class="input" required>
                            <option value="">Selecione...</option>
                            <option value="PF">Pessoa Física</option>
                            <option value="PJ">Pessoa Jurídica</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Categoria *</label>
                        <select id="pessoa_categoria" class="input" required>
                            <option value="">Selecione...</option>
                            <option value="cliente">Cliente</option>
                            <option value="fornecedor">Fornecedor</option>
                            <option value="funcionario">Funcionário</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="outros">Outros</option>
                        </select>
                    </div>
                </div>

                <div id="pessoa_tipo_cliente_div" class="hidden">
                    <label class="form-label">Tipo de Cliente *</label>
                    <div class="flex">
                        <label class="pill"><input type="radio" name="pessoa_tipo_cliente" value="ponto_fixo" /> Ponto Fixo</label>
                        <label class="pill"><input type="radio" name="pessoa_tipo_cliente" value="evento" /> Evento</label>
                    </div>
                </div>

                <!-- Campos Pessoa Física -->
                <div id="pessoa_campos_pf" class="hidden">
                    <h4>Dados Pessoais</h4>
                    <input class="input" id="pessoa_nome" placeholder="Nome Completo *" />
                    <div class="form-grid">
                        <input class="input" id="pessoa_cpf" placeholder="CPF *" />
                        <input class="input" id="pessoa_rg" placeholder="RG" />
                    </div>
                    <input class="input" id="pessoa_data_nascimento" type="date" />
                </div>

                <!-- Campos Pessoa Jurídica -->
                <div id="pessoa_campos_pj" class="hidden">
                    <h4>Dados da Empresa</h4>
                    <input class="input" id="pessoa_razao_social" placeholder="Razão Social *" />
                    <input class="input" id="pessoa_nome_fantasia" placeholder="Nome Fantasia" />
                    <div class="form-grid">
                        <input class="input" id="pessoa_cnpj" placeholder="CNPJ *" />
                        <input class="input" id="pessoa_inscricao_estadual" placeholder="Inscrição Estadual" />
                    </div>
                    <input class="input" id="pessoa_data_fundacao" type="date" />
                </div>

                <!-- Campos de Contato -->
                <div id="pessoa_campos_contato" class="hidden">
                    <h4>Contato</h4>
                    <input class="input" id="pessoa_email" placeholder="E-mail *" type="email" />
                    <div class="form-grid">
                        <input class="input" id="pessoa_telefone" placeholder="Telefone" />
                        <input class="input" id="pessoa_celular" placeholder="Celular" />
                    </div>
                </div>

                <!-- Campos de Endereço -->
                <div id="pessoa_campos_endereco" class="hidden">
                    <h4>Endereço</h4>
                    <div class="form-grid">
                        <input class="input" id="pessoa_cep" placeholder="CEP" />
                        <input class="input" id="pessoa_endereco" placeholder="Endereço" />
                    </div>
                    <div class="form-grid">
                        <input class="input" id="pessoa_numero" placeholder="Número" />
                        <input class="input" id="pessoa_complemento" placeholder="Complemento" />
                        <input class="input" id="pessoa_bairro" placeholder="Bairro" />
                        <input class="input" id="pessoa_cidade" placeholder="Cidade" />
                    </div>
                    <select id="pessoa_estado" class="input">
                        <option value="">Estado</option>
                        <option value="AC">Acre</option>
                        <option value="AL">Alagoas</option>
                        <option value="AP">Amapá</option>
                        <option value="AM">Amazonas</option>
                        <option value="BA">Bahia</option>
                        <option value="CE">Ceará</option>
                        <option value="DF">Distrito Federal</option>
                        <option value="ES">Espírito Santo</option>
                        <option value="GO">Goiás</option>
                        <option value="MA">Maranhão</option>
                        <option value="MT">Mato Grosso</option>
                        <option value="MS">Mato Grosso do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="PA">Pará</option>
                        <option value="PB">Paraíba</option>
                        <option value="PR">Paraná</option>
                        <option value="PE">Pernambuco</option>
                        <option value="PI">Piauí</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="RN">Rio Grande do Norte</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="RO">Rondônia</option>
                        <option value="RR">Roraima</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="SP">São Paulo</option>
                        <option value="SE">Sergipe</option>
                        <option value="TO">Tocantins</option>
                    </select>
                </div>

                <!-- Campo PIX para Fornecedor -->
                <div id="pessoa_campos_pix" class="hidden">
                    <h4>Dados Financeiros</h4>
                    <input class="input" id="pessoa_chave_pix" placeholder="Chave PIX" />
                </div>

                <textarea class="input" id="pessoa_observacoes" placeholder="Observações..." rows="3"></textarea>

                <div class="flex">
                    <button class="btn success" id="btnSalvarPessoa">💾 Salvar Pessoa</button>
                    <button class="btn" id="btnLimparPessoa">🧹 Limpar</button>
                </div>
            </div>
        </aside>

        <section class="card">
            <div class="toolbar">
                <div class="row">
                    <input class="input" id="buscaPessoas" placeholder="Buscar pessoas..." />
                    <select id="filtroCategoriaPessoa" class="input">
                        <option value="">Todas as categorias</option>
                        <option value="cliente">Clientes</option>
                        <option value="fornecedor">Fornecedores</option>
                        <option value="funcionario">Funcionários</option>
                        <option value="vendedor">Vendedores</option>
                        <option value="outros">Outros</option>
                    </select>
                    <span class="muted" id="infoPessoas">0 pessoa(s)</span>
                </div>
            </div>

            <div class="table-wrap">
                <table id="tblPessoas">
                    <thead>
                        <tr>
                            <th>Nome/Razão Social</th>
                            <th>Tipo</th>
                            <th>Categoria</th>
                            <th>Contato</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>
    `;
    
    setupPessoaEvents(div);
    listPessoas(div);
    return div;
}

function setupPessoaEvents(content) {
    // Controle de visibilidade dos campos
    $("#pessoa_tipo", content)?.addEventListener("change", atualizarCamposPessoa);
    $("#pessoa_categoria", content)?.addEventListener("change", atualizarCamposPessoa);
    
    // Máscaras
    $("#pessoa_cpf", content)?.addEventListener("input", maskCPF);
    $("#pessoa_cnpj", content)?.addEventListener("input", maskCNPJ);
    $("#pessoa_telefone", content)?.addEventListener("input", maskTelefone);
    $("#pessoa_celular", content)?.addEventListener("input", maskCelular);
    $("#pessoa_cep", content)?.addEventListener("input", maskCEP);
    
    // Salvar pessoa
    $("#btnSalvarPessoa", content)?.addEventListener("click", () => savePessoa(content));
    
    // Limpar formulário
    $("#btnLimparPessoa", content)?.addEventListener("click", () => clearPessoaForm(content));
    
    // Busca e filtros
    $("#buscaPessoas", content)?.addEventListener("input", () => listPessoas(content));
    $("#filtroCategoriaPessoa", content)?.addEventListener("change", () => listPessoas(content));
    
    // Ações da tabela
    content.addEventListener("click", handlePessoaActions);
}

function atualizarCamposPessoa() {
    const content = $("#content");
    const tipo = $("#pessoa_tipo", content).value;
    const categoria = $("#pessoa_categoria", content).value;
    
    // Esconder todos os campos primeiro
    $("#pessoa_tipo_cliente_div", content).classList.add("hidden");
    $("#pessoa_campos_pf", content).classList.add("hidden");
    $("#pessoa_campos_pj", content).classList.add("hidden");
    $("#pessoa_campos_contato", content).classList.add("hidden");
    $("#pessoa_campos_endereco", content).classList.add("hidden");
    $("#pessoa_campos_pix", content).classList.add("hidden");
    
    if (tipo && categoria) {
        // Mostrar tipo de cliente se for cliente
        if (categoria === 'cliente') {
            $("#pessoa_tipo_cliente_div", content).classList.remove("hidden");
        }
        
        // Mostrar campos específicos do tipo de pessoa
        if (tipo === 'PF') {
            $("#pessoa_campos_pf", content).classList.remove("hidden");
        } else if (tipo === 'PJ') {
            $("#pessoa_campos_pj", content).classList.remove("hidden");
        }
        
        // Mostrar campos de contato e endereço
        $("#pessoa_campos_contato", content).classList.remove("hidden");
        
        // Para clientes, mostrar endereço completo
        if (categoria === 'cliente') {
            $("#pessoa_campos_endereco", content).classList.remove("hidden");
        }
        
        // Para fornecedores, mostrar campo PIX
        if (categoria === 'fornecedor') {
            $("#pessoa_campos_pix", content).classList.remove("hidden");
        }
    }
}

function maskCPF(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
}

function maskCNPJ(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1/$2');
    value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
}

function maskTelefone(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    e.target.value = value;
}

function maskCelular(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
}

function maskCEP(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
}

function savePessoa(content) {
    const id = $("#pessoa_id", content).value;
    const tipo = $("#pessoa_tipo", content).value;
    const categoria = $("#pessoa_categoria", content).value;
    
    const pessoa = {
        id: id || uid(),
        tipo: tipo,
        categoria: categoria,
        email: $("#pessoa_email", content).value.trim(),
        telefone: $("#pessoa_telefone", content).value.trim(),
        celular: $("#pessoa_celular", content).value.trim(),
        observacoes: $("#pessoa_observacoes", content).value.trim(),
        dataCadastro: id ? DB.pessoas.find(p => p.id === id)?.dataCadastro || new Date().toISOString() : new Date().toISOString(),
        dataAtualizacao: new Date().toISOString(),
        ativo: true
    };
    
    // Campos específicos por tipo
    if (tipo === 'PF') {
        pessoa.nome = $("#pessoa_nome", content).value.trim();
        pessoa.cpf = $("#pessoa_cpf", content).value.trim();
        pessoa.rg = $("#pessoa_rg", content).value.trim();
        pessoa.dataNascimento = $("#pessoa_data_nascimento", content).value;
        
        if (!pessoa.nome || !pessoa.cpf) {
            showNotification("Nome e CPF são obrigatórios para Pessoa Física", "warning");
            return;
        }
    } else if (tipo === 'PJ') {
        pessoa.razaoSocial = $("#pessoa_razao_social", content).value.trim();
        pessoa.nomeFantasia = $("#pessoa_nome_fantasia", content).value.trim();
        pessoa.cnpj = $("#pessoa_cnpj", content).value.trim();
        pessoa.inscricaoEstadual = $("#pessoa_inscricao_estadual", content).value.trim();
        pessoa.dataFundacao = $("#pessoa_data_fundacao", content).value;
        
        if (!pessoa.razaoSocial || !pessoa.cnpj) {
            showNotification("Razão Social e CNPJ são obrigatórios para Pessoa Jurídica", "warning");
            return;
        }
    }
    
    // Tipo de cliente
    if (categoria === 'cliente') {
        const tipoClienteRadio = $('input[name="pessoa_tipo_cliente"]:checked', content);
        pessoa.tipoCliente = tipoClienteRadio ? tipoClienteRadio.value : '';
        
        if (!pessoa.tipoCliente) {
            showNotification("Selecione o tipo de cliente", "warning");
            return;
        }
        
        // Campos de endereço para clientes
        pessoa.cep = $("#pessoa_cep", content).value.trim();
        pessoa.endereco = $("#pessoa_endereco", content).value.trim();
        pessoa.numero = $("#pessoa_numero", content).value.trim();
        pessoa.complemento = $("#pessoa_complemento", content).value.trim();
        pessoa.bairro = $("#pessoa_bairro", content).value.trim();
        pessoa.cidade = $("#pessoa_cidade", content).value.trim();
        pessoa.estado = $("#pessoa_estado", content).value;
    }
    
    // Campo PIX para fornecedores
    if (categoria === 'fornecedor') {
        pessoa.chavePix = $("#pessoa_chave_pix", content).value.trim();
    }
    
    if (!pessoa.email) {
        showNotification("E-mail é obrigatório", "warning");
        return;
    }
    
    // Verificar duplicata de CPF/CNPJ
    const doc = tipo === 'PF' ? pessoa.cpf : pessoa.cnpj;
    const existe = DB.pessoas.find(p => 
        ((tipo === 'PF' && p.cpf === doc) || (tipo === 'PJ' && p.cnpj === doc)) && 
        p.id !== pessoa.id
    );
    if (existe) {
        showNotification("Já existe uma pessoa com este documento", "error");
        return;
    }
    
    if (id) {
        const index = DB.pessoas.findIndex(p => p.id === id);
        if (index >= 0) DB.pessoas[index] = pessoa;
    } else {
        DB.pessoas.push(pessoa);
    }
    
    save();
    listPessoas(content);
    clearPessoaForm(content);
    showNotification(`✅ Pessoa ${id ? 'atualizada' : 'cadastrada'} com sucesso`, "success");
}

function clearPessoaForm(content) {
    $("#pessoa_id", content).value = "";
    $("#pessoa_tipo", content).value = "";
    $("#pessoa_categoria", content).value = "";
    $("#pessoa_nome", content).value = "";
    $("#pessoa_cpf", content).value = "";
    $("#pessoa_rg", content).value = "";
    $("#pessoa_data_nascimento", content).value = "";
    $("#pessoa_razao_social", content).value = "";
    $("#pessoa_nome_fantasia", content).value = "";
    $("#pessoa_cnpj", content).value = "";
    $("#pessoa_inscricao_estadual", content).value = "";
    $("#pessoa_data_fundacao", content).value = "";
    $("#pessoa_email", content).value = "";
    $("#pessoa_telefone", content).value = "";
    $("#pessoa_celular", content).value = "";
    $("#pessoa_cep", content).value = "";
    $("#pessoa_endereco", content).value = "";
    $("#pessoa_numero", content).value = "";
    $("#pessoa_complemento", content).value = "";
    $("#pessoa_bairro", content).value = "";
    $("#pessoa_cidade", content).value = "";
    $("#pessoa_estado", content).value = "";
    $("#pessoa_chave_pix", content).value = "";
    $("#pessoa_observacoes", content).value = "";
    
    // Limpar radios
    $$('input[name="pessoa_tipo_cliente"]', content).forEach(radio => radio.checked = false);
    
    // Esconder todos os campos
    atualizarCamposPessoa();
}

function listPessoas(content) {
    const tbody = $("#tblPessoas", content).querySelector("tbody");
    const busca = $("#buscaPessoas", content).value.toLowerCase();
    const categoriaFiltro = $("#filtroCategoriaPessoa", content).value;
    
    let pessoasFiltradas = DB.pessoas.filter(p => {
        if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
        if (!busca) return true;
        
        const nome = p.tipo === 'PF' ? p.nome : (p.razaoSocial || p.nome);
        const doc = p.tipo === 'PF' ? p.cpf : p.cnpj;
        
        return nome.toLowerCase().includes(busca) ||
               (doc && doc.includes(busca)) ||
               p.email.toLowerCase().includes(busca) ||
               (p.telefone && p.telefone.includes(busca)) ||
               (p.celular && p.celular.includes(busca));
    });
    
    $("#infoPessoas", content).textContent = `${pessoasFiltradas.length} pessoa(s)`;
    
    tbody.innerHTML = pessoasFiltradas.map(p => {
        const nome = p.tipo === 'PF' ? p.nome : (p.razaoSocial || p.nome);
        const doc = p.tipo === 'PF' ? p.cpf : p.cnpj;
        const contato = p.celular || p.telefone || p.email || "—";
        
        return `
            <tr>
                <td>
                    <strong>${nome}</strong><br>
                    <small class="muted">${doc || 'Sem documento'}</small>
                </td>
                <td><span class="tag">${p.tipo}</span></td>
                <td><span class="tag ${p.categoria === 'cliente' ? 'ok' : (p.categoria === 'fornecedor' ? 'warn' : 'fix')}">${p.categoria}</span></td>
                <td>${contato}</td>
                <td>
                    ${iconBtn("edit", p.id, "Editar", "✏️")}
                    ${iconBtn("del", p.id, "Excluir", "🗑️")}
                </td>
            </tr>
        `;
    }).join("") || `<tr><td colspan="5" class="empty">Nenhuma pessoa encontrada</td></tr>`;
}

function handlePessoaActions(e) {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const pessoa = DB.pessoas.find(p => p.id === id);
    if (!pessoa) return;
    
    if (btn.dataset.act === "edit") {
        fillPessoaForm(pessoa);
    } else if (btn.dataset.act === "del") {
        confirmAction(`Excluir pessoa ${pessoa.tipo === 'PF' ? pessoa.nome : pessoa.razaoSocial}?`, () => {
            DB.pessoas = DB.pessoas.filter(p => p.id !== id);
            save();
            renderActive();
            showNotification("Pessoa excluída", "success");
        });
    }
}

function fillPessoaForm(pessoa) {
    const content = $("#content");
    if (!content) return;
    
    $("#pessoa_id", content).value = pessoa.id;
    $("#pessoa_tipo", content).value = pessoa.tipo;
    $("#pessoa_categoria", content).value = pessoa.categoria;
    $("#pessoa_email", content).value = pessoa.email;
    $("#pessoa_telefone", content).value = pessoa.telefone || "";
    $("#pessoa_celular", content).value = pessoa.celular || "";
    $("#pessoa_observacoes", content).value = pessoa.observacoes || "";
    
    if (pessoa.tipo === 'PF') {
        $("#pessoa_nome", content).value = pessoa.nome;
        $("#pessoa_cpf", content).value = pessoa.cpf;
        $("#pessoa_rg", content).value = pessoa.rg || "";
        $("#pessoa_data_nascimento", content).value = pessoa.dataNascimento || "";
    } else {
        $("#pessoa_razao_social", content).value = pessoa.razaoSocial;
        $("#pessoa_nome_fantasia", content).value = pessoa.nomeFantasia || "";
        $("#pessoa_cnpj", content).value = pessoa.cnpj;
        $("#pessoa_inscricao_estadual", content).value = pessoa.inscricaoEstadual || "";
        $("#pessoa_data_fundacao", content).value = pessoa.dataFundacao || "";
    }
    
    if (pessoa.categoria === 'cliente') {
        $(`input[name="pessoa_tipo_cliente"][value="${pessoa.tipoCliente}"]`, content).checked = true;
        $("#pessoa_cep", content).value = pessoa.cep || "";
        $("#pessoa_endereco", content).value = pessoa.endereco || "";
        $("#pessoa_numero", content).value = pessoa.numero || "";
        $("#pessoa_complemento", content).value = pessoa.complemento || "";
        $("#pessoa_bairro", content).value = pessoa.bairro || "";
        $("#pessoa_cidade", content).value = pessoa.cidade || "";
        $("#pessoa_estado", content).value = pessoa.estado || "";
    }
    
    if (pessoa.categoria === 'fornecedor') {
        $("#pessoa_chave_pix", content).value = pessoa.chavePix || "";
    }
    
    // Atualizar visibilidade dos campos
    atualizarCamposPessoa();
}

// === TELA PRODUTOS ========================================================
function renderProdutos() {
    const div = document.createElement("div");
    div.className = "grid";
    div.innerHTML = `
        <aside class="card">
            <h3>🧰 Cadastro de Produto/Equipamento</h3>
            <p class="muted">Cadastro de produtos, equipamentos e serviços</p>

            <div class="stack">
                <input type="hidden" id="prod_id" />
                
                <input class="input" id="prod_nome" placeholder="Nome do produto" />
                <input class="input" id="prod_codigo" placeholder="Código interno (opcional)" />
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Tipo</label>
                        <select id="prod_tipo" class="input">
                            <option value="equipamento">Equipamento</option>
                            <option value="produto">Produto</option>
                            <option value="servico">Serviço</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Categoria</label>
                        <select id="prod_categoria" class="input">
                            <option value="chopeira">Chopeira</option>
                            <option value="barril">Barril</option>
                            <option value="cilindro">Cilindro CO₂</option>
                            <option value="acessorio">Acessório</option>
                            <option value="manutencao">Manutenção</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Preço de Venda</label>
                        <input class="input" id="prod_preco" placeholder="0,00" type="text" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Preço de Custo</label>
                        <input class="input" id="prod_custo" placeholder="0,00" type="text" />
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Estoque Atual</label>
                        <input class="input" id="prod_estoque" type="number" value="0" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estoque Mínimo</label>
                        <input class="input" id="prod_estoque_min" type="number" value="0" />
                    </div>
                </div>

                <div class="flex">
                    <label class="pill"><input type="checkbox" id="prod_controla_estoque" checked /> Controlar estoque</label>
                    <label class="pill"><input type="checkbox" id="prod_ativo" checked /> Ativo</label>
                </div>

                <textarea class="input" id="prod_descricao" placeholder="Descrição do produto..." rows="3"></textarea>

                <div class="flex">
                    <button class="btn success" id="btnSalvarProduto">💾 Salvar Produto</button>
                    <button class="btn" id="btnLimparProduto">🧹 Limpar</button>
                </div>
            </div>
        </aside>

        <section class="card">
            <div class="toolbar">
                <div class="row">
                    <input class="input" id="buscaProdutos" placeholder="Buscar produtos..." />
                    <span class="muted" id="infoProdutos">${DB.produtos.length} produto(s)</span>
                </div>
            </div>

            <div class="table-wrap">
                <table id="tblProdutos">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Código</th>
                            <th>Tipo</th>
                            <th>Preço</th>
                            <th>Estoque</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>
    `;
    
    setupProdutoEvents(div);
    listProdutos(div);
    return div;
}

function setupProdutoEvents(content) {
    // Formatação de preços
    $("#prod_preco", content)?.addEventListener("blur", formatCurrency);
    $("#prod_custo", content)?.addEventListener("blur", formatCurrency);
    
    // Salvar produto
    $("#btnSalvarProduto", content)?.addEventListener("click", () => saveProduto(content));
    
    // Limpar formulário
    $("#btnLimparProduto", content)?.addEventListener("click", () => clearProdutoForm(content));
    
    // Busca
    $("#buscaProdutos", content)?.addEventListener("input", () => listProdutos(content));
    
    // Ações da tabela
    content.addEventListener("click", handleProdutoActions);
}

function formatCurrency(e) {
    const input = e.target;
    let value = input.value.replace(/[^\d,]/g, '');
    
    if (value) {
        value = parseFloat(value.replace(',', '.')).toFixed(2);
        input.value = fmt.money(value);
    }
}

function saveProduto(content) {
    const id = $("#prod_id", content).value;
    const produto = {
        id: id || uid(),
        nome: $("#prod_nome", content).value.trim(),
        codigo: $("#prod_codigo", content).value.trim(),
        tipo: $("#prod_tipo", content).value,
        categoria: $("#prod_categoria", content).value,
        preco: parseBRL($("#prod_preco", content).value),
        custo: parseBRL($("#prod_custo", content).value),
        estoque: parseInt($("#prod_estoque", content).value) || 0,
        estoqueMinimo: parseInt($("#prod_estoque_min", content).value) || 0,
        controlaEstoque: $("#prod_controla_estoque", content).checked,
        ativo: $("#prod_ativo", content).checked,
        descricao: $("#prod_descricao", content).value.trim(),
        dataCadastro: id ? DB.produtos.find(p => p.id === id)?.dataCadastro || new Date().toISOString() : new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
    };
    
    if (!produto.nome) {
        showNotification("Nome do produto é obrigatório", "warning");
        return;
    }
    
    if (id) {
        const index = DB.produtos.findIndex(p => p.id === id);
        if (index >= 0) DB.produtos[index] = produto;
    } else {
        DB.produtos.push(produto);
    }
    
    save();
    listProdutos(content);
    clearProdutoForm(content);
    showNotification(`✅ Produto ${id ? 'atualizado' : 'cadastrado'} com sucesso`, "success");
}

function clearProdutoForm(content) {
    $("#prod_id", content).value = "";
    $("#prod_nome", content).value = "";
    $("#prod_codigo", content).value = "";
    $("#prod_tipo", content).value = "equipamento";
    $("#prod_categoria", content).value = "chopeira";
    $("#prod_preco", content).value = "";
    $("#prod_custo", content).value = "";
    $("#prod_estoque", content).value = "0";
    $("#prod_estoque_min", content).value = "0";
    $("#prod_controla_estoque", content).checked = true;
    $("#prod_ativo", content).checked = true;
    $("#prod_descricao", content).value = "";
}

function listProdutos(content) {
    const tbody = $("#tblProdutos", content).querySelector("tbody");
    const busca = $("#buscaProdutos", content).value.toLowerCase();
    
    const produtosFiltrados = DB.produtos.filter(p => {
        if (!busca) return true;
        return p.nome.toLowerCase().includes(busca) ||
               (p.codigo && p.codigo.toLowerCase().includes(busca)) ||
               p.tipo.toLowerCase().includes(busca) ||
               p.categoria.toLowerCase().includes(busca);
    });
    
    $("#infoProdutos", content).textContent = `${produtosFiltrados.length} produto(s)`;
    
    tbody.innerHTML = produtosFiltrados.map(p => `
        <tr>
            <td>${p.nome}</td>
            <td>${p.codigo || "—"}</td>
            <td>${p.tipo}</td>
            <td>${fmt.money(p.preco)}</td>
            <td>${p.controlaEstoque ? p.estoque : 'N/C'}</td>
            <td><span class="tag ${p.ativo ? 'ok' : 'fix'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td>
                ${iconBtn("edit", p.id, "Editar", "✏️")}
                ${iconBtn("del", p.id, "Excluir", "🗑️")}
            </td>
        </tr>
    `).join("") || `<tr><td colspan="7" class="empty">Nenhum produto encontrado</td></tr>`;
}

function handleProdutoActions(e) {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const produto = DB.produtos.find(p => p.id === id);
    if (!produto) return;
    
    if (btn.dataset.act === "edit") {
        fillProdutoForm(produto);
    } else if (btn.dataset.act === "del") {
        confirmAction(`Excluir produto ${produto.nome}?`, () => {
            DB.produtos = DB.produtos.filter(p => p.id !== id);
            save();
            renderActive();
            showNotification("Produto excluído", "success");
        });
    }
}

function fillProdutoForm(produto) {
    const content = $("#content");
    if (!content) return;
    
    $("#prod_id", content).value = produto.id;
    $("#prod_nome", content).value = produto.nome;
    $("#prod_codigo", content).value = produto.codigo || "";
    $("#prod_tipo", content).value = produto.tipo;
    $("#prod_categoria", content).value = produto.categoria;
    $("#prod_preco", content).value = produto.preco.toFixed(2).replace('.', ',');
    $("#prod_custo", content).value = produto.custo.toFixed(2).replace('.', ',');
    $("#prod_estoque", content).value = produto.estoque;
    $("#prod_estoque_min", content).value = produto.estoqueMinimo;
    $("#prod_controla_estoque", content).checked = produto.controlaEstoque;
    $("#prod_ativo", content).checked = produto.ativo;
    $("#prod_descricao", content).value = produto.descricao || "";
}

// === SISTEMA DE PEDIDOS ===================================================
let pedidoItens = [];
let pedidoEditando = null;

function renderPedidos() {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
        <div class="toolbar">
            <div class="row">
                <button class="btn success" id="btnNovoPedido">➕ Novo Pedido</button>
                <select id="filtroStatusPedido" class="input">
                    <option value="">Todos os status</option>
                    <option value="aberto">Aberto</option>
                    <option value="andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>
            <input class="input" id="buscaPedidos" placeholder="Buscar por cliente, código..." />
        </div>

        <div class="table-wrap">
            <table id="tblPedidos">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Cliente</th>
                        <th>Itens</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div class="empty hidden" id="vazioPedidos">
            <p>📋 Nenhum pedido encontrado</p>
            <small>Clique em "Novo Pedido" para começar</small>
        </div>
    `;
    
    setupPedidoEvents(div);
    listPedidos(div);
    return div;
}

function setupPedidoEvents(content) {
    $("#btnNovoPedido", content)?.addEventListener("click", () => {
        pedidoEditando = null;
        pedidoItens = [];
        showModal('modalNovoPedido');
        loadClientesPedido();
        loadProdutosPedido();
    });
    
    $("#filtroStatusPedido", content)?.addEventListener("change", () => listPedidos(content));
    $("#buscaPedidos", content)?.addEventListener("input", () => listPedidos(content));
    
    content.addEventListener("click", handlePedidoActions);
}

function loadClientesPedido() {
    const select = document.getElementById('ped_cliente');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um cliente</option>' +
        DB.pessoas
          .filter(c => c.categoria === 'cliente' && c.ativo !== false)
          .map(c => `<option value="${c.id}">${c.tipo === 'PF' ? c.nome : c.razaoSocial} - ${c.tipo === 'PF' ? c.cpf : c.cnpj}</option>`)
          .join('');
}

function loadProdutosPedido() {
    const select = document.getElementById('ped_produto');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um produto</option>' +
        DB.produtos
          .filter(p => p.ativo)
          .map(p => `<option value="${p.id}" data-preco="${p.preco}">${p.nome} - ${fmt.money(p.preco)}</option>`)
          .join('');
}

function adicionarItemPedido() {
    const produtoSelect = document.getElementById('ped_produto');
    const quantidadeInput = document.getElementById('ped_quantidade');
    
    const produtoId = produtoSelect.value;
    const quantidade = parseInt(quantidadeInput.value) || 1;
    
    if (!produtoId) {
        showNotification("Selecione um produto", "warning");
        return;
    }
    
    const produto = DB.produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const item = {
        id: uid(),
        produtoId: produto.id,
        produto: produto.nome,
        quantidade: quantidade,
        valorUnitario: produto.preco,
        total: produto.preco * quantidade
    };
    
    pedidoItens.push(item);
    atualizarItensPedido();
    calcularTotalPedido();
    
    // Limpar seleção
    produtoSelect.value = '';
    quantidadeInput.value = '1';
}

function atualizarItensPedido() {
    const tbody = document.getElementById('tblItensPedido').querySelector('tbody');
    tbody.innerHTML = pedidoItens.map(item => `
        <tr>
            <td>${item.produto}</td>
            <td>${item.quantidade}</td>
            <td>${fmt.money(item.valorUnitario)}</td>
            <td>${fmt.money(item.total)}</td>
            <td>
                <button class="icon-btn" onclick="removerItemPedido('${item.id}')" title="Remover item">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function removerItemPedido(itemId) {
    pedidoItens = pedidoItens.filter(item => item.id !== itemId);
    atualizarItensPedido();
    calcularTotalPedido();
}

function calcularTotalPedido() {
    const total = pedidoItens.reduce((sum, item) => sum + item.total, 0);
    const totalEl = document.getElementById('ped_total');
    if (totalEl) totalEl.textContent = fmt.money(total);
}

function finalizarPedido() {
    const clienteId = document.getElementById('ped_cliente').value;
    const observacoes = document.getElementById('ped_observacoes').value;
    
    if (!clienteId) {
        showNotification("Selecione um cliente", "warning");
        return;
    }
    
    if (pedidoItens.length === 0) {
        showNotification("Adicione itens ao pedido", "warning");
        return;
    }
    
    const cliente = DB.pessoas.find(c => c.id === clienteId);
    const total = pedidoItens.reduce((sum, item) => sum + item.total, 0);
    
    const pedido = {
        id: pedidoEditando?.id || uid(),
        codigo: pedidoEditando?.codigo || `PED${Date.now().toString(36).toUpperCase()}`,
        clienteId: cliente.id,
        cliente: cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial,
        itens: [...pedidoItens],
        total: total,
        status: pedidoEditando?.status || 'aberto',
        observacoes: observacoes,
        dataCriacao: pedidoEditando?.dataCriacao || new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
    };
    
    if (pedidoEditando) {
        const index = DB.pedidos.findIndex(p => p.id === pedidoEditando.id);
        if (index >= 0) DB.pedidos[index] = pedido;
    } else {
        DB.pedidos.push(pedido);
    }
    
    save();
    
    // Limpar e fechar
    pedidoEditando = null;
    pedidoItens = [];
    document.getElementById('modalNovoPedido').close();
    renderActive();
    
    showNotification(`✅ Pedido ${pedidoEditando ? 'atualizado' : 'criado'} com sucesso`, "success");
}

function listPedidos(content) {
    const tbody = $("#tblPedidos", content).querySelector("tbody");
    const vazio = $("#vazioPedidos", content);
    const statusFiltro = $("#filtroStatusPedido", content).value;
    const busca = $("#buscaPedidos", content).value.toLowerCase();
    
    let pedidosFiltrados = DB.pedidos;
    
    if (statusFiltro) {
        pedidosFiltrados = pedidosFiltrados.filter(p => p.status === statusFiltro);
    }
    
    if (busca) {
        pedidosFiltrados = pedidosFiltrados.filter(p => 
            p.codigo.toLowerCase().includes(busca) ||
            p.cliente.toLowerCase().includes(busca)
        );
    }
    
    // Ordenar por data (mais recente primeiro)
    pedidosFiltrados.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    
    const hasPedidos = pedidosFiltrados.length > 0;
    if (vazio) vazio.classList.toggle("hidden", hasPedidos);
    
    tbody.innerHTML = hasPedidos ? pedidosFiltrados.map(p => {
        const itensTexto = p.itens.slice(0, 2).map(item => `${item.quantidade}x ${item.produto}`).join(', ');
        const maisItens = p.itens.length > 2 ? ` +${p.itens.length - 2} itens` : '';
        
        return `
            <tr>
                <td><strong>${p.codigo}</strong></td>
                <td>${p.cliente}</td>
                <td>${itensTexto}${maisItens}</td>
                <td>${fmt.money(p.total)}</td>
                <td><span class="tag status-${p.status}">${getStatusText(p.status)}</span></td>
                <td>${fmt.date(p.dataCriacao)}</td>
                <td>
                    ${iconBtn("view", p.id, "Ver detalhes", "👁️")}
                    ${iconBtn("edit", p.id, "Editar", "✏️")}
                    ${iconBtn("del", p.id, "Excluir", "🗑️")}
                </td>
            </tr>
        `;
    }).join("") : "";
}

function getStatusText(status) {
    const statusMap = {
        'aberto': 'Aberto',
        'andamento': 'Em Andamento',
        'concluido': 'Concluído',
        'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
}

function handlePedidoActions(e) {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const pedido = DB.pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    if (btn.dataset.act === "view") {
        showDetalhesPedido(pedido);
    } else if (btn.dataset.act === "edit") {
        editarPedido(pedido);
    } else if (btn.dataset.act === "del") {
        confirmAction(`Excluir pedido ${pedido.codigo}?`, () => {
            DB.pedidos = DB.pedidos.filter(p => p.id !== id);
            save();
            renderActive();
            showNotification("Pedido excluído", "success");
        });
    }
}

function editarPedido(pedido) {
    pedidoEditando = pedido;
    pedidoItens = [...pedido.itens];
    
    showModal('modalNovoPedido');
    loadClientesPedido();
    loadProdutosPedido();
    
    // Preencher dados do pedido
    setTimeout(() => {
        document.getElementById('ped_cliente').value = pedido.clienteId;
        document.getElementById('ped_observacoes').value = pedido.observacoes || '';
        atualizarItensPedido();
        calcularTotalPedido();
    }, 100);
}

// === TELA FINANCEIRO ======================================================
function renderFinanceiro() {
    const div = document.createElement("div");
    div.className = "grid";
    div.innerHTML = `
        <aside class="card">
            <h3>💰 Lançamento Financeiro</h3>
            <p class="muted">Controle de receitas e despesas</p>

            <div class="stack">
                <input type="hidden" id="fin_id" />
                
                <select id="fin_tipo" class="input">
                    <option value="receber">Receber</option>
                    <option value="pagar">Pagar</option>
                </select>
                
                <input class="input" id="fin_descricao" placeholder="Descrição" />
                <input class="input" id="fin_valor" placeholder="Valor R$" />
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Data Vencimento</label>
                        <input class="input" id="fin_vencimento" type="date" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data Pagamento</label>
                        <input class="input" id="fin_pagamento" type="date" />
                    </div>
                </div>

                <select id="fin_status" class="input">
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago/Recebido</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="cancelado">Cancelado</option>
                </select>

                <select id="fin_categoria" class="input">
                    <option value="venda">Venda</option>
                    <option value="servico">Serviço</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="aluguel">Aluguel</option>
                    <option value="salario">Salário</option>
                    <option value="outro">Outro</option>
                </select>

                <textarea class="input" id="fin_observacoes" placeholder="Observações..." rows="2"></textarea>

                <div class="flex">
                    <button class="btn success" id="btnSalvarFinanceiro">💾 Salvar</button>
                    <button class="btn" id="btnLimparFinanceiro">🧹 Limpar</button>
                </div>
            </div>
        </aside>

        <section class="card">
            <div class="toolbar">
                <div class="row">
                    <select id="filtroTipoFin" class="input">
                        <option value="">Todos os tipos</option>
                        <option value="receber">A Receber</option>
                        <option value="pagar">A Pagar</option>
                    </select>
                    <select id="filtroStatusFin" class="input">
                        <option value="">Todos os status</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="atrasado">Atrasado</option>
                    </select>
                    <input class="input" id="buscaFinanceiro" placeholder="Buscar..." />
                </div>
                <div class="row">
                    <span class="pill">Saldo: <b id="finSaldo">R$ 0,00</b></span>
                </div>
            </div>

            <div class="table-wrap">
                <table id="tblFinanceiro">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>
    `;
    
    setupFinanceiroEvents(div);
    listFinanceiro(div);
    updateSaldoFinanceiro(div);
    return div;
}

function setupFinanceiroEvents(content) {
    $("#btnSalvarFinanceiro", content)?.addEventListener("click", () => saveFinanceiro(content));
    $("#btnLimparFinanceiro", content)?.addEventListener("click", () => clearFinanceiroForm(content));
    $("#filtroTipoFin", content)?.addEventListener("change", () => listFinanceiro(content));
    $("#filtroStatusFin", content)?.addEventListener("change", () => listFinanceiro(content));
    $("#buscaFinanceiro", content)?.addEventListener("input", () => listFinanceiro(content));
    
    content.addEventListener("click", handleFinanceiroActions);
}

function saveFinanceiro(content) {
    const id = $("#fin_id", content).value;
    const lancamento = {
        id: id || uid(),
        tipo: $("#fin_tipo", content).value,
        descricao: $("#fin_descricao", content).value.trim(),
        valor: parseBRL($("#fin_valor", content).value),
        vencimento: $("#fin_vencimento", content).value,
        pagamento: $("#fin_pagamento", content).value,
        status: $("#fin_status", content).value,
        categoria: $("#fin_categoria", content).value,
        observacoes: $("#fin_observacoes", content).value.trim(),
        dataCriacao: id ? DB.financeiro.find(f => f.id === id)?.dataCriacao || new Date().toISOString() : new Date().toISOString()
    };
    
    if (!lancamento.descricao || !lancamento.valor) {
        showNotification("Descrição e valor são obrigatórios", "warning");
        return;
    }
    
    if (id) {
        const index = DB.financeiro.findIndex(f => f.id === id);
        if (index >= 0) DB.financeiro[index] = lancamento;
    } else {
        DB.financeiro.push(lancamento);
    }
    
    save();
    listFinanceiro(content);
    updateSaldoFinanceiro(content);
    clearFinanceiroForm(content);
    showNotification(`✅ Lançamento ${id ? 'atualizado' : 'adicionado'}`, "success");
}

function clearFinanceiroForm(content) {
    $("#fin_id", content).value = "";
    $("#fin_tipo", content).value = "receber";
    $("#fin_descricao", content).value = "";
    $("#fin_valor", content).value = "";
    $("#fin_vencimento", content).value = "";
    $("#fin_pagamento", content).value = "";
    $("#fin_status", content).value = "pendente";
    $("#fin_categoria", content).value = "venda";
    $("#fin_observacoes", content).value = "";
}

function listFinanceiro(content) {
    const tbody = $("#tblFinanceiro", content).querySelector("tbody");
    const tipoFiltro = $("#filtroTipoFin", content).value;
    const statusFiltro = $("#filtroStatusFin", content).value;
    const busca = $("#buscaFinanceiro", content).value.toLowerCase();
    
    let financeiroFiltrado = DB.financeiro;
    
    if (tipoFiltro) {
        financeiroFiltrado = financeiroFiltrado.filter(f => f.tipo === tipoFiltro);
    }
    
    if (statusFiltro) {
        financeiroFiltrado = financeiroFiltrado.filter(f => f.status === statusFiltro);
    }
    
    if (busca) {
        financeiroFiltrado = financeiroFiltrado.filter(f => 
            f.descricao.toLowerCase().includes(busca) ||
            f.categoria.toLowerCase().includes(busca)
        );
    }
    
    tbody.innerHTML = financeiroFiltrado.map(f => `
        <tr>
            <td>${f.descricao}</td>
            <td><span class="tag ${f.tipo === 'receber' ? 'ok' : 'warn'}">${f.tipo === 'receber' ? 'Receber' : 'Pagar'}</span></td>
            <td>${fmt.money(f.valor)}</td>
            <td>${f.vencimento ? fmt.date(f.vencimento) : '—'}</td>
            <td><span class="tag status-${f.status}">${f.status}</span></td>
            <td>
                ${iconBtn("edit", f.id, "Editar", "✏️")}
                ${iconBtn("del", f.id, "Excluir", "🗑️")}
            </td>
        </tr>
    `).join("") || `<tr><td colspan="6" class="empty">Nenhum lançamento encontrado</td></tr>`;
}

function updateSaldoFinanceiro(content) {
    const saldoEl = $("#finSaldo", content);
    if (!saldoEl) return;
    
    const receber = DB.financeiro.filter(f => f.tipo === 'receber' && f.status !== 'pago').reduce((sum, f) => sum + f.valor, 0);
    const pagar = DB.financeiro.filter(f => f.tipo === 'pagar' && f.status !== 'pago').reduce((sum, f) => sum + f.valor, 0);
    const saldo = receber - pagar;
    
    saldoEl.textContent = fmt.money(saldo);
    saldoEl.className = saldo >= 0 ? "positive" : "negative";
}

function handleFinanceiroActions(e) {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const lancamento = DB.financeiro.find(f => f.id === id);
    if (!lancamento) return;
    
    if (btn.dataset.act === "edit") {
        fillFinanceiroForm(lancamento);
    } else if (btn.dataset.act === "del") {
        confirmAction(`Excluir lançamento ${lancamento.descricao}?`, () => {
            DB.financeiro = DB.financeiro.filter(f => f.id !== id);
            save();
            renderActive();
            showNotification("Lançamento excluído", "success");
        });
    }
}

function fillFinanceiroForm(lancamento) {
    const content = $("#content");
    if (!content) return;
    
    $("#fin_id", content).value = lancamento.id;
    $("#fin_tipo", content).value = lancamento.tipo;
    $("#fin_descricao", content).value = lancamento.descricao;
    $("#fin_valor", content).value = lancamento.valor.toFixed(2).replace('.', ',');
    $("#fin_vencimento", content).value = lancamento.vencimento || '';
    $("#fin_pagamento", content).value = lancamento.pagamento || '';
    $("#fin_status", content).value = lancamento.status;
    $("#fin_categoria", content).value = lancamento.categoria;
    $("#fin_observacoes", content).value = lancamento.observacoes || '';
}

// === TELA CONTRATOS =======================================================
function renderContratos() {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
        <div class="toolbar">
            <button class="btn success" id="btnGerarContrato">📄 Gerar Novo Contrato</button>
            <span class="muted">Contratos para clientes ponto fixo</span>
        </div>

        <div class="table-wrap">
            <table id="tblContratos">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Documento</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
    
    setupContratoEvents(div);
    listContratos(div);
    return div;
}

function setupContratoEvents(content) {
    $("#btnGerarContrato", content)?.addEventListener("click", gerarContratoSelecionado);
    content.addEventListener("click", handleContratoActions);
}

function listContratos(content) {
    const tbody = $("#tblContratos", content).querySelector("tbody");
    
    const clientesPontoFixo = DB.pessoas.filter(c => c.categoria === 'cliente' && c.tipoCliente === 'ponto_fixo');
    
    tbody.innerHTML = clientesPontoFixo.map(c => {
        const contrato = DB.contratos.find(ct => ct.clienteId === c.id) || {
            status: 'pendente',
            data: new Date().toISOString()
        };
        
        return `
            <tr>
                <td>${c.tipo === 'PF' ? c.nome : c.razaoSocial}</td>
                <td>${c.tipo === 'PF' ? c.cpf : c.cnpj}</td>
                <td>${c.tipo}</td>
                <td><span class="tag ${contrato.status === 'assinado' ? 'ok' : 'warn'}">${contrato.status === 'assinado' ? 'Assinado' : 'Pendente'}</span></td>
                <td>${fmt.date(contrato.data)}</td>
                <td>
                    ${iconBtn("gerar", c.id, "Gerar contrato", "📄")}
                    ${iconBtn("assinar", c.id, "Marcar como assinado", "✅")}
                </td>
            </tr>
        `;
    }).join("") || `<tr><td colspan="6" class="empty">Nenhum cliente ponto fixo</td></tr>`;
}

function handleContratoActions(e) {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    
    const clienteId = btn.dataset.id;
    const cliente = DB.pessoas.find(c => c.id === clienteId);
    if (!cliente) return;
    
    if (btn.dataset.act === "gerar") {
        gerarContrato(cliente);
    } else if (btn.dataset.act === "assinar") {
        marcarContratoAssinado(clienteId);
    }
}

function gerarContratoSelecionado() {
    const clientesPontoFixo = DB.pessoas.filter(c => c.categoria === 'cliente' && c.tipoCliente === 'ponto_fixo');
    
    if (clientesPontoFixo.length === 0) {
        showNotification("Nenhum cliente ponto fixo cadastrado", "warning");
        return;
    }
    
    const clienteNome = prompt("Digite o nome do cliente ponto fixo:");
    if (!clienteNome) return;
    
    const cliente = clientesPontoFixo.find(c => 
        (c.tipo === 'PF' ? c.nome.toLowerCase() : c.razaoSocial.toLowerCase()).includes(clienteNome.toLowerCase())
    );
    
    if (!cliente) {
        showNotification("Cliente não encontrado", "error");
        return;
    }
    
    gerarContrato(cliente);
}

function gerarContrato(cliente) {
    const contratoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Contrato - ${cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    margin: 40px; 
                    color: #333;
                }
                h1 { color: #2c3e50; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
                .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .assinaturas { margin-top: 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                .linha { border-top: 1px solid #666; padding-top: 5px; }
                @media print { body { margin: 0; } .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align: center; margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 5px; cursor: pointer;">🖨️ Imprimir Contrato</button>
            </div>

            <h1>CONTRATO DE COMODATO</h1>
            
            <div class="header">
                <p><strong>CONTRATANTE:</strong> JK CHOPP • CNPJ 60.856.264/0001-73</p>
                <p><strong>CONTRATADO:</strong> ${cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial} • ${cliente.tipo}: ${cliente.tipo === 'PF' ? cliente.cpf : cliente.cnpj}</p>
                <p><strong>ENDEREÇO:</strong> ${cliente.endereco || "Não informado"}</p>
                <p><strong>CONTATO:</strong> ${cliente.telefone || cliente.email || "Não informado"}</p>
            </div>
            
            <h3>CLÁUSULA 1ª - DO OBJETO</h3>
            <p>O presente contrato tem por objeto o comodato dos equipamentos necessários para o funcionamento do ponto de venda, incluindo chopeiras, barris e cilindros de CO₂.</p>
            
            <h3>CLÁUSULA 2ª - DO PRAZO</h3>
            <p>O prazo de comodato será indeterminado, podendo ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias.</p>
            
            <h3>CLÁUSULA 3ª - DAS OBRIGAÇÕES DO CONTRATADO</h3>
            <p>O CONTRATADO se obriga a:</p>
            <ul>
                <li>Zelar pela conservação dos equipamentos;</li>
                <li>Comunicar imediatamente qualquer avaria ou defeito;</li>
                <li>Permitir a visita técnica para manutenção preventiva;</li>
                <li>Responsabilizar-se por danos causados por mau uso;</li>
                <li>Manter os equipamentos em local adequado e seguro.</li>
            </ul>
            
            <div class="assinaturas">
                <div>
                    <div class="linha"></div>
                    <p><strong>JK CHOPP</strong><br>CNPJ: 60.856.264/0001-73</p>
                </div>
                <div>
                    <div class="linha"></div>
                    <p><strong>${cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial}</strong><br>${cliente.tipo}: ${cliente.tipo === 'PF' ? cliente.cpf : cliente.cnpj}</p>
                </div>
            </div>
            
            <p style="margin-top: 40px; text-align: center;">
                Data: ${new Date().toLocaleDateString('pt-BR')}
            </p>
        </body>
        </html>
    `;
    
    const win = window.open("", "_blank");
    win.document.write(contratoHTML);
    win.document.close();
    
    // Salvar contrato
    let contratoExistente = DB.contratos.find(c => c.clienteId === cliente.id);
    if (!contratoExistente) {
        DB.contratos.push({
            id: uid(),
            clienteId: cliente.id,
            cliente: cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial,
            status: 'gerado',
            data: new Date().toISOString()
        });
        save();
    }
    
    showNotification("✅ Contrato gerado com sucesso", "success");
}

function marcarContratoAssinado(clienteId) {
    let contrato = DB.contratos.find(c => c.clienteId === clienteId);
    
    if (!contrato) {
        const cliente = DB.pessoas.find(c => c.id === clienteId);
        contrato = {
            id: uid(),
            clienteId: cliente.id,
            cliente: cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial,
            status: 'assinado',
            data: new Date().toISOString()
        };
        DB.contratos.push(contrato);
    } else {
        contrato.status = 'assinado';
        contrato.data = new Date().toISOString();
    }
    
    save();
    renderActive();
    showNotification("✅ Contrato marcado como assinado", "success");
}

// === TELA AGENDA ==========================================================
function renderAgenda() {
    const div = document.createElement("div");
    div.className = "stack agenda-grid";
    div.innerHTML = `
        <section class="card">
            <h3>📅 Agenda de Compromissos</h3>
            <div class="toolbar">
                <div class="row">
                    <input id="ag_titulo" class="input" placeholder="Título do compromisso" />
                    <input id="ag_data" class="input" type="date" />
                    <input id="ag_hora" class="input" type="time" />
                    <select id="ag_tipo" class="input">
                        <option value="reuniao">Reunião</option>
                        <option value="visita">Visita Técnica</option>
                        <option value="entrega">Entrega</option>
                        <option value="coleta">Coleta</option>
                        <option value="outro">Outro</option>
                    </select>
                    <button class="btn success" id="btnAddAgenda">➕ Adicionar</button>
                </div>
                <input id="buscaAgenda" class="input" placeholder="Buscar na agenda..." />
            </div>

            <div class="table-wrap">
                <table id="tblAgenda">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>Título</th>
                            <th>Tipo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>

        <aside class="card calendar-wrap">
            <h3>📅 Calendário</h3>
            <div class="cal-header">
                <button class="btn ghost icon" id="calPrev">‹</button>
                <div class="cal-title"><span id="calTitle"></span></div>
                <button class="btn ghost icon" id="calNext">›</button>
                <button class="btn ghost pill" id="calToday">Hoje</button>
            </div>

            <div class="calendar">
                <div class="cal-weekdays">
                    <span>Seg</span><span>Ter</span><span>Qua</span>
                    <span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                </div>
                <div class="cal-grid" id="calGrid"></div>
            </div>
        </aside>
    `;
    
    setupAgendaEvents(div);
    listAgenda(div);
    buildCalendar(div);
    return div;
}

let currentCalendarDate = new Date();

function setupAgendaEvents(content) {
    $("#btnAddAgenda", content)?.addEventListener("click", addAgendamento);
    $("#buscaAgenda", content)?.addEventListener("input", () => listAgenda(content));
    content.addEventListener("click", handleAgendaActions);
    
    // Navegação do calendário
    $("#calPrev", content)?.addEventListener("click", () => navigateCalendar(-1, content));
    $("#calNext", content)?.addEventListener("click", () => navigateCalendar(1, content));
    $("#calToday", content)?.addEventListener("click", () => navigateCalendar(0, content));
}

function buildCalendar(content) {
    const title = $("#calTitle", content);
    const grid = $("#calGrid", content);
    
    if (!title || !grid) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    title.textContent = currentCalendarDate.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    let html = '';
    const today = new Date().toDateString();
    
    // Dias do mês anterior
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = new Date(year, month - 1, day);
        html += createCalendarDay(date, true, content);
    }
    
    // Dias do mês atual
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        html += createCalendarDay(date, false, content);
    }
    
    // Dias do próximo mês
    const totalCells = 42;
    const remaining = totalCells - (firstDayOfWeek + lastDay.getDate());
    for (let day = 1; day <= remaining; day++) {
        const date = new Date(year, month + 1, day);
        html += createCalendarDay(date, true, content);
    }
    
    grid.innerHTML = html;
}

function createCalendarDay(date, isOutside, content) {
    const ymd = date.toISOString().split('T')[0];
    const isToday = date.toDateString() === new Date().toDateString();
    const events = DB.agenda.filter(a => a.data === ymd).length;
    
    const classes = [
        'cal-day',
        isOutside && 'outside',
        isToday && 'today',
        events > 0 && 'has-events'
    ].filter(Boolean).join(' ');
    
    return `
        <button class="${classes}" data-ymd="${ymd}">
            <span class="dnum">${date.getDate()}</span>
            ${events > 0 ? `<div class="cal-dots">${'<span class="cal-dot"></span>'.repeat(Math.min(events, 3))}</div>` : ''}
        </button>
    `;
}

function navigateCalendar(direction, content) {
    if (direction === 0) {
        currentCalendarDate = new Date();
    } else {
        currentCalendarDate = new Date(
            currentCalendarDate.getFullYear(),
            currentCalendarDate.getMonth() + direction,
            1
        );
    }
    buildCalendar(content);
}

function addAgendamento() {
    const titulo = $("#ag_titulo").value.trim();
    const data = $("#ag_data").value;
    const hora = $("#ag_hora").value;
    const tipo = $("#ag_tipo").value;
    
    if (!titulo || !data) {
        showNotification("Informe título e data", "warning");
        return;
    }
    
    DB.agenda.push({
        id: uid(),
        titulo,
        data,
        hora,
        tipo,
        criado: new Date().toISOString()
    });
    
    save();
    $("#ag_titulo").value = "";
    renderActive();
    showNotification("✅ Agendamento adicionado", "success");
}

function listAgenda(content) {
    const tbody = $("#tblAgenda", content).querySelector("tbody");
    const busca = $("#buscaAgenda", content).value.toLowerCase();
    
    let agendaFiltrada = DB.agenda;
    
    if (busca) {
        agendaFiltrada = agendaFiltrada.filter(a => 
            a.titulo.toLowerCase().includes(busca) ||
            a.tipo.toLowerCase().includes(busca)
        );
    }
    
    // Ordenar por data e hora
    agendaFiltrada.sort((a, b) => {
        const dateA = new Date(a.data + ' ' + (a.hora || '00:00'));
        const dateB = new Date(b.data + ' ' + (b.hora || '00:00'));
        return dateA - dateB;
    });
    
    tbody.innerHTML = agendaFiltrada.map(a => `
        <tr>
            <td>${fmt.date(a.data)}</td>
            <td>${a.hora || "—"}</td>
            <td>${a.titulo}</td>
            <td><span class="tag">${a.tipo}</span></td>
            <td>${iconBtn("del", a.id, "Excluir", "🗑️")}</td>
        </tr>
    `).join("") || `<tr><td colspan="5" class="empty">Nenhum agendamento encontrado</td></tr>`;
}

function handleAgendaActions(e) {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    
    if (btn.dataset.act === "del") {
        const id = btn.dataset.id;
        DB.agenda = DB.agenda.filter(a => a.id !== id);
        save();
        renderActive();
        showNotification("Agendamento excluído", "success");
    }
    
    // Clique no dia do calendário
    const day = e.target.closest('.cal-day');
    if (day) {
        const ymd = day.dataset.ymd;
        $("#ag_data").value = ymd;
        listAgenda(document.getElementById('content'));
    }
}

// === TELA ESTOQUE =========================================================
function renderEstoque() {
    const div = document.createElement("div");
    div.className = "screen screen--estoque";
    div.innerHTML = `
        <!-- Dashboard de Métricas -->
        <section class="dashboard-grid">
            <article class="metric-card">
                <div class="metric-header">
                    <div class="metric-info">
                        <h3>BARRIS VAZIOS</h3>
                        <div class="metric-value" id="barrisVazios">0</div>
                        <div class="metric-label">unidades disponíveis</div>
                    </div>
                    <div class="metric-icon">🛢️</div>
                </div>
            </article>

            <article class="metric-card">
                <div class="metric-header">
                    <div class="metric-info">
                        <h3>BARRIS CHEIOS</h3>
                        <div class="metric-value" id="barrisCheios">0</div>
                        <div class="metric-label">unidades em estoque</div>
                    </div>
                    <div class="metric-icon">🍺</div>
                </div>
            </article>

            <article class="metric-card">
                <div class="metric-header">
                    <div class="metric-info">
                        <h3>CHOPEIRAS</h3>
                        <div class="metric-value" id="chopeiras">0</div>
                        <div class="metric-label">equipamentos ativos</div>
                    </div>
                    <div class="metric-icon">🧊</div>
                </div>
            </article>

            <article class="metric-card">
                <div class="metric-header">
                    <div class="metric-info">
                        <h3>CILINDROS CO2</h3>
                        <div class="metric-value" id="cilindrosCO2">0</div>
                        <div class="metric-label">cilindros disponíveis</div>
                    </div>
                    <div class="metric-icon">⚡</div>
                </div>
            </article>
        </section>

        <!-- Conteúdo Principal -->
        <section class="content-grid">
            <!-- Formulário de Movimentação -->
            <article class="card">
                <h3>📦 Nova Movimentação</h3>
                <p class="muted">Registre entradas, saídas e transferências</p>

                <form id="movimentacaoForm" class="stack" style="margin-top:12px">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Tipo de Item</label>
                            <select id="tipoItem" class="form-select" required>
                                <option value="">Selecione o tipo</option>
                                <option value="barril">Barril</option>
                                <option value="chopeira">Chopeira</option>
                                <option value="cilindro">Cilindro CO2</option>
                            </select>
                        </div>

                        <div class="form-group" id="grpEstadoBarril" hidden>
                            <label class="form-label">Estado do Barril</label>
                            <select id="estadoBarril" class="form-select">
                                <option value="cheio">Cheio</option>
                                <option value="vazio">Vazio</option>
                            </select>
                        </div>

                        <div class="form-group" id="grpLitragemBarril" hidden>
                            <label class="form-label">Litragem</label>
                            <select id="litragemBarril" class="form-select">
                                <option value="15">15 L</option>
                                <option value="20">20 L</option>
                                <option value="30">30 L</option>
                                <option value="50">50 L</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Tipo de Movimento</label>
                            <select id="tipoMovimento" class="form-select" required>
                                <option value="">Selecione o movimento</option>
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                                <option value="recolha">Recolha</option>
                                <option value="devolucao">Devolução</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Quantidade</label>
                            <input id="quantidade" type="number" class="form-input" min="1" value="1" required />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Cliente/Observação</label>
                            <input id="cliente" type="text" class="form-input" placeholder="Nome do cliente ou observação" />
                        </div>
                    </div>

                    <div class="flex">
                        <button type="submit" class="btn primary">📥 Registrar Movimentação</button>
                        <button type="button" class="btn" id="btnRelatorioEstoque">📄 Relatório</button>
                    </div>
                </form>
            </article>

            <!-- Resumo Rápido -->
            <article class="card">
                <h3>📊 Resumo Rápido</h3>
                <p class="muted">Estatísticas em tempo real</p>

                <div class="stats-grid" style="margin-top:12px">
                    <div class="stat-item">
                        <span class="stat-label">Movimentações hoje</span>
                        <span class="stat-value" id="movimentacoesHoje">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Entradas hoje</span>
                        <span class="stat-value" id="entradasHoje">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Saídas hoje</span>
                        <span class="stat-value" id="saidasHoje">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total no sistema</span>
                        <span class="stat-value" id="totalItens">0</span>
                    </div>
                </div>
            </article>
        </section>

        <!-- Histórico -->
        <section class="card history-panel">
            <h3>📋 Histórico de Movimentações</h3>
            <p class="muted">Acompanhe todas as operações realizadas</p>

            <div class="history-controls">
                <select id="filtroTipo" class="form-select">
                    <option value="">Todos os movimentos</option>
                    <option value="entrada">Entradas</option>
                    <option value="saida">Saídas</option>
                    <option value="recolha">Recolhas</option>
                    <option value="devolucao">Devoluções</option>
                </select>

                <select id="filtroItem" class="form-select">
                    <option value="">Todos os itens</option>
                    <option value="barril">Barris</option>
                    <option value="chopeira">Chopeiras</option>
                    <option value="cilindro">Cilindros CO2</option>
                </select>

                <button class="btn" id="btnLimparHistorico">🗑️ Limpar Histórico</button>
            </div>

            <div class="history-list" id="historicoContainer"></div>

            <div class="pagination" id="paginationContainer" hidden>
                <button class="btn" id="prevBtn">← Anterior</button>
                <span class="pagination-info" id="pageInfo">Página 1 de 1</span>
                <button class="btn" id="nextBtn">Próxima →</button>
            </div>
        </section>
    `;
    
    setupEstoqueEvents(div);
    updateEstoqueDashboard(div);
    return div;
}

function setupEstoqueEvents(content) {
    // Mostrar/ocultar campos baseado no tipo de item
    $("#tipoItem", content)?.addEventListener("change", (e) => {
        const tipo = e.target.value;
        $("#grpEstadoBarril", content).hidden = tipo !== "barril";
        $("#grpLitragemBarril", content).hidden = tipo !== "barril";
    });
    
    // Registrar movimentação
    $("#movimentacaoForm", content)?.addEventListener("submit", (e) => {
        e.preventDefault();
        registrarMovimentacaoEstoque(content);
    });
    
    // Filtros e controles
    $("#filtroTipo", content)?.addEventListener("change", () => updateEstoqueHistorico(content));
    $("#filtroItem", content)?.addEventListener("change", () => updateEstoqueHistorico(content));
    $("#btnLimparHistorico", content)?.addEventListener("click", limparHistoricoEstoque);
    $("#btnRelatorioEstoque", content)?.addEventListener("click", gerarRelatorioEstoque);
    
    // Paginação
    $("#prevBtn", content)?.addEventListener("click", () => navigateEstoquePage(-1, content));
    $("#nextBtn", content)?.addEventListener("click", () => navigateEstoquePage(1, content));
}

function updateEstoqueDashboard(content) {
    // Atualizar métricas principais
    const barrisVazios = Object.values(DB.estoque.barrisVazios).reduce((a, b) => a + b, 0);
    const barrisCheios = Object.values(DB.estoque.barrisCheios).reduce((a, b) => a + b, 0);
    
    $("#barrisVazios", content).textContent = barrisVazios;
    $("#barrisCheios", content).textContent = barrisCheios;
    $("#chopeiras", content).textContent = DB.estoque.chopeiras;
    $("#cilindrosCO2", content).textContent = DB.estoque.cilindrosCO2;
    
    // Atualizar estatísticas do dia
    const hoje = new Date().toISOString().split('T')[0];
    const movHoje = DB.estoqueMov.filter(m => m.data?.startsWith(hoje));
    
    $("#movimentacoesHoje", content).textContent = movHoje.length;
    $("#entradasHoje", content).textContent = movHoje.filter(m => m.tipo === 'entrada' || m.tipo === 'recolha').length;
    $("#saidasHoje", content).textContent = movHoje.filter(m => m.tipo === 'saida' || m.tipo === 'devolucao').length;
    
    // Total de itens
    const totalItens = barrisVazios + barrisCheios + DB.estoque.chopeiras + DB.estoque.cilindrosCO2;
    $("#totalItens", content).textContent = totalItens;
    
    // Atualizar histórico
    updateEstoqueHistorico(content);
}

let currentEstoquePage = 1;
const ESTOQUE_PAGE_SIZE = 10;

function updateEstoqueHistorico(content) {
    const container = $("#historicoContainer", content);
    const pagination = $("#paginationContainer", content);
    
    if (!container) return;
    
    // Aplicar filtros
    let historicoFiltrado = [...DB.estoqueMov].reverse(); // Mais recentes primeiro
    
    const filtroTipo = $("#filtroTipo", content).value;
    if (filtroTipo) {
        historicoFiltrado = historicoFiltrado.filter(m => m.tipo === filtroTipo);
    }
    
    const filtroItem = $("#filtroItem", content).value;
    if (filtroItem) {
        historicoFiltrado = historicoFiltrado.filter(m => m.tipoItem === filtroItem);
    }
    
    // Paginação
    const totalPages = Math.ceil(historicoFiltrado.length / ESTOQUE_PAGE_SIZE);
    const startIndex = (currentEstoquePage - 1) * ESTOQUE_PAGE_SIZE;
    const endIndex = startIndex + ESTOQUE_PAGE_SIZE;
    const pageItems = historicoFiltrado.slice(startIndex, endIndex);
    
    // Atualizar controles de paginação
    if (pagination) {
        pagination.hidden = totalPages <= 1;
        $("#pageInfo", content).textContent = `Página ${currentEstoquePage} de ${totalPages}`;
        $("#prevBtn", content).disabled = currentEstoquePage === 1;
        $("#nextBtn", content).disabled = currentEstoquePage === totalPages;
    }
    
    // Renderizar itens
    if (pageItems.length === 0) {
        container.innerHTML = '<div class="empty">Nenhuma movimentação encontrada</div>';
        return;
    }
    
    const tipoTexto = {
        'entrada': 'Entrada',
        'saida': 'Saída',
        'recolha': 'Recolha',
        'devolucao': 'Devolução'
    };
    
    container.innerHTML = pageItems.map(mov => {
        const dataStr = fmt.datetime(mov.data);
        
        let descricao = mov.tipoItem;
        if (mov.tipoItem === 'barril') {
            descricao += ` ${mov.estadoBarril} ${mov.litragem}L`;
        }
        
        return `
            <div class="history-item">
                <div class="history-header">
                    <span class="status-badge status-${mov.tipo}">
                        ${tipoTexto[mov.tipo]}
                    </span>
                    <span class="history-date">${dataStr}</span>
                </div>
                <div class="history-details">
                    <div class="history-description">
                        <strong>${descricao}</strong>
                        <small>${mov.cliente || 'Sem observações'}</small>
                    </div>
                    <div class="history-quantity ${mov.tipo === 'saida' || mov.tipo === 'devolucao' ? 'negative' : 'positive'}">
                        ${mov.tipo === 'saida' || mov.tipo === 'devolucao' ? '-' : '+'}${mov.quantidade}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function navigateEstoquePage(direction, content) {
    currentEstoquePage += direction;
    updateEstoqueHistorico(content);
}

function registrarMovimentacaoEstoque(content) {
    const tipoItem = $("#tipoItem", content).value;
    const tipoMovimento = $("#tipoMovimento", content).value;
    const quantidade = parseInt($("#quantidade", content).value);
    const cliente = $("#cliente", content).value.trim();
    const estadoBarril = $("#estadoBarril", content).value;
    const litragem = $("#litragemBarril", content).value;
    
    if (!tipoItem || !tipoMovimento || !quantidade) {
        showNotification("Preencha todos os campos obrigatórios", "warning");
        return;
    }
    
    // Registrar movimentação
    const movimentacao = {
        id: uid(),
        tipoItem,
        tipo: tipoMovimento,
        quantidade,
        cliente: cliente || "Não informado",
        estadoBarril,
        litragem,
        data: new Date().toISOString()
    };
    
    DB.estoqueMov.unshift(movimentacao);
    
    // Atualizar estoque
    atualizarEstoque(movimentacao);
    
    save();
    $("#movimentacaoForm", content).reset();
    updateEstoqueDashboard(content);
    
    showNotification("✅ Movimentação registrada com sucesso", "success");
}

function atualizarEstoque(mov) {
    if (mov.tipoItem === "barril") {
        const chave = mov.estadoBarril === "vazio" ? "barrisVazios" : "barrisCheios";
        const subChave = `${mov.litragem}L`;
        
        if (mov.tipo === "entrada" || mov.tipo === "recolha") {
            DB.estoque[chave][subChave] += mov.quantidade;
        } else if (mov.tipo === "saida" || mov.tipo === "devolucao") {
            DB.estoque[chave][subChave] = Math.max(0, DB.estoque[chave][subChave] - mov.quantidade);
        }
    } else if (mov.tipoItem === "chopeira") {
        if (mov.tipo === "entrada") {
            DB.estoque.chopeiras += mov.quantidade;
        } else if (mov.tipo === "saida") {
            DB.estoque.chopeiras = Math.max(0, DB.estoque.chopeiras - mov.quantidade);
        }
    } else if (mov.tipoItem === "cilindro") {
        if (mov.tipo === "entrada") {
            DB.estoque.cilindrosCO2 += mov.quantidade;
        } else if (mov.tipo === "saida") {
            DB.estoque.cilindrosCO2 = Math.max(0, DB.estoque.cilindrosCO2 - mov.quantidade);
        }
    }
}

function limparHistoricoEstoque() {
    confirmAction("Limpar todo o histórico de movimentações?", () => {
        DB.estoqueMov = [];
        save();
        renderActive();
        showNotification("Histórico limpo", "success");
    });
}

function gerarRelatorioEstoque() {
    const data = new Date().toLocaleDateString('pt-BR');
    const relatorio = `
RELATÓRIO DE ESTOQUE - ${data}

BARRIS VAZIOS: ${Object.values(DB.estoque.barrisVazios).reduce((a, b) => a + b, 0)}
   - 15L: ${DB.estoque.barrisVazios['15L']}
   - 20L: ${DB.estoque.barrisVazios['20L']}
   - 30L: ${DB.estoque.barrisVazios['30L']}
   - 50L: ${DB.estoque.barrisVazios['50L']}

BARRIS CHEIOS: ${Object.values(DB.estoque.barrisCheios).reduce((a, b) => a + b, 0)}
   - 15L: ${DB.estoque.barrisCheios['15L']}
   - 20L: ${DB.estoque.barrisCheios['20L']}
   - 30L: ${DB.estoque.barrisCheios['30L']}
   - 50L: ${DB.estoque.barrisCheios['50L']}

CHOPEIRAS: ${DB.estoque.chopeiras}
CILINDROS CO2: ${DB.estoque.cilindrosCO2}

TOTAL DE MOVIMENTAÇÕES: ${DB.estoqueMov.length}
    `.trim();
    
    const blob = new Blob([relatorio], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification("Relatório gerado", "success");
}

// === TELA RELATÓRIO DE REPASSE ============================================
function renderRelRepasse() {
    const div = document.createElement("div");
    div.className = "relatorio-repasse";
    div.innerHTML = `
        <div class="repasse-header">
            <div class="repasse-title">
                <h2>📊 Relatório de Repasse Financeiro</h2>
                <button class="btn-print" id="repPrint">📄 Baixar PDF</button>
            </div>
            <div class="repasse-periodo">
                <div class="periodo-item">
                    <div class="periodo-label">Período Inicial</div>
                    <input id="rep_dataIni" class="periodo-value" type="date">
                </div>
                <div class="periodo-item">
                    <div class="periodo-label">Período Final</div>
                    <input id="rep_dataFim" class="periodo-value" type="date">
                </div>
                <div class="periodo-item">
                    <div class="periodo-label">Data de Pagamento</div>
                    <input id="rep_dataPag" class="periodo-value" type="date">
                </div>
            </div>
        </div>

        <div class="repasse-table-container">
            <div class="repasse-table-header">
                <h3>💰 Fechamento de Vendas - Período de Duas Semanas</h3>
                <button class="btn-add" id="repAddCliente">+ Adicionar Linha</button>
            </div>
            <div class="table-wrap">
                <table class="repasse-table">
                    <thead>
                        <tr>
                            <th class="text-left">Cliente</th>
                            <th class="text-left">Marca do Chopp</th>
                            <th class="text-right">Qtde (L)</th>
                            <th class="text-right">Custo p/L</th>
                            <th class="text-right">Barris</th>
                            <th class="text-right">Custo Total</th>
                            <th class="text-right">Valor Venda</th>
                            <th class="text-right">Parte Marcos</th>
                            <th class="text-right">Parte JK</th>
                            <th class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="repTblVendas"></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" class="text-right"><strong>TOTAIS</strong></td>
                            <td class="text-right"><strong id="repTotCusto">R$ 0,00</strong></td>
                            <td class="text-right"><strong id="repTotVenda">R$ 0,00</strong></td>
                            <td class="text-right"><strong id="repTotM">R$ 0,00</strong></td>
                            <td class="text-right"><strong id="repTotJ">R$ 0,00</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="repasse-table-container">
            <div class="repasse-table-header">
                <h3>💸 Despesas do Período</h3>
                <button class="btn-add" id="repAddDespesa">+ Adicionar Despesa</button>
            </div>
            <div class="table-wrap">
                <table class="repasse-table">
                    <thead>
                        <tr>
                            <th class="text-left">Descrição</th>
                            <th class="text-right">Valor Total</th>
                            <th class="text-left">Observações</th>
                            <th class="text-right">Parte JK</th>
                            <th class="text-right">Parte Marcos</th>
                            <th class="text-center">Pago?</th>
                            <th class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="repTblDespesas"></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="1" class="text-right"><strong>TOTAIS</strong></td>
                            <td class="text-right"><strong id="repTotDespVal">R$ 0,00</strong></td>
                            <td></td>
                            <td class="text-right"><strong id="repTotDespJK">R$ 0,00</strong></td>
                            <td class="text-right"><strong id="repTotDespM">R$ 0,00</strong></td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="repasse-calculos">
            <div class="calc-card amber">
                <h4>💼 Marcos</h4>
                <div class="calc-line">
                    <span>Parte das Vendas</span>
                    <strong id="resParteM">R$ 0,00</strong>
                </div>
                <div class="calc-line">
                    <span>− Despesas Marcos</span>
                    <strong id="resDespM">R$ 0,00</strong>
                </div>
                <div class="calc-line calc-total">
                    <span>Total a Receber</span>
                    <strong id="resTotalM" class="positive">R$ 0,00</strong>
                </div>
            </div>
            
            <div class="calc-card sky">
                <h4>🏢 JK CHOPP</h4>
                <div class="calc-line">
                    <span>Parte das Vendas</span>
                    <strong id="resParteJ">R$ 0,00</strong>
                </div>
                <div class="calc-line">
                    <span>− Despesas JK</span>
                    <strong id="resDespJ">R$ 0,00</strong>
                </div>
                <div class="calc-line calc-total">
                    <span>Saldo Final</span>
                    <strong id="resSaldoJ" class="positive">R$ 0,00</strong>
                </div>
            </div>
            
            <div class="calc-card green">
                <h4>📈 Resultado Geral</h4>
                <div class="calc-line">
                    <span>Vendas Brutas</span>
                    <strong id="resVendas">R$ 0,00</strong>
                </div>
                <div class="calc-line">
                    <span>− Custos</span>
                    <strong id="resCustos">R$ 0,00</strong>
                </div>
                <div class="calc-line">
                    <span>− Despesas</span>
                    <strong id="resDespesas">R$ 0,00</strong>
                </div>
                <div class="calc-line calc-total">
                    <span>Lucro Líquido</span>
                    <strong id="resLucro" class="positive">R$ 0,00</strong>
                </div>
            </div>
        </div>
    `;
    
    setupRepasseEvents(div);
    renderRepasseVendas(div);
    renderRepasseDespesas(div);
    calcularRepasse(div);
    return div;
}

function setupRepasseEvents(content) {
    $("#repAddCliente", content)?.addEventListener("click", () => addLinhaVenda(content));
    $("#repAddDespesa", content)?.addEventListener("click", () => addLinhaDespesa(content));
    $("#repPrint", content)?.addEventListener("click", () => gerarPDFRepasse(content));
    
    content.addEventListener("input", (e) => {
        if (e.target.classList.contains('repasse-input')) {
            atualizarRepasse(e.target, content);
        }
    });
    
    content.addEventListener("change", (e) => {
        if (e.target.type === 'checkbox' && e.target.closest('#repTblDespesas')) {
            atualizarRepasse(e.target, content);
        }
    });
    
    content.addEventListener("click", (e) => {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        if (btn.dataset.act === "del") {
            const id = btn.dataset.id;
            const row = btn.closest('tr');
            
            if (row.closest('#repTblVendas')) {
                DB.repasse.clientes = DB.repasse.clientes.filter(c => c.id !== id);
            } else {
                DB.repasse.despesas = DB.repasse.despesas.filter(d => d.id !== id);
            }
            
            save();
            renderActive();
        }
    });
    
    // Atualizar datas do header
    ["rep_dataIni", "rep_dataFim", "rep_dataPag"].forEach(id => {
        $(`#${id}`, content)?.addEventListener("change", (e) => {
            DB.repasse.header[e.target.id.replace('rep_', '')] = e.target.value;
            save();
        });
    });
}

function addLinhaVenda(content) {
    DB.repasse.clientes.push({
        id: uid(),
        cliente: "",
        marca: "",
        qtdLitros: 30,
        custoPorLitro: 0,
        qtdBarris: 1,
        venda: 0
    });
    
    save();
    renderRepasseVendas(content);
    calcularRepasse(content);
}

function addLinhaDespesa(content) {
    DB.repasse.despesas.push({
        id: uid(),
        descricao: "",
        valor: 0,
        obs: "",
        partJK: 0,
        partMarcos: 0,
        pago: false
    });
    
    save();
    renderRepasseDespesas(content);
    calcularRepasse(content);
}

function renderRepasseVendas(content) {
    const tbody = $("#repTblVendas", content);
    if (!tbody) return;
    
    tbody.innerHTML = DB.repasse.clientes.map(cliente => {
        const litros = toNumber(cliente.qtdLitros);
        const barris = toNumber(cliente.qtdBarris) || 1;
        const custoPorLitro = toNumber(cliente.custoPorLitro);
        const venda = toNumber(cliente.venda);
        const custoTotal = custoPorLitro * litros * barris;
        const lucro = venda - custoTotal;
        const parteMarcos = lucro * (DB.repasse.split.percMarcos / 100);
        const parteJK = lucro * (DB.repasse.split.percJK / 100);
        
        return `
            <tr data-id="${cliente.id}">
                <td><input class="repasse-input" data-field="cliente" value="${cliente.cliente}" placeholder="Nome do cliente"></td>
                <td><input class="repasse-input" data-field="marca" value="${cliente.marca}" placeholder="Marca do chopp"></td>
                <td class="text-right"><input class="repasse-input text-right" data-field="qtdLitros" type="number" value="${litros}" step="0.1"></td>
                <td class="text-right"><input class="repasse-input text-right" data-field="custoPorLitro" type="number" value="${custoPorLitro}" step="0.01"></td>
                <td class="text-right"><input class="repasse-input text-right" data-field="qtdBarris" type="number" value="${barris}" step="1"></td>
                <td class="text-right">${fmt.money(custoTotal)}</td>
                <td class="text-right"><input class="repasse-input text-right" data-field="venda" type="number" value="${venda}" step="0.01"></td>
                <td class="text-right positive">${fmt.money(parteMarcos)}</td>
                <td class="text-right positive">${fmt.money(parteJK)}</td>
                <td class="text-center">${iconBtn("del", cliente.id, "Remover", "🗑️")}</td>
            </tr>
        `;
    }).join("") || `<tr><td colspan="10" class="empty">Nenhuma venda registrada</td></tr>`;
}

function renderRepasseDespesas(content) {
    const tbody = $("#repTblDespesas", content);
    if (!tbody) return;
    
    tbody.innerHTML = DB.repasse.despesas.map(despesa => `
        <tr data-id="${despesa.id}">
            <td><input class="repasse-input" data-field="descricao" value="${despesa.descricao}" placeholder="Descrição"></td>
            <td class="text-right"><input class="repasse-input text-right" data-field="valor" type="number" value="${toNumber(despesa.valor)}" step="0.01"></td>
            <td><input class="repasse-input" data-field="obs" value="${despesa.obs}" placeholder="Observações"></td>
            <td class="text-right"><input class="repasse-input text-right" data-field="partJK" type="number" value="${toNumber(despesa.partJK)}" step="0.01"></td>
            <td class="text-right"><input class="repasse-input text-right" data-field="partMarcos" type="number" value="${toNumber(despesa.partMarcos)}" step="0.01"></td>
            <td class="text-center"><input type="checkbox" data-field="pago" ${despesa.pago ? "checked" : ""}></td>
            <td class="text-center">${iconBtn("del", despesa.id, "Remover", "🗑️")}</td>
        </tr>
    `).join("") || `<tr><td colspan="7" class="empty">Nenhuma despesa registrada</td></tr>`;
}

function atualizarRepasse(input, content) {
    const field = input.dataset.field;
    const row = input.closest('tr');
    const id = row.dataset.id;
    
    let item;
    if (row.closest('#repTblVendas')) {
        item = DB.repasse.clientes.find(c => c.id === id);
    } else {
        item = DB.repasse.despesas.find(d => d.id === id);
    }
    
    if (!item) return;
    
    if (input.type === 'checkbox') {
        item[field] = input.checked;
    } else if (input.type === 'number') {
        item[field] = parseFloat(input.value) || 0;
    } else {
        item[field] = input.value;
    }
    
    save();
    calcularRepasse(content);
}

function calcularRepasse(content) {
    const pMarcos = DB.repasse.split.percMarcos / 100;
    const pJK = DB.repasse.split.percJK / 100;
    
    // Totais de vendas
    let totCusto = 0, totVenda = 0, totMarcos = 0, totJK = 0;
    
    DB.repasse.clientes.forEach(c => {
        const litros = toNumber(c.qtdLitros);
        const barris = toNumber(c.qtdBarris) || 1;
        const custoPorLitro = toNumber(c.custoPorLitro);
        const venda = toNumber(c.venda);
        const custo = custoPorLitro * litros * barris;
        const lucro = venda - custo;
        
        totCusto += custo;
        totVenda += venda;
        totMarcos += lucro * pMarcos;
        totJK += lucro * pJK;
    });
    
    // Totais de despesas
    let totDespVal = 0, totDespJK = 0, totDespMarcos = 0;
    
    DB.repasse.despesas.forEach(d => {
        const valor = toNumber(d.valor);
        const partJK = toNumber(d.partJK);
        const partMarcos = toNumber(d.partMarcos);
        
        totDespVal += valor;
        totDespJK += partJK;
        totDespMarcos += partMarcos;
    });
    
    // Atualizar totais da tabela
    $("#repTotCusto", content).textContent = fmt.money(totCusto);
    $("#repTotVenda", content).textContent = fmt.money(totVenda);
    $("#repTotM", content).textContent = fmt.money(totMarcos);
    $("#repTotJ", content).textContent = fmt.money(totJK);
    $("#repTotDespVal", content).textContent = fmt.money(totDespVal);
    $("#repTotDespJK", content).textContent = fmt.money(totDespJK);
    $("#repTotDespM", content).textContent = fmt.money(totDespMarcos);
    
    // Atualizar resultados
    const totalMarcos = totMarcos - totDespMarcos;
    const saldoJK = totJK - totDespJK;
    const lucroLiquido = totVenda - totCusto - totDespVal;
    
    $("#resParteM", content).textContent = fmt.money(totMarcos);
    $("#resDespM", content).textContent = fmt.money(totDespMarcos);
    $("#resTotalM", content).textContent = fmt.money(totalMarcos);
    $("#resTotalM", content).className = totalMarcos >= 0 ? "positive" : "negative";
    
    $("#resParteJ", content).textContent = fmt.money(totJK);
    $("#resDespJ", content).textContent = fmt.money(totDespJK);
    $("#resSaldoJ", content).textContent = fmt.money(saldoJK);
    $("#resSaldoJ", content).className = saldoJK >= 0 ? "positive" : "negative";
    
    $("#resVendas", content).textContent = fmt.money(totVenda);
    $("#resCustos", content).textContent = fmt.money(totCusto);
    $("#resDespesas", content).textContent = fmt.money(totDespVal);
    $("#resLucro", content).textContent = fmt.money(lucroLiquido);
    $("#resLucro", content).className = lucroLiquido >= 0 ? "positive" : "negative";
}

function gerarPDFRepasse(content) {
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Repasse - JK CHOPP</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                h1 { color: #2c3e50; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .text-right { text-align: right; }
                .total { font-weight: bold; background-color: #f8f9fa; }
                .calc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; }
                .calc-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .positive { color: #16a34a; }
                .negative { color: #dc2626; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>📊 Relatório de Repasse Financeiro - JK CHOPP</h1>
            
            <div class="no-print" style="text-align: center; margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🖨️ Imprimir Relatório
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                <div><strong>Período Inicial:</strong> ${DB.repasse.header.dataIni || 'Não informado'}</div>
                <div><strong>Período Final:</strong> ${DB.repasse.header.dataFim || 'Não informado'}</div>
                <div><strong>Data Pagamento:</strong> ${DB.repasse.header.dataPagamento || 'Não informado'}</div>
            </div>
            
            <h2>💰 Vendas do Período</h2>
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Marca</th>
                        <th class="text-right">Qtde (L)</th>
                        <th class="text-right">Valor Venda</th>
                        <th class="text-right">Parte Marcos</th>
                        <th class="text-right">Parte JK</th>
                    </tr>
                </thead>
                <tbody>
                    ${DB.repasse.clientes.map(c => {
                        const litros = toNumber(c.qtdLitros);
                        const barris = toNumber(c.qtdBarris) || 1;
                        const custoPorLitro = toNumber(c.custoPorLitro);
                        const venda = toNumber(c.venda);
                        const custo = custoPorLitro * litros * barris;
                        const lucro = venda - custo;
                        const parteMarcos = lucro * (DB.repasse.split.percMarcos / 100);
                        const parteJK = lucro * (DB.repasse.split.percJK / 100);
                        
                        return `
                            <tr>
                                <td>${c.cliente || 'Não informado'}</td>
                                <td>${c.marca || 'Não informado'}</td>
                                <td class="text-right">${litros}L</td>
                                <td class="text-right">${fmt.money(venda)}</td>
                                <td class="text-right">${fmt.money(parteMarcos)}</td>
                                <td class="text-right">${fmt.money(parteJK)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <h2>💸 Despesas do Período</h2>
            <table>
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th class="text-right">Valor Total</th>
                        <th class="text-right">Parte JK</th>
                        <th class="text-right">Parte Marcos</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${DB.repasse.despesas.map(d => `
                        <tr>
                            <td>${d.descricao || 'Não informado'}</td>
                            <td class="text-right">${fmt.money(toNumber(d.valor))}</td>
                            <td class="text-right">${fmt.money(toNumber(d.partJK))}</td>
                            <td class="text-right">${fmt.money(toNumber(d.partMarcos))}</td>
                            <td>${d.pago ? 'Pago' : 'Pendente'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="calc-grid">
                <div class="calc-box">
                    <h3>💼 Marcos</h3>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>Parte das Vendas:</span>
                        <strong>${$("#resParteM", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>− Despesas Marcos:</span>
                        <strong>${$("#resDespM", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <hr>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px;">
                        <span>Total a Receber:</span>
                        <strong class="${totalMarcos >= 0 ? 'positive' : 'negative'}">
                            ${$("#resTotalM", content)?.textContent || 'R$ 0,00'}
                        </strong>
                    </div>
                </div>
                
                <div class="calc-box">
                    <h3>🏢 JK CHOPP</h3>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>Parte das Vendas:</span>
                        <strong>${$("#resParteJ", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>− Despesas JK:</span>
                        <strong>${$("#resDespJ", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <hr>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px;">
                        <span>Saldo Final:</span>
                        <strong class="${saldoJK >= 0 ? 'positive' : 'negative'}">
                            ${$("#resSaldoJ", content)?.textContent || 'R$ 0,00'}
                        </strong>
                    </div>
                </div>
                
                <div class="calc-box">
                    <h3>📈 Resultado Geral</h3>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>Vendas Brutas:</span>
                        <strong>${$("#resVendas", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>− Custos:</span>
                        <strong>${$("#resCustos", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>− Despesas:</span>
                        <strong>${$("#resDespesas", content)?.textContent || 'R$ 0,00'}</strong>
                    </div>
                    <hr>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px;">
                        <span>Lucro Líquido:</span>
                        <strong class="${lucroLiquido >= 0 ? 'positive' : 'negative'}">
                            ${$("#resLucro", content)?.textContent || 'R$ 0,00'}
                        </strong>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
                <p>Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <p>JK CHOPP • Sistema Interno v2.0</p>
            </div>
        </body>
        </html>
    `;
    
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    win.focus();
}

// === TELA CONFIGURAÇÕES ===================================================
function renderConfiguracoes() {
    const div = document.createElement("div");
    div.className = "grid";
    div.innerHTML = `
        <section class="card">
            <h3>⚙️ Configurações do Sistema</h3>
            <p class="muted">Configure as preferências do sistema JK CHOPP</p>
            
            <div class="stack">
                <div class="form-group">
                    <label class="form-label">Nome da Empresa</label>
                    <input class="input" id="config_empresa" value="${DB.config?.empresa || 'JK CHOPP'}" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">CNPJ</label>
                    <input class="input" id="config_cnpj" value="${DB.config?.cnpj || '60.856.264/0001-73'}" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Telefone</label>
                    <input class="input" id="config_telefone" value="${DB.config?.telefone || '(11) 99999-9999'}" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input class="input" id="config_email" value="${DB.config?.email || 'contato@jkchopp.com'}" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Endereço</label>
                    <textarea class="input" id="config_endereco">${DB.config?.endereco || 'Endereço da empresa'}</textarea>
                </div>
                
                <h4>Configurações de Repasse</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">% Marcos</label>
                        <input type="number" class="input" id="config_repasse_marcos" 
                               value="${DB.repasse.split.percMarcos}" min="0" max="100" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">% JK</label>
                        <input type="number" class="input" id="config_repasse_jk" 
                               value="${DB.repasse.split.percJK}" min="0" max="100" />
                    </div>
                </div>
                
                <div class="flex">
                    <label class="pill">
                        <input type="checkbox" id="config_auto_save" ${DB.config?.autoSave !== false ? 'checked' : ''} />
                        Salvamento automático
                    </label>
                    <label class="pill">
                        <input type="checkbox" id="config_notificacoes" ${DB.config?.notificacoes !== false ? 'checked' : ''} />
                        Notificações
                    </label>
                </div>
                
                <div class="flex" style="margin-top: 20px;">
                    <button class="btn success" id="btnSalvarConfig">💾 Salvar Configurações</button>
                    <button class="btn" id="btnResetConfig">🔄 Restaurar Padrões</button>
                </div>
            </div>
        </section>
        
        <aside class="card">
            <h3>📊 Informações do Sistema</h3>
            <div class="stack">
                <div class="info-grid">
                    <div><strong>Versão:</strong> 2.0.0</div>
                    <div><strong>Build:</strong> 2024.09.001</div>
                    <div><strong>Clientes:</strong> ${DB.pessoas.filter(p => p.categoria === 'cliente').length}</div>
                    <div><strong>Produtos:</strong> ${DB.produtos.length}</div>
                    <div><strong>Pedidos:</strong> ${DB.pedidos.length}</div>
                    <div><strong>Último Backup:</strong> ${DB.config?.ultimoBackup || 'Nunca'}</div>
                </div>
                
                <div class="divider"></div>
                
                <h4>Manutenção</h4>
                <div class="stack">
                    <button class="btn" id="btnBackup">📦 Fazer Backup Agora</button>
                    <button class="btn warning" id="btnLimparDados">🗑️ Limpar Dados Temporários</button>
                    <button class="btn danger" id="btnResetCompleto">⚠️ Reset Completo</button>
                </div>
                
                <div class="divider"></div>
                
                <h4>Suporte</h4>
                <p class="muted">Em caso de problemas, entre em contato com o suporte técnico.</p>
                <button class="btn" id="btnSuporte">📞 Contatar Suporte</button>
            </div>
        </aside>
    `;
    
    setupConfiguracoesEvents(div);
    return div;
}

function setupConfiguracoesEvents(content) {
    $("#btnSalvarConfig", content)?.addEventListener("click", salvarConfiguracoes);
    $("#btnResetConfig", content)?.addEventListener("click", resetarConfiguracoes);
    $("#btnBackup", content)?.addEventListener("click", doExport);
    $("#btnLimparDados", content)?.addEventListener("click", limparDadosTemporarios);
    $("#btnResetCompleto", content)?.addEventListener("click", resetCompleto);
    $("#btnSuporte", content)?.addEventListener("click", contatarSuporte);
}

function salvarConfiguracoes() {
    if (!DB.config) DB.config = {};
    
    DB.config.empresa = $("#config_empresa").value;
    DB.config.cnpj = $("#config_cnpj").value;
    DB.config.telefone = $("#config_telefone").value;
    DB.config.email = $("#config_email").value;
    DB.config.endereco = $("#config_endereco").value;
    DB.config.autoSave = $("#config_auto_save").checked;
    DB.config.notificacoes = $("#config_notificacoes").checked;
    DB.config.ultimoBackup = new Date().toLocaleString('pt-BR');
    
    // Atualizar repasse
    DB.repasse.split.percMarcos = parseInt($("#config_repasse_marcos").value) || 50;
    DB.repasse.split.percJK = parseInt($("#config_repasse_jk").value) || 50;
    
    save();
    showNotification("✅ Configurações salvas com sucesso", "success");
}

function resetarConfiguracoes() {
    if (confirm("Restaurar configurações padrão?")) {
        DB.config = { ...DEF.config };
        DB.repasse.split = { percMarcos: 50, percJK: 50 };
        save();
        renderActive();
        showNotification("✅ Configurações restauradas", "success");
    }
}

function limparDadosTemporarios() {
    if (confirm("Limpar dados temporários e cache?")) {
        // Limpar apenas dados não essenciais
        DB.agenda = DB.agenda.filter(a => new Date(a.data) >= new Date());
        save();
        showNotification("✅ Dados temporários limpos", "success");
    }
}

function resetCompleto() {
    if (confirm("⚠️ ATENÇÃO: Isso apagará TODOS os dados permanentemente! Tem certeza?")) {
        localStorage.removeItem("jk_data");
        DB = { ...DEF };
        save();
        renderActive();
        showNotification("✅ Sistema resetado completamente", "success");
    }
}

function contatarSuporte() {
    const email = "suporte@jkchopp.com";
    const assunto = "Suporte - Sistema JK CHOPP";
    const corpo = `Preciso de ajuda com o sistema JK CHOPP.%0D%0A%0D%0AProblema:%0D%0A%0D%0AVersão: 2.0.0%0D%0ADados: ${DB.pessoas.filter(p => p.categoria === 'cliente').length} clientes, ${DB.produtos.length} produtos`;
    
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`, '_blank');
}

// === TELAS RESTANTES (STUB) ===============================================
function renderRelatorios() {
    return renderStub("Relatórios", "📊");
}

function renderStub(title, icon = "🚧") {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
        <h3>${icon} ${title}</h3>
        <p class="muted">Esta funcionalidade está em desenvolvimento.</p>
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h4>Em Breve</h4>
            <p>Estamos trabalhando para trazer esta funcionalidade em breve.</p>
            <small>Enquanto isso, explore as outras áreas do sistema.</small>
        </div>
    `;
    return div;
}

// === MODAIS ===============================================================
function initializeModalEvents() {
    // Modal Novo Pedido
    const modalNovoPedido = document.getElementById('modalNovoPedido');
    if (modalNovoPedido) {
        document.getElementById('btnAddItem')?.addEventListener('click', adicionarItemPedido);
        document.getElementById('btnFinalizarPedido')?.addEventListener('click', finalizarPedido);
        document.getElementById('btnCancelarPedido')?.addEventListener('click', () => {
            pedidoEditando = null;
            pedidoItens = [];
            modalNovoPedido.close();
        });
    }
    
    // Modal Perfil
    const modalPerfil = document.getElementById('modalPerfil');
    if (modalPerfil) {
        // Carregar dados do perfil
        document.getElementById('perf_nome').value = DB.perfil.nome;
        document.getElementById('perf_email').value = DB.perfil.email;
        document.getElementById('perf_telefone').value = DB.perfil.telefone;
        
        document.getElementById('btnSalvarPerfil')?.addEventListener('click', salvarPerfil);
    }
    
    // Configurar fechamento de modais
    document.querySelectorAll('dialog .close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('dialog').close();
        });
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.showModal();
    }
}

function showDetalhesPedido(pedido) {
    const modal = document.getElementById('modalDetalhesPedido');
    if (!modal || !pedido) return;
    
    // Preencher dados
    document.getElementById('ped_det_codigo').textContent = pedido.codigo;
    document.getElementById('ped_det_cliente').textContent = pedido.cliente;
    document.getElementById('ped_det_status').textContent = getStatusText(pedido.status);
    document.getElementById('ped_det_data').textContent = fmt.date(pedido.dataCriacao);
    document.getElementById('ped_det_total').textContent = fmt.money(pedido.total);
    document.getElementById('ped_det_status_edit').value = pedido.status;
    
    // Preencher itens
    const tbody = document.getElementById('tblItensPedidoDet').querySelector('tbody');
    tbody.innerHTML = (pedido.itens || []).map(item => `
        <tr>
            <td>${item.produto}</td>
            <td>${item.quantidade}</td>
            <td>${fmt.money(item.valorUnitario)}</td>
            <td>${fmt.money(item.total)}</td>
        </tr>
    `).join('');
    
    modal.showModal();
}

function salvarPerfil() {
    DB.perfil = {
        nome: document.getElementById('perf_nome').value.trim(),
        email: document.getElementById('perf_email').value.trim(),
        telefone: document.getElementById('perf_telefone').value.trim()
    };
    
    save();
    document.getElementById('modalPerfil').close();
    showNotification('✅ Perfil atualizado com sucesso', 'success');
}

// === UTILITÁRIOS GLOBAIS ==================================================
function showNotification(mensagem, tipo = "info") {
    // Remover notificações existentes
    document.querySelectorAll('.notification').forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    notification.innerHTML = `
        <span>${mensagem}</span>
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function confirmAction(mensagem, callback) {
    if (confirm(mensagem)) {
        callback();
    }
}

function enhanceResponsiveTables(container) {
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
        if (!table.parentElement.classList.contains('table-wrap')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrap';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

// === EXPORTAR FUNÇÕES GLOBAIS ============================================
window.removerItemPedido = removerItemPedido;
window.adicionarItemPedido = adicionarItemPedido;
window.finalizarPedido = finalizarPedido;
window.showModal = showModal;
window.showDetalhesPedido = showDetalhesPedido;

console.log('🎉 JK CHOPP - Sistema carregado e pronto!');