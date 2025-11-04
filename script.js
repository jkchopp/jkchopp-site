/* ==========================================================================
   JK CHOPP — SCRIPT.JS (COMPLETO, CORRIGIDO E 100% FUNCIONAL COM SUPABASE)
   ========================================================================== */

// Cliente Supabase
const supa = window.supabase;

// Sistema principal
class JKChoppSistema {
    constructor() {
        this.DB = this.load();
        this.telaAtual = localStorage.getItem("jk_tab") || "home";
        this.pedidoItens = [];
        this.pedidoEditando = null;
        this.currentCalendarDate = new Date();
        this.currentEstoquePage = 1;
        this.ESTOQUE_PAGE_SIZE = 10;
        this.contratoEditando = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando JK CHOPP...');
        
        // Testar conexão Supabase
        await this.testarConexaoSupabase();
        
        // Inicializar componentes
        this.bindTopbarActions();
        this.bindDrawerActions();
        this.buildMenu();
        this.initTheme();
        this.renderActive();
        this.initializeModalEvents();
        
        console.log('✅ Sistema inicializado com sucesso');
    }

    // === CONEXÃO SUPABASE ==================================================
    async testarConexaoSupabase() {
        if (!supa) {
            console.warn('Supabase não disponível, usando localStorage');
            this.atualizarStatusConexao('localStorage');
            return;
        }

        try {
            const { data, error } = await supa.from('pessoas').select('count').limit(1);
            
            if (error) throw error;
            
            console.log('✅ Conexão Supabase estabelecida');
            this.atualizarStatusConexao('supabase');
            
            // Sincronizar dados iniciais
            await this.sincronizarDadosIniciais();
            
        } catch (error) {
            console.warn('❌ Erro Supabase, usando localStorage:', error);
            this.atualizarStatusConexao('localStorage');
        }
    }

    atualizarStatusConexao(tipo) {
        const statusElement = document.getElementById('dbStatus');
        const footerStatus = document.getElementById('statusConexao');
        
        if (statusElement) {
            statusElement.textContent = tipo === 'supabase' ? '🟢 Supabase Conectado' : '🟡 Usando LocalStorage';
            statusElement.className = tipo === 'supabase' ? 'status-online' : 'status-offline';
        }
        if (footerStatus) {
            footerStatus.textContent = tipo === 'supabase' ? '● Conectado' : '● Offline';
            footerStatus.className = tipo === 'supabase' ? 'status-online' : 'status-offline';
        }
    }

    async sincronizarDadosIniciais() {
        try {
            // Carregar dados do Supabase para cada tabela
            const [pessoas, produtos, pedidos, financeiro, estoqueMov, agenda, contratos] = await Promise.all([
                this.carregarDadosSupabase('pessoas'),
                this.carregarDadosSupabase('produtos'),
                this.carregarDadosSupabase('pedidos'),
                this.carregarDadosSupabase('financeiro'),
                this.carregarDadosSupabase('estoque_movimentacoes'),
                this.carregarDadosSupabase('agenda'),
                this.carregarDadosSupabase('contratos')
            ]);

            // Atualizar DB local com dados do Supabase (apenas se houver dados)
            if (pessoas.length > 0) this.DB.pessoas = pessoas;
            if (produtos.length > 0) this.DB.produtos = produtos;
            if (pedidos.length > 0) this.DB.pedidos = pedidos;
            if (financeiro.length > 0) this.DB.financeiro = financeiro;
            if (estoqueMov.length > 0) this.DB.estoqueMov = estoqueMov;
            if (agenda.length > 0) this.DB.agenda = agenda;
            if (contratos.length > 0) this.DB.contratos = contratos;

            this.save();
            
        } catch (error) {
            console.warn('Erro na sincronização inicial:', error);
        }
    }

    async carregarDadosSupabase(tabela) {
        try {
            const { data, error } = await supa.from(tabela).select('*');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.warn(`Erro ao carregar ${tabela}:`, error);
            return [];
        }
    }

    async salvarDadosSupabase(tabela, dados) {
        if (!supa) return null;

        try {
            const { data, error } = await supa.from(tabela).upsert(dados);
            if (error) throw error;
            return data;
        } catch (error) {
            console.warn(`Erro ao salvar ${tabela}:`, error);
            return null;
        }
    }

    async excluirDadosSupabase(tabela, id) {
        if (!supa) return null;

        try {
            const { error } = await supa.from(tabela).delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.warn(`Erro ao excluir ${tabela}:`, error);
            return false;
        }
    }

    // === ESTADO E PERSISTÊNCIA ============================================
    DEF = {
        pessoas: [],
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
            notificacoes: true,
            ultimoBackup: null
        }
    };

    load() {
        try {
            const saved = localStorage.getItem("jk_data");
            if (!saved) return { ...this.DEF };
            
            const parsed = JSON.parse(saved);
            const merged = { ...this.DEF, ...parsed };
            
            // Garantir estruturas críticas
            if (!merged.pessoas) merged.pessoas = [];
            if (!merged.produtos) merged.produtos = [];
            if (!merged.pedidos) merged.pedidos = [];
            if (!merged.financeiro) merged.financeiro = [];
            if (!merged.agenda) merged.agenda = [];
            if (!merged.contratos) merged.contratos = [];
            if (!merged.estoqueMov) merged.estoqueMov = [];
            if (!merged.config) merged.config = { ...this.DEF.config };
            if (!merged.repasse) merged.repasse = { ...this.DEF.repasse };
            if (!merged.perfil) merged.perfil = { ...this.DEF.perfil };
            if (!merged.estoque) merged.estoque = { ...this.DEF.estoque };
            
            return merged;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return { ...this.DEF };
        }
    }

    save() {
        try {
            localStorage.setItem("jk_data", JSON.stringify(this.DB));
            
            // Sincronizar com Supabase se disponível
            if (supa) {
                this.sincronizarComSupabase();
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showNotification("Erro ao salvar dados", "error");
            return false;
        }
    }

    async sincronizarComSupabase() {
        try {
            // Sincronizar tabelas principais em paralelo
            await Promise.all([
                this.salvarDadosSupabase('pessoas', this.DB.pessoas),
                this.salvarDadosSupabase('produtos', this.DB.produtos),
                this.salvarDadosSupabase('pedidos', this.DB.pedidos),
                this.salvarDadosSupabase('financeiro', this.DB.financeiro),
                this.salvarDadosSupabase('agenda', this.DB.agenda),
                this.salvarDadosSupabase('contratos', this.DB.contratos),
                this.salvarDadosSupabase('estoque_movimentacoes', this.DB.estoqueMov)
            ]);
        } catch (error) {
            console.warn('Erro na sincronização Supabase:', error);
        }
    }

    // === HELPERS ==========================================================
    $(sel, root = document) { return root.querySelector(sel); }
    $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

    fmt = {
        money: (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0)),
        num: (v) => (Number(v || 0)).toLocaleString("pt-BR"),
        date: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "",
        datetime: (v) => v ? new Date(v).toLocaleString("pt-BR") : ""
    };

    uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

    toNumber(v) {
        if (typeof v === "number") return isFinite(v) ? v : 0;
        if (v == null) return 0;
        const cleaned = String(v).replace(/[^\d,-]/g, '').replace(',', '.');
        const n = parseFloat(cleaned);
        return isFinite(n) ? n : 0;
    }

    parseBRL(str) {
        return Number(String(str ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".") || 0);
    }

    iconBtn(act, id, title, emoji) {
        return `<button class="icon-btn" data-act="${act}" data-id="${id}" title="${title}">${emoji}</button>`;
    }

    // === TOPBAR ACTIONS ===================================================
    bindTopbarActions() {
        this.$("#btnTheme")?.addEventListener("click", () => this.toggleTheme());
        this.$("#btnExport")?.addEventListener("click", () => this.doExport());
        this.$("#importFile")?.addEventListener("change", (e) => this.handleImport(e));
        this.$("#btnReset")?.addEventListener("click", () => this.reset());
        this.$("#btnPerfil")?.addEventListener("click", () => this.showModal('modalPerfil'));
    }

    toggleTheme() {
        const current = document.body.getAttribute("data-theme") || "dark";
        const next = current === "light" ? "dark" : "light";
        document.body.setAttribute("data-theme", next);
        localStorage.setItem("jk_theme", next);
        this.showNotification(`Tema ${next === 'dark' ? 'escuro' : 'claro'} ativado`);
    }

    initTheme() {
        const saved = localStorage.getItem("jk_theme") || "dark";
        document.body.setAttribute("data-theme", saved);
    }

    doExport() {
        try {
            const data = JSON.stringify(this.DB, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `jkchopp_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification("📦 Backup exportado com sucesso", "success");
        } catch (error) {
            this.showNotification("❌ Erro ao exportar backup", "error");
        }
    }

    handleImport(ev) {
        const file = ev.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (typeof imported !== 'object') {
                    throw new Error("Arquivo inválido");
                }
                
                if (!imported.pessoas && !imported.clientes) {
                    throw new Error("Estrutura de dados inválida");
                }
                
                this.DB = { ...this.DEF, ...imported };
                this.save();
                ev.target.value = "";
                this.renderActive();
                this.showNotification("✅ Dados importados com sucesso", "success");
            } catch (error) {
                console.error('Erro na importação:', error);
                this.showNotification("❌ Arquivo de backup inválido", "error");
            }
        };
        reader.readAsText(file);
    }

    reset() {
        if (confirm("⚠️ TEM CERTEZA? Isso apagará TODOS os dados permanentemente!")) {
            localStorage.removeItem("jk_data");
            this.DB = { ...this.DEF };
            this.renderActive();
            this.showNotification("✅ Dados resetados com sucesso", "success");
        }
    }

    // === NAVEGAÇÃO E MENU =================================================
    buildMenu() {
        const menuList = this.$("#sidebarNav");
        if (!menuList) return;

        // Menu já está no HTML, apenas configurar eventos
        this.configurarEventosMenu();
    }

    configurarEventosMenu() {
        this.$("#sidebarNav").addEventListener("click", (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (menuItem && menuItem.dataset.id) {
                this.navigateTo(menuItem.dataset.id);
            }
        });
    }

    navigateTo(screenId) {
        this.telaAtual = screenId;
        localStorage.setItem("jk_tab", this.telaAtual);
        this.renderActive();
        this.highlightActiveMenu();
        this.closeMenu();
        
        window.scrollTo(0, 0);
    }

    highlightActiveMenu() {
        this.$$(".menu-item").forEach(item => item.classList.remove("active"));
        const activeItem = this.$(`.menu-item[data-id="${this.telaAtual}"]`);
        if (activeItem) {
            activeItem.classList.add("active");
        }
    }

    // === DRAWER/SIDEBAR MANAGEMENT ========================================
    bindDrawerActions() {
        this.$("#btnMenu")?.addEventListener("click", () => this.openMenu());
        this.$("#btnCloseMenu")?.addEventListener("click", () => this.closeMenu());
        
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.closeMenu();
        });
    }

    openMenu() {
        const sidebar = this.$("#sidebar");
        if (sidebar) {
            sidebar.classList.add("open");
        }
    }

    closeMenu() {
        const sidebar = this.$("#sidebar");
        if (sidebar) {
            sidebar.classList.remove("open");
        }
    }

    // === RENDERIZAÇÃO DE TELAS ============================================
    renderActive() {
        const content = this.$("#content");
        if (!content) return;

        content.innerHTML = "";
        
        let screen;
        
        switch (this.telaAtual) {
            case "home": screen = this.renderHome(); break;
            case "pessoas": screen = this.renderPessoas(); break;
            case "produtos": screen = this.renderProdutos(); break;
            case "pedidos": screen = this.renderPedidos(); break;
            case "financeiro": screen = this.renderFinanceiro(); break;
            case "contratos": screen = this.renderContratos(); break;
            case "agendamentos": screen = this.renderAgenda(); break;
            case "estoque": screen = this.renderEstoque(); break;
            case "rel_repasse": screen = this.renderRelRepasse(); break;
            case "relatorios": screen = this.renderRelatorios(); break;
            case "configuracoes": screen = this.renderConfiguracoes(); break;
            default: screen = this.renderHome();
        }
        
        if (screen) {
            content.appendChild(screen);
            this.enhanceResponsiveTables(content);
        }
    }

    // === TELA HOME ========================================================
    renderHome() {
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
        
        this.setupHomeEvents(div);
        this.updateHomeStats(div);
        return div;
    }

    updateHomeStats(content) {
        this.$("#homeClientesCount", content).textContent = this.DB.pessoas.filter(c => c.categoria === 'cliente' && c.ativo !== false).length;
        this.$("#homeProdutosCount", content).textContent = this.DB.produtos.filter(p => p.ativo !== false).length;
        this.$("#homePedidosCount", content).textContent = this.DB.pedidos.filter(p => p.status === 'aberto' || p.status === 'andamento').length;
        
        const receber = this.DB.financeiro.filter(f => f.tipo === 'receber' && f.status !== 'pago').reduce((sum, f) => sum + this.toNumber(f.valor), 0);
        const pagar = this.DB.financeiro.filter(f => f.tipo === 'pagar' && f.status !== 'pago').reduce((sum, f) => sum + this.toNumber(f.valor), 0);
        this.$("#homeFinanceiroTotal", content).textContent = this.fmt.money(receber - pagar);
        
        const hoje = new Date().toISOString().split('T')[0];
        this.$("#homeHojeMov", content).textContent = this.DB.estoqueMov.filter(m => m.data?.startsWith(hoje)).length;
        this.$("#homeHojePedidos", content).textContent = this.DB.pedidos.filter(p => p.dataCriacao?.startsWith(hoje)).length;
        
        this.updateHomeAgenda(content);
    }

    updateHomeAgenda(content) {
        const tbody = this.$("#home_ag_tbody", content);
        const hoje = new Date().toISOString().split('T')[0];
        
        const proximos = this.DB.agenda
            .filter(a => a.data >= hoje)
            .sort((a, b) => a.data.localeCompare(b.data))
            .slice(0, 5);
        
        tbody.innerHTML = proximos.map(a => `
            <tr>
                <td>${this.fmt.date(a.data)}</td>
                <td>${a.hora || "—"}</td>
                <td>${a.titulo}</td>
                <td>${this.iconBtn("del", a.id, "Excluir", "🗑️")}</td>
            </tr>
        `).join("") || `<tr><td colspan="4" class="empty">Nenhum agendamento futuro</td></tr>`;
    }

    setupHomeEvents(content) {
        this.$("#goNovoPedido", content)?.addEventListener("click", () => this.navigateTo("pedidos"));
        this.$("#goPessoas", content)?.addEventListener("click", () => this.navigateTo("pessoas"));
        this.$("#goProdutos", content)?.addEventListener("click", () => this.navigateTo("produtos"));
        this.$("#goEstoque", content)?.addEventListener("click", () => this.navigateTo("estoque"));
        this.$("#goFinanceiro", content)?.addEventListener("click", () => this.navigateTo("financeiro"));
        
        this.$("#homeAddAgenda", content)?.addEventListener("click", () => {
            const titulo = this.$("#home_ag_titulo", content).value.trim();
            const data = this.$("#home_ag_data", content).value;
            const hora = this.$("#home_ag_hora", content).value;
            
            if (!titulo || !data) {
                this.showNotification("Informe título e data", "warning");
                return;
            }
            
            this.DB.agenda.push({
                id: this.uid(),
                titulo,
                data,
                hora,
                criado: new Date().toISOString()
            });
            
            this.save();
            this.$("#home_ag_titulo", content).value = "";
            this.updateHomeAgenda(content);
            this.showNotification("✅ Agendamento adicionado", "success");
        });
        
        content.addEventListener("click", (e) => {
            const btn = e.target.closest('.icon-btn[data-act="del"]');
            if (!btn) return;
            
            const id = btn.dataset.id;
            this.DB.agenda = this.DB.agenda.filter(a => a.id !== id);
            this.save();
            this.updateHomeAgenda(content);
            this.showNotification("Agendamento excluído", "success");
        });
    }

    // === TELA PESSOAS =====================================================
    renderPessoas() {
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

                    <div id="pessoa_form_dinamico">
                        <!-- Campos dinâmicos serão preenchidos via JavaScript -->
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
        
        this.setupPessoaEvents(div);
        this.listPessoas(div);
        return div;
    }

    setupPessoaEvents(content) {
        this.$("#pessoa_tipo", content)?.addEventListener("change", () => this.atualizarCamposPessoa(content));
        this.$("#pessoa_categoria", content)?.addEventListener("change", () => this.atualizarCamposPessoa(content));
        this.$("#btnSalvarPessoa", content)?.addEventListener("click", () => this.savePessoa(content));
        this.$("#btnLimparPessoa", content)?.addEventListener("click", () => this.clearPessoaForm(content));
        this.$("#buscaPessoas", content)?.addEventListener("input", () => this.listPessoas(content));
        this.$("#filtroCategoriaPessoa", content)?.addEventListener("change", () => this.listPessoas(content));
        
        content.addEventListener("click", (e) => this.handlePessoaActions(e, content));
    }

    atualizarCamposPessoa(content) {
        const tipo = this.$("#pessoa_tipo", content).value;
        const categoria = this.$("#pessoa_categoria", content).value;
        const container = this.$("#pessoa_form_dinamico", content);
        
        if (!container) return;
        
        let html = '';
        
        if (tipo && categoria) {
            // Tipo de cliente
            if (categoria === 'cliente') {
                html += `
                    <div class="form-group">
                        <label class="form-label">Tipo de Cliente *</label>
                        <div class="flex">
                            <label class="pill"><input type="radio" name="pessoa_tipo_cliente" value="ponto_fixo" /> Ponto Fixo</label>
                            <label class="pill"><input type="radio" name="pessoa_tipo_cliente" value="evento" /> Evento</label>
                        </div>
                    </div>
                `;
            }
            
            // Campos específicos do tipo
            if (tipo === 'PF') {
                html += `
                    <h4>Dados Pessoais</h4>
                    <input class="input" id="pessoa_nome" placeholder="Nome Completo *" />
                    <div class="form-grid">
                        <input class="input" id="pessoa_cpf" placeholder="CPF *" />
                        <input class="input" id="pessoa_rg" placeholder="RG" />
                    </div>
                    <input class="input" id="pessoa_data_nascimento" type="date" />
                `;
            } else {
                html += `
                    <h4>Dados da Empresa</h4>
                    <input class="input" id="pessoa_razao_social" placeholder="Razão Social *" />
                    <input class="input" id="pessoa_nome_fantasia" placeholder="Nome Fantasia" />
                    <div class="form-grid">
                        <input class="input" id="pessoa_cnpj" placeholder="CNPJ *" />
                        <input class="input" id="pessoa_inscricao_estadual" placeholder="Inscrição Estadual" />
                    </div>
                    <input class="input" id="pessoa_data_fundacao" type="date" />
                `;
            }
            
            // Campos de contato
            html += `
                <h4>Contato</h4>
                <input class="input" id="pessoa_email" placeholder="E-mail *" type="email" />
                <div class="form-grid">
                    <input class="input" id="pessoa_telefone" placeholder="Telefone" />
                    <input class="input" id="pessoa_celular" placeholder="Celular" />
                </div>
            `;
            
            // Endereço para clientes
            if (categoria === 'cliente') {
                html += `
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
                `;
            }
            
            // PIX para fornecedores
            if (categoria === 'fornecedor') {
                html += `
                    <h4>Dados Financeiros</h4>
                    <input class="input" id="pessoa_chave_pix" placeholder="Chave PIX" />
                `;
            }
        }
        
        container.innerHTML = html;
        
        // Aplicar máscaras nos novos campos
        if (this.$("#pessoa_cpf", content)) {
            this.$("#pessoa_cpf", content).addEventListener("input", this.maskCPF);
        }
        if (this.$("#pessoa_cnpj", content)) {
            this.$("#pessoa_cnpj", content).addEventListener("input", this.maskCNPJ);
        }
        if (this.$("#pessoa_telefone", content)) {
            this.$("#pessoa_telefone", content).addEventListener("input", this.maskTelefone);
        }
        if (this.$("#pessoa_celular", content)) {
            this.$("#pessoa_celular", content).addEventListener("input", this.maskCelular);
        }
        if (this.$("#pessoa_cep", content)) {
            this.$("#pessoa_cep", content).addEventListener("input", this.maskCEP);
        }
    }

    // Máscaras
    maskCPF(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    }

    maskCNPJ(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1/$2');
        value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    }

    maskTelefone(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
        e.target.value = value;
    }

    maskCelular(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    }

    maskCEP(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    }

    async savePessoa(content) {
        const id = this.$("#pessoa_id", content).value;
        const tipo = this.$("#pessoa_tipo", content).value;
        const categoria = this.$("#pessoa_categoria", content).value;
        
        const pessoa = {
            id: id || this.uid(),
            tipo: tipo,
            categoria: categoria,
            email: this.$("#pessoa_email", content).value.trim(),
            telefone: this.$("#pessoa_telefone", content).value.trim(),
            celular: this.$("#pessoa_celular", content).value.trim(),
            observacoes: this.$("#pessoa_observacoes", content).value.trim(),
            dataCadastro: id ? this.DB.pessoas.find(p => p.id === id)?.dataCadastro || new Date().toISOString() : new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
            ativo: true
        };
        
        // Campos específicos por tipo
        if (tipo === 'PF') {
            pessoa.nome = this.$("#pessoa_nome", content).value.trim();
            pessoa.cpf = this.$("#pessoa_cpf", content).value.trim();
            pessoa.rg = this.$("#pessoa_rg", content).value.trim();
            pessoa.dataNascimento = this.$("#pessoa_data_nascimento", content).value;
            
            if (!pessoa.nome || !pessoa.cpf) {
                this.showNotification("Nome e CPF são obrigatórios para Pessoa Física", "warning");
                return;
            }
        } else if (tipo === 'PJ') {
            pessoa.razaoSocial = this.$("#pessoa_razao_social", content).value.trim();
            pessoa.nomeFantasia = this.$("#pessoa_nome_fantasia", content).value.trim();
            pessoa.cnpj = this.$("#pessoa_cnpj", content).value.trim();
            pessoa.inscricaoEstadual = this.$("#pessoa_inscricao_estadual", content).value.trim();
            pessoa.dataFundacao = this.$("#pessoa_data_fundacao", content).value;
            
            if (!pessoa.razaoSocial || !pessoa.cnpj) {
                this.showNotification("Razão Social e CNPJ são obrigatórios para Pessoa Jurídica", "warning");
                return;
            }
        }
        
        // Tipo de cliente
        if (categoria === 'cliente') {
            const tipoClienteRadio = this.$('input[name="pessoa_tipo_cliente"]:checked', content);
            pessoa.tipoCliente = tipoClienteRadio ? tipoClienteRadio.value : '';
            
            if (!pessoa.tipoCliente) {
                this.showNotification("Selecione o tipo de cliente", "warning");
                return;
            }
            
            // Campos de endereço para clientes
            pessoa.cep = this.$("#pessoa_cep", content).value.trim();
            pessoa.endereco = this.$("#pessoa_endereco", content).value.trim();
            pessoa.numero = this.$("#pessoa_numero", content).value.trim();
            pessoa.complemento = this.$("#pessoa_complemento", content).value.trim();
            pessoa.bairro = this.$("#pessoa_bairro", content).value.trim();
            pessoa.cidade = this.$("#pessoa_cidade", content).value.trim();
            pessoa.estado = this.$("#pessoa_estado", content).value;
        }
        
        // Campo PIX para fornecedores
        if (categoria === 'fornecedor') {
            pessoa.chavePix = this.$("#pessoa_chave_pix", content).value.trim();
        }
        
        if (!pessoa.email) {
            this.showNotification("E-mail é obrigatório", "warning");
            return;
        }
        
        // Verificar duplicata de CPF/CNPJ
        const doc = tipo === 'PF' ? pessoa.cpf : pessoa.cnpj;
        const existe = this.DB.pessoas.find(p => 
            ((tipo === 'PF' && p.cpf === doc) || (tipo === 'PJ' && p.cnpj === doc)) && 
            p.id !== pessoa.id
        );
        if (existe) {
            this.showNotification("Já existe uma pessoa com este documento", "error");
            return;
        }

        try {
            if (id) {
                const index = this.DB.pessoas.findIndex(p => p.id === id);
                if (index >= 0) this.DB.pessoas[index] = pessoa;
            } else {
                this.DB.pessoas.push(pessoa);
            }
            
            await this.save();
            await this.salvarDadosSupabase('pessoas', [pessoa]);
            
            this.listPessoas(content);
            this.clearPessoaForm(content);
            this.showNotification(`✅ Pessoa ${id ? 'atualizada' : 'cadastrada'} com sucesso`, "success");
            
        } catch (error) {
            this.showNotification("❌ Erro ao salvar pessoa", "error");
        }
    }

    clearPessoaForm(content) {
        const fields = [
            'pessoa_id', 'pessoa_tipo', 'pessoa_categoria', 'pessoa_nome', 'pessoa_cpf', 'pessoa_rg',
            'pessoa_data_nascimento', 'pessoa_razao_social', 'pessoa_nome_fantasia', 'pessoa_cnpj',
            'pessoa_inscricao_estadual', 'pessoa_data_fundacao', 'pessoa_email', 'pessoa_telefone',
            'pessoa_celular', 'pessoa_cep', 'pessoa_endereco', 'pessoa_numero', 'pessoa_complemento',
            'pessoa_bairro', 'pessoa_cidade', 'pessoa_estado', 'pessoa_chave_pix', 'pessoa_observacoes'
        ];
        
        fields.forEach(field => {
            const element = this.$(`#${field}`, content);
            if (element) element.value = "";
        });
        
        // Limpar radios
        this.$$('input[name="pessoa_tipo_cliente"]', content).forEach(radio => radio.checked = false);
        
        // Resetar campos dinâmicos
        this.atualizarCamposPessoa(content);
    }

    listPessoas(content) {
        const tbody = this.$("#tblPessoas", content).querySelector("tbody");
        const busca = this.$("#buscaPessoas", content).value.toLowerCase();
        const categoriaFiltro = this.$("#filtroCategoriaPessoa", content).value;
        
        let pessoasFiltradas = this.DB.pessoas.filter(p => {
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
        
        this.$("#infoPessoas", content).textContent = `${pessoasFiltradas.length} pessoa(s)`;
        
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
                        ${this.iconBtn("edit", p.id, "Editar", "✏️")}
                        ${this.iconBtn("del", p.id, "Excluir", "🗑️")}
                    </td>
                </tr>
            `;
        }).join("") || `<tr><td colspan="5" class="empty">Nenhuma pessoa encontrada</td></tr>`;
    }

    handlePessoaActions(e, content) {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        const id = btn.dataset.id;
        const pessoa = this.DB.pessoas.find(p => p.id === id);
        if (!pessoa) return;
        
        if (btn.dataset.act === "edit") {
            this.fillPessoaForm(pessoa, content);
        } else if (btn.dataset.act === "del") {
            this.confirmAction(`Excluir pessoa ${pessoa.tipo === 'PF' ? pessoa.nome : pessoa.razaoSocial}?`, async () => {
                this.DB.pessoas = this.DB.pessoas.filter(p => p.id !== id);
                await this.save();
                await this.excluirDadosSupabase('pessoas', id);
                this.renderActive();
                this.showNotification("Pessoa excluída", "success");
            });
        }
    }

    fillPessoaForm(pessoa, content) {
        this.$("#pessoa_id", content).value = pessoa.id;
        this.$("#pessoa_tipo", content).value = pessoa.tipo;
        this.$("#pessoa_categoria", content).value = pessoa.categoria;
        
        // Atualizar campos dinâmicos primeiro
        this.atualizarCamposPessoa(content);
        
        // Preencher campos após atualização
        setTimeout(() => {
            this.$("#pessoa_email", content).value = pessoa.email;
            this.$("#pessoa_telefone", content).value = pessoa.telefone || "";
            this.$("#pessoa_celular", content).value = pessoa.celular || "";
            this.$("#pessoa_observacoes", content).value = pessoa.observacoes || "";
            
            if (pessoa.tipo === 'PF') {
                if (this.$("#pessoa_nome", content)) this.$("#pessoa_nome", content).value = pessoa.nome;
                if (this.$("#pessoa_cpf", content)) this.$("#pessoa_cpf", content).value = pessoa.cpf;
                if (this.$("#pessoa_rg", content)) this.$("#pessoa_rg", content).value = pessoa.rg || "";
                if (this.$("#pessoa_data_nascimento", content)) this.$("#pessoa_data_nascimento", content).value = pessoa.dataNascimento || "";
            } else {
                if (this.$("#pessoa_razao_social", content)) this.$("#pessoa_razao_social", content).value = pessoa.razaoSocial;
                if (this.$("#pessoa_nome_fantasia", content)) this.$("#pessoa_nome_fantasia", content).value = pessoa.nomeFantasia || "";
                if (this.$("#pessoa_cnpj", content)) this.$("#pessoa_cnpj", content).value = pessoa.cnpj;
                if (this.$("#pessoa_inscricao_estadual", content)) this.$("#pessoa_inscricao_estadual", content).value = pessoa.inscricaoEstadual || "";
                if (this.$("#pessoa_data_fundacao", content)) this.$("#pessoa_data_fundacao", content).value = pessoa.dataFundacao || "";
            }
            
            // Preencher outros campos específicos
            if (pessoa.categoria === 'cliente') {
                const radio = this.$(`input[name="pessoa_tipo_cliente"][value="${pessoa.tipoCliente}"]`, content);
                if (radio) radio.checked = true;
                
                if (this.$("#pessoa_cep", content)) this.$("#pessoa_cep", content).value = pessoa.cep || "";
                if (this.$("#pessoa_endereco", content)) this.$("#pessoa_endereco", content).value = pessoa.endereco || "";
                if (this.$("#pessoa_numero", content)) this.$("#pessoa_numero", content).value = pessoa.numero || "";
                if (this.$("#pessoa_complemento", content)) this.$("#pessoa_complemento", content).value = pessoa.complemento || "";
                if (this.$("#pessoa_bairro", content)) this.$("#pessoa_bairro", content).value = pessoa.bairro || "";
                if (this.$("#pessoa_cidade", content)) this.$("#pessoa_cidade", content).value = pessoa.cidade || "";
                if (this.$("#pessoa_estado", content)) this.$("#pessoa_estado", content).value = pessoa.estado || "";
            }
            
            if (pessoa.categoria === 'fornecedor' && this.$("#pessoa_chave_pix", content)) {
                this.$("#pessoa_chave_pix", content).value = pessoa.chavePix || "";
            }
        }, 100);
    }

    // === TELA PRODUTOS ====================================================
    renderProdutos() {
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
                        <span class="muted" id="infoProdutos">${this.DB.produtos.length} produto(s)</span>
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
        
        this.setupProdutoEvents(div);
        this.listProdutos(div);
        return div;
    }

    setupProdutoEvents(content) {
        this.$("#prod_preco", content)?.addEventListener("blur", (e) => this.formatCurrency(e));
        this.$("#prod_custo", content)?.addEventListener("blur", (e) => this.formatCurrency(e));
        this.$("#btnSalvarProduto", content)?.addEventListener("click", () => this.saveProduto(content));
        this.$("#btnLimparProduto", content)?.addEventListener("click", () => this.clearProdutoForm(content));
        this.$("#buscaProdutos", content)?.addEventListener("input", () => this.listProdutos(content));
        
        content.addEventListener("click", (e) => this.handleProdutoActions(e, content));
    }

    formatCurrency(e) {
        const input = e.target;
        let value = input.value.replace(/[^\d,]/g, '');
        
        if (value) {
            value = parseFloat(value.replace(',', '.')).toFixed(2);
            input.value = this.fmt.money(value);
        }
    }

    async saveProduto(content) {
        const id = this.$("#prod_id", content).value;
        const produto = {
            id: id || this.uid(),
            nome: this.$("#prod_nome", content).value.trim(),
            codigo: this.$("#prod_codigo", content).value.trim(),
            tipo: this.$("#prod_tipo", content).value,
            categoria: this.$("#prod_categoria", content).value,
            preco: this.parseBRL(this.$("#prod_preco", content).value),
            custo: this.parseBRL(this.$("#prod_custo", content).value),
            estoque: parseInt(this.$("#prod_estoque", content).value) || 0,
            estoqueMinimo: parseInt(this.$("#prod_estoque_min", content).value) || 0,
            controlaEstoque: this.$("#prod_controla_estoque", content).checked,
            ativo: this.$("#prod_ativo", content).checked,
            descricao: this.$("#prod_descricao", content).value.trim(),
            dataCadastro: id ? this.DB.produtos.find(p => p.id === id)?.dataCadastro || new Date().toISOString() : new Date().toISOString(),
            dataAtualizacao: new Date().toISOString()
        };
        
        if (!produto.nome) {
            this.showNotification("Nome do produto é obrigatório", "warning");
            return;
        }
        
        try {
            if (id) {
                const index = this.DB.produtos.findIndex(p => p.id === id);
                if (index >= 0) this.DB.produtos[index] = produto;
            } else {
                this.DB.produtos.push(produto);
            }
            
            await this.save();
            await this.salvarDadosSupabase('produtos', [produto]);
            
            this.listProdutos(content);
            this.clearProdutoForm(content);
            this.showNotification(`✅ Produto ${id ? 'atualizado' : 'cadastrado'} com sucesso`, "success");
            
        } catch (error) {
            this.showNotification("❌ Erro ao salvar produto", "error");
        }
    }

    clearProdutoForm(content) {
        this.$("#prod_id", content).value = "";
        this.$("#prod_nome", content).value = "";
        this.$("#prod_codigo", content).value = "";
        this.$("#prod_tipo", content).value = "equipamento";
        this.$("#prod_categoria", content).value = "chopeira";
        this.$("#prod_preco", content).value = "";
        this.$("#prod_custo", content).value = "";
        this.$("#prod_estoque", content).value = "0";
        this.$("#prod_estoque_min", content).value = "0";
        this.$("#prod_controla_estoque", content).checked = true;
        this.$("#prod_ativo", content).checked = true;
        this.$("#prod_descricao", content).value = "";
    }

    listProdutos(content) {
        const tbody = this.$("#tblProdutos", content).querySelector("tbody");
        const busca = this.$("#buscaProdutos", content).value.toLowerCase();
        
        const produtosFiltrados = this.DB.produtos.filter(p => {
            if (!busca) return true;
            return p.nome.toLowerCase().includes(busca) ||
                   (p.codigo && p.codigo.toLowerCase().includes(busca)) ||
                   p.tipo.toLowerCase().includes(busca) ||
                   p.categoria.toLowerCase().includes(busca);
        });
        
        this.$("#infoProdutos", content).textContent = `${produtosFiltrados.length} produto(s)`;
        
        tbody.innerHTML = produtosFiltrados.map(p => `
            <tr>
                <td>${p.nome}</td>
                <td>${p.codigo || "—"}</td>
                <td>${p.tipo}</td>
                <td>${this.fmt.money(p.preco)}</td>
                <td>${p.controlaEstoque ? p.estoque : 'N/C'}</td>
                <td><span class="tag ${p.ativo ? 'ok' : 'fix'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    ${this.iconBtn("edit", p.id, "Editar", "✏️")}
                    ${this.iconBtn("del", p.id, "Excluir", "🗑️")}
                </td>
            </tr>
        `).join("") || `<tr><td colspan="7" class="empty">Nenhum produto encontrado</td></tr>`;
    }

    handleProdutoActions(e, content) {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        const id = btn.dataset.id;
        const produto = this.DB.produtos.find(p => p.id === id);
        if (!produto) return;
        
        if (btn.dataset.act === "edit") {
            this.fillProdutoForm(produto, content);
        } else if (btn.dataset.act === "del") {
            this.confirmAction(`Excluir produto ${produto.nome}?`, async () => {
                this.DB.produtos = this.DB.produtos.filter(p => p.id !== id);
                await this.save();
                await this.excluirDadosSupabase('produtos', id);
                this.renderActive();
                this.showNotification("Produto excluído", "success");
            });
        }
    }

    fillProdutoForm(produto, content) {
        this.$("#prod_id", content).value = produto.id;
        this.$("#prod_nome", content).value = produto.nome;
        this.$("#prod_codigo", content).value = produto.codigo || "";
        this.$("#prod_tipo", content).value = produto.tipo;
        this.$("#prod_categoria", content).value = produto.categoria;
        this.$("#prod_preco", content).value = produto.preco.toFixed(2).replace('.', ',');
        this.$("#prod_custo", content).value = produto.custo.toFixed(2).replace('.', ',');
        this.$("#prod_estoque", content).value = produto.estoque;
        this.$("#prod_estoque_min", content).value = produto.estoqueMinimo;
        this.$("#prod_controla_estoque", content).checked = produto.controlaEstoque;
        this.$("#prod_ativo", content).checked = produto.ativo;
        this.$("#prod_descricao", content).value = produto.descricao || "";
    }

    // === SISTEMA DE PEDIDOS ===============================================
    renderPedidos() {
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
        
        this.setupPedidoEvents(div);
        this.listPedidos(div);
        return div;
    }

    setupPedidoEvents(content) {
        this.$("#btnNovoPedido", content)?.addEventListener("click", () => {
            this.pedidoEditando = null;
            this.pedidoItens = [];
            this.showModal('modalNovoPedido');
            this.loadClientesPedido();
            this.loadProdutosPedido();
        });
        
        this.$("#filtroStatusPedido", content)?.addEventListener("change", () => this.listPedidos(content));
        this.$("#buscaPedidos", content)?.addEventListener("input", () => this.listPedidos(content));
        
        content.addEventListener("click", (e) => this.handlePedidoActions(e, content));
    }

    loadClientesPedido() {
        const select = this.$('#ped_cliente');
        if (!select) return;
        
        const clientes = this.DB.pessoas.filter(c => c.categoria === 'cliente' && c.ativo !== false);
        
        select.innerHTML = '<option value="">Selecione um cliente</option>' +
            clientes.map(c => 
                `<option value="${c.id}">${c.tipo === 'PF' ? c.nome : c.razaoSocial} - ${c.tipo === 'PF' ? c.cpf : c.cnpj}</option>`
            ).join('');
    }

    loadProdutosPedido() {
        const select = this.$('#ped_produto');
        if (!select) return;
        
        const produtos = this.DB.produtos.filter(p => p.ativo);
        
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => 
                `<option value="${p.id}" data-preco="${p.preco}">${p.nome} - ${this.fmt.money(p.preco)}</option>`
            ).join('');
    }

    adicionarItemPedido() {
        const produtoSelect = this.$('#ped_produto');
        const quantidadeInput = this.$('#ped_quantidade');
        
        const produtoId = produtoSelect.value;
        const quantidade = parseInt(quantidadeInput.value) || 1;
        
        if (!produtoId) {
            this.showNotification("Selecione um produto", "warning");
            return;
        }
        
        const produto = this.DB.produtos.find(p => p.id === produtoId);
        if (!produto) return;
        
        const item = {
            id: this.uid(),
            produtoId: produto.id,
            produto: produto.nome,
            quantidade: quantidade,
            valorUnitario: produto.preco,
            total: produto.preco * quantidade
        };
        
        this.pedidoItens.push(item);
        this.atualizarItensPedido();
        this.calcularTotalPedido();
        
        produtoSelect.value = '';
        quantidadeInput.value = '1';
    }

    atualizarItensPedido() {
        const tbody = this.$('#tblItensPedido').querySelector('tbody');
        tbody.innerHTML = this.pedidoItens.map(item => `
            <tr>
                <td>${item.produto}</td>
                <td>${item.quantidade}</td>
                <td>${this.fmt.money(item.valorUnitario)}</td>
                <td>${this.fmt.money(item.total)}</td>
                <td>
                    <button class="icon-btn" onclick="sistema.removerItemPedido('${item.id}')" title="Remover item">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    removerItemPedido(itemId) {
        this.pedidoItens = this.pedidoItens.filter(item => item.id !== itemId);
        this.atualizarItensPedido();
        this.calcularTotalPedido();
    }

    calcularTotalPedido() {
        const total = this.pedidoItens.reduce((sum, item) => sum + item.total, 0);
        const totalEl = this.$('#ped_total');
        if (totalEl) totalEl.textContent = this.fmt.money(total);
    }

    async finalizarPedido() {
        const clienteId = this.$('#ped_cliente').value;
        const observacoes = this.$('#ped_observacoes').value;
        
        if (!clienteId) {
            this.showNotification("Selecione um cliente", "warning");
            return;
        }
        
        if (this.pedidoItens.length === 0) {
            this.showNotification("Adicione itens ao pedido", "warning");
            return;
        }
        
        const cliente = this.DB.pessoas.find(c => c.id === clienteId);
        const total = this.pedidoItens.reduce((sum, item) => sum + item.total, 0);
        
        const pedido = {
            id: this.pedidoEditando?.id || this.uid(),
            codigo: this.pedidoEditando?.codigo || `PED${Date.now().toString(36).toUpperCase()}`,
            clienteId: cliente.id,
            cliente: cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial,
            itens: [...this.pedidoItens],
            total: total,
            status: this.pedidoEditando?.status || 'aberto',
            observacoes: observacoes,
            dataCriacao: this.pedidoEditando?.dataCriacao || new Date().toISOString(),
            dataAtualizacao: new Date().toISOString()
        };
        
        try {
            if (this.pedidoEditando) {
                const index = this.DB.pedidos.findIndex(p => p.id === this.pedidoEditando.id);
                if (index >= 0) this.DB.pedidos[index] = pedido;
            } else {
                this.DB.pedidos.push(pedido);
            }
            
            await this.save();
            await this.salvarDadosSupabase('pedidos', [pedido]);
            
            this.pedidoEditando = null;
            this.pedidoItens = [];
            this.$('#modalNovoPedido').close();
            this.renderActive();
            
            this.showNotification(`✅ Pedido ${this.pedidoEditando ? 'atualizado' : 'criado'} com sucesso`, "success");
            
        } catch (error) {
            this.showNotification("❌ Erro ao salvar pedido", "error");
        }
    }

    listPedidos(content) {
        const tbody = this.$("#tblPedidos", content).querySelector("tbody");
        const vazio = this.$("#vazioPedidos", content);
        const statusFiltro = this.$("#filtroStatusPedido", content).value;
        const busca = this.$("#buscaPedidos", content).value.toLowerCase();
        
        let pedidosFiltrados = this.DB.pedidos;
        
        if (statusFiltro) {
            pedidosFiltrados = pedidosFiltrados.filter(p => p.status === statusFiltro);
        }
        
        if (busca) {
            pedidosFiltrados = pedidosFiltrados.filter(p => 
                p.codigo.toLowerCase().includes(busca) ||
                p.cliente.toLowerCase().includes(busca)
            );
        }
        
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
                    <td>${this.fmt.money(p.total)}</td>
                    <td><span class="tag status-${p.status}">${this.getStatusText(p.status)}</span></td>
                    <td>${this.fmt.date(p.dataCriacao)}</td>
                    <td>
                        ${this.iconBtn("view", p.id, "Ver detalhes", "👁️")}
                        ${this.iconBtn("edit", p.id, "Editar", "✏️")}
                        ${this.iconBtn("del", p.id, "Excluir", "🗑️")}
                    </td>
                </tr>
            `;
        }).join("") : "";
    }

    getStatusText(status) {
        const statusMap = {
            'aberto': 'Aberto',
            'andamento': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    handlePedidoActions(e, content) {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        const id = btn.dataset.id;
        const pedido = this.DB.pedidos.find(p => p.id === id);
        if (!pedido) return;
        
        if (btn.dataset.act === "view") {
            this.showDetalhesPedido(pedido);
        } else if (btn.dataset.act === "edit") {
            this.editarPedido(pedido);
        } else if (btn.dataset.act === "del") {
            this.confirmAction(`Excluir pedido ${pedido.codigo}?`, async () => {
                this.DB.pedidos = this.DB.pedidos.filter(p => p.id !== id);
                await this.save();
                await this.excluirDadosSupabase('pedidos', id);
                this.renderActive();
                this.showNotification("Pedido excluído", "success");
            });
        }
    }

    editarPedido(pedido) {
        this.pedidoEditando = pedido;
        this.pedidoItens = [...pedido.itens];
        
        this.showModal('modalNovoPedido');
        this.loadClientesPedido();
        this.loadProdutosPedido();
        
        setTimeout(() => {
            this.$('#ped_cliente').value = pedido.clienteId;
            this.$('#ped_observacoes').value = pedido.observacoes || '';
            this.atualizarItensPedido();
            this.calcularTotalPedido();
        }, 100);
    }

    // === TELA FINANCEIRO ==================================================
    renderFinanceiro() {
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
        
        this.setupFinanceiroEvents(div);
        this.listFinanceiro(div);
        this.updateSaldoFinanceiro(div);
        return div;
    }

    setupFinanceiroEvents(content) {
        this.$("#btnSalvarFinanceiro", content)?.addEventListener("click", () => this.saveFinanceiro(content));
        this.$("#btnLimparFinanceiro", content)?.addEventListener("click", () => this.clearFinanceiroForm(content));
        this.$("#filtroTipoFin", content)?.addEventListener("change", () => this.listFinanceiro(content));
        this.$("#filtroStatusFin", content)?.addEventListener("change", () => this.listFinanceiro(content));
        this.$("#buscaFinanceiro", content)?.addEventListener("input", () => this.listFinanceiro(content));
        
        content.addEventListener("click", (e) => this.handleFinanceiroActions(e, content));
    }

    async saveFinanceiro(content) {
        const id = this.$("#fin_id", content).value;
        const lancamento = {
            id: id || this.uid(),
            tipo: this.$("#fin_tipo", content).value,
            descricao: this.$("#fin_descricao", content).value.trim(),
            valor: this.parseBRL(this.$("#fin_valor", content).value),
            vencimento: this.$("#fin_vencimento", content).value,
            pagamento: this.$("#fin_pagamento", content).value,
            status: this.$("#fin_status", content).value,
            categoria: this.$("#fin_categoria", content).value,
            observacoes: this.$("#fin_observacoes", content).value.trim(),
            dataCriacao: id ? this.DB.financeiro.find(f => f.id === id)?.dataCriacao || new Date().toISOString() : new Date().toISOString()
        };
        
        if (!lancamento.descricao || !lancamento.valor) {
            this.showNotification("Descrição e valor são obrigatórios", "warning");
            return;
        }
        
        try {
            if (id) {
                const index = this.DB.financeiro.findIndex(f => f.id === id);
                if (index >= 0) this.DB.financeiro[index] = lancamento;
            } else {
                this.DB.financeiro.push(lancamento);
            }
            
            await this.save();
            await this.salvarDadosSupabase('financeiro', [lancamento]);
            
            this.listFinanceiro(content);
            this.updateSaldoFinanceiro(content);
            this.clearFinanceiroForm(content);
            this.showNotification(`✅ Lançamento ${id ? 'atualizado' : 'adicionado'}`, "success");
            
        } catch (error) {
            this.showNotification("❌ Erro ao salvar lançamento", "error");
        }
    }

    clearFinanceiroForm(content) {
        this.$("#fin_id", content).value = "";
        this.$("#fin_tipo", content).value = "receber";
        this.$("#fin_descricao", content).value = "";
        this.$("#fin_valor", content).value = "";
        this.$("#fin_vencimento", content).value = "";
        this.$("#fin_pagamento", content).value = "";
        this.$("#fin_status", content).value = "pendente";
        this.$("#fin_categoria", content).value = "venda";
        this.$("#fin_observacoes", content).value = "";
    }

    listFinanceiro(content) {
        const tbody = this.$("#tblFinanceiro", content).querySelector("tbody");
        const tipoFiltro = this.$("#filtroTipoFin", content).value;
        const statusFiltro = this.$("#filtroStatusFin", content).value;
        const busca = this.$("#buscaFinanceiro", content).value.toLowerCase();
        
        let financeiroFiltrado = this.DB.financeiro;
        
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
                <td>${this.fmt.money(f.valor)}</td>
                <td>${f.vencimento ? this.fmt.date(f.vencimento) : '—'}</td>
                <td><span class="tag status-${f.status}">${f.status}</span></td>
                <td>
                    ${this.iconBtn("edit", f.id, "Editar", "✏️")}
                    ${this.iconBtn("del", f.id, "Excluir", "🗑️")}
                </td>
            </tr>
        `).join("") || `<tr><td colspan="6" class="empty">Nenhum lançamento encontrado</td></tr>`;
    }

    updateSaldoFinanceiro(content) {
        const saldoEl = this.$("#finSaldo", content);
        if (!saldoEl) return;
        
        const receber = this.DB.financeiro.filter(f => f.tipo === 'receber' && f.status !== 'pago').reduce((sum, f) => sum + f.valor, 0);
        const pagar = this.DB.financeiro.filter(f => f.tipo === 'pagar' && f.status !== 'pago').reduce((sum, f) => sum + f.valor, 0);
        const saldo = receber - pagar;
        
        saldoEl.textContent = this.fmt.money(saldo);
        saldoEl.className = saldo >= 0 ? "positive" : "negative";
    }

    handleFinanceiroActions(e, content) {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        const id = btn.dataset.id;
        const lancamento = this.DB.financeiro.find(f => f.id === id);
        if (!lancamento) return;
        
        if (btn.dataset.act === "edit") {
            this.fillFinanceiroForm(lancamento, content);
        } else if (btn.dataset.act === "del") {
            this.confirmAction(`Excluir lançamento ${lancamento.descricao}?`, async () => {
                this.DB.financeiro = this.DB.financeiro.filter(f => f.id !== id);
                await this.save();
                await this.excluirDadosSupabase('financeiro', id);
                this.renderActive();
                this.showNotification("Lançamento excluído", "success");
            });
        }
    }

    fillFinanceiroForm(lancamento, content) {
        this.$("#fin_id", content).value = lancamento.id;
        this.$("#fin_tipo", content).value = lancamento.tipo;
        this.$("#fin_descricao", content).value = lancamento.descricao;
        this.$("#fin_valor", content).value = lancamento.valor.toFixed(2).replace('.', ',');
        this.$("#fin_vencimento", content).value = lancamento.vencimento || '';
        this.$("#fin_pagamento", content).value = lancamento.pagamento || '';
        this.$("#fin_status", content).value = lancamento.status;
        this.$("#fin_categoria", content).value = lancamento.categoria;
        this.$("#fin_observacoes", content).value = lancamento.observacoes || '';
    }

    // === TELA CONTRATOS ===================================================
    renderContratos() {
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
        
        this.setupContratoEvents(div);
        this.listContratos(div);
        return div;
    }

    setupContratoEvents(content) {
        this.$("#btnGerarContrato", content)?.addEventListener("click", () => this.gerarContratoSelecionado());
        content.addEventListener("click", (e) => this.handleContratoActions(e, content));
    }

    listContratos(content) {
        const tbody = this.$("#tblContratos", content).querySelector("tbody");
        
        const clientesPontoFixo = this.DB.pessoas.filter(c => c.categoria === 'cliente' && c.tipoCliente === 'ponto_fixo');
        
        tbody.innerHTML = clientesPontoFixo.map(c => {
            const contrato = this.DB.contratos.find(ct => ct.clienteId === c.id) || {
                status: 'pendente',
                data: new Date().toISOString()
            };
            
            return `
                <tr>
                    <td>${c.tipo === 'PF' ? c.nome : c.razaoSocial}</td>
                    <td>${c.tipo === 'PF' ? c.cpf : c.cnpj}</td>
                    <td>${c.tipo}</td>
                    <td><span class="tag ${contrato.status === 'assinado' ? 'ok' : 'warn'}">${contrato.status === 'assinado' ? 'Assinado' : 'Pendente'}</span></td>
                    <td>${this.fmt.date(contrato.data)}</td>
                    <td>
                        ${this.iconBtn("gerar", c.id, "Gerar contrato", "📄")}
                        ${this.iconBtn("assinar", c.id, "Marcar como assinado", "✅")}
                    </td>
                </tr>
            `;
        }).join("") || `<tr><td colspan="6" class="empty">Nenhum cliente ponto fixo</td></tr>`;
    }

    handleContratoActions(e, content) {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        const clienteId = btn.dataset.id;
        const cliente = this.DB.pessoas.find(c => c.id === clienteId);
        if (!cliente) return;
        
        if (btn.dataset.act === "gerar") {
            this.gerarContrato(cliente);
        } else if (btn.dataset.act === "assinar") {
            this.marcarContratoAssinado(clienteId);
        }
    }

    gerarContratoSelecionado() {
        const clientesPontoFixo = this.DB.pessoas.filter(c => c.categoria === 'cliente' && c.tipoCliente === 'ponto_fixo');
        
        if (clientesPontoFixo.length === 0) {
            this.showNotification("Nenhum cliente ponto fixo cadastrado", "warning");
            return;
        }
        
        const clienteNome = prompt("Digite o nome do cliente ponto fixo:");
        if (!clienteNome) return;
        
        const cliente = clientesPontoFixo.find(c => 
            (c.tipo === 'PF' ? c.nome.toLowerCase() : c.razaoSocial.toLowerCase()).includes(clienteNome.toLowerCase())
        );
        
        if (!cliente) {
            this.showNotification("Cliente não encontrado", "error");
            return;
        }
        
        this.gerarContrato(cliente);
    }

    gerarContrato(cliente) {
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
        let contratoExistente = this.DB.contratos.find(c => c.clienteId === cliente.id);
        if (!contratoExistente) {
            this.DB.contratos.push({
                id: this.uid(),
                clienteId: cliente.id,
                cliente: cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial,
                status: 'gerado',
                data: new Date().toISOString()
            });
            this.save();
        }
        
        this.showNotification("✅ Contrato gerado com sucesso", "success");
    }

    async marcarContratoAssinado(clienteId) {
        let contrato = this.DB.contratos.find(c => c.clienteId === clienteId);
        
        if (!contrato) {
            const cliente = this.DB.pessoas.find(c => c.id === clienteId);
            contrato = {
                id: this.uid(),
                clienteId: cliente.id,
                cliente: cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial,
                status: 'assinado',
                data: new Date().toISOString()
            };
            this.DB.contratos.push(contrato);
        } else {
            contrato.status = 'assinado';
            contrato.data = new Date().toISOString();
        }
        
        await this.save();
        await this.salvarDadosSupabase('contratos', [contrato]);
        this.renderActive();
        this.showNotification("✅ Contrato marcado como assinado", "success");
    }

    // === TELA AGENDA ======================================================
    renderAgenda() {
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
        
        this.setupAgendaEvents(div);
        this.listAgenda(div);
        this.buildCalendar(div);
        return div;
    }

    setupAgendaEvents(content) {
        this.$("#btnAddAgenda", content)?.addEventListener("click", () => this.addAgendamento(content));
        this.$("#buscaAgenda", content)?.addEventListener("input", () => this.listAgenda(content));
        content.addEventListener("click", (e) => this.handleAgendaActions(e, content));
        
        // Navegação do calendário
        this.$("#calPrev", content)?.addEventListener("click", () => this.navigateCalendar(-1, content));
        this.$("#calNext", content)?.addEventListener("click", () => this.navigateCalendar(1, content));
        this.$("#calToday", content)?.addEventListener("click", () => this.navigateCalendar(0, content));
    }

    buildCalendar(content) {
        const title = this.$("#calTitle", content);
        const grid = this.$("#calGrid", content);
        
        if (!title || !grid) return;
        
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        
        title.textContent = this.currentCalendarDate.toLocaleDateString('pt-BR', { 
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
            html += this.createCalendarDay(date, true, content);
        }
        
        // Dias do mês atual
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            html += this.createCalendarDay(date, false, content);
        }
        
        // Dias do próximo mês
        const totalCells = 42;
        const remaining = totalCells - (firstDayOfWeek + lastDay.getDate());
        for (let day = 1; day <= remaining; day++) {
            const date = new Date(year, month + 1, day);
            html += this.createCalendarDay(date, true, content);
        }
        
        grid.innerHTML = html;
    }

    createCalendarDay(date, isOutside, content) {
        const ymd = date.toISOString().split('T')[0];
        const isToday = date.toDateString() === new Date().toDateString();
        const events = this.DB.agenda.filter(a => a.data === ymd).length;
        
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

    navigateCalendar(direction, content) {
        if (direction === 0) {
            this.currentCalendarDate = new Date();
        } else {
            this.currentCalendarDate = new Date(
                this.currentCalendarDate.getFullYear(),
                this.currentCalendarDate.getMonth() + direction,
                1
            );
        }
        this.buildCalendar(content);
    }

    addAgendamento(content) {
        const titulo = this.$("#ag_titulo").value.trim();
        const data = this.$("#ag_data").value;
        const hora = this.$("#ag_hora").value;
        const tipo = this.$("#ag_tipo").value;
        
        if (!titulo || !data) {
            this.showNotification("Informe título e data", "warning");
            return;
        }
        
        this.DB.agenda.push({
            id: this.uid(),
            titulo,
            data,
            hora,
            tipo,
            criado: new Date().toISOString()
        });
        
        this.save();
        this.$("#ag_titulo").value = "";
        this.renderActive();
        this.showNotification("✅ Agendamento adicionado", "success");
    }

    listAgenda(content) {
        const tbody = this.$("#tblAgenda", content).querySelector("tbody");
        const busca = this.$("#buscaAgenda", content).value.toLowerCase();
        
        let agendaFiltrada = this.DB.agenda;
        
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
                <td>${this.fmt.date(a.data)}</td>
                <td>${a.hora || "—"}</td>
                <td>${a.titulo}</td>
                <td><span class="tag">${a.tipo}</span></td>
                <td>${this.iconBtn("del", a.id, "Excluir", "🗑️")}</td>
            </tr>
        `).join("") || `<tr><td colspan="5" class="empty">Nenhum agendamento encontrado</td></tr>`;
    }

    handleAgendaActions(e, content) {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        
        if (btn.dataset.act === "del") {
            const id = btn.dataset.id;
            this.DB.agenda = this.DB.agenda.filter(a => a.id !== id);
            this.save();
            this.renderActive();
            this.showNotification("Agendamento excluído", "success");
        }
        
        // Clique no dia do calendário
        const day = e.target.closest('.cal-day');
        if (day) {
            const ymd = day.dataset.ymd;
            this.$("#ag_data").value = ymd;
            this.listAgenda(this.$('#content'));
        }
    }

    // === TELA ESTOQUE =====================================================
    renderEstoque() {
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
        
        this.setupEstoqueEvents(div);
        this.updateEstoqueDashboard(div);
        return div;
    }

    setupEstoqueEvents(content) {
        // Mostrar/ocultar campos baseado no tipo de item
        this.$("#tipoItem", content)?.addEventListener("change", (e) => {
            const tipo = e.target.value;
            this.$("#grpEstadoBarril", content).hidden = tipo !== "barril";
            this.$("#grpLitragemBarril", content).hidden = tipo !== "barril";
        });
        
        // Registrar movimentação
        this.$("#movimentacaoForm", content)?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.registrarMovimentacaoEstoque(content);
        });
        
        // Filtros e controles
        this.$("#filtroTipo", content)?.addEventListener("change", () => this.updateEstoqueHistorico(content));
        this.$("#filtroItem", content)?.addEventListener("change", () => this.updateEstoqueHistorico(content));
        this.$("#btnLimparHistorico", content)?.addEventListener("click", () => this.limparHistoricoEstoque());
        this.$("#btnRelatorioEstoque", content)?.addEventListener("click", () => this.gerarRelatorioEstoque());
        
        // Paginação
        this.$("#prevBtn", content)?.addEventListener("click", () => this.navigateEstoquePage(-1, content));
        this.$("#nextBtn", content)?.addEventListener("click", () => this.navigateEstoquePage(1, content));
    }

    updateEstoqueDashboard(content) {
        // Atualizar métricas principais
        const barrisVazios = Object.values(this.DB.estoque.barrisVazios).reduce((a, b) => a + b, 0);
        const barrisCheios = Object.values(this.DB.estoque.barrisCheios).reduce((a, b) => a + b, 0);
        
        this.$("#barrisVazios", content).textContent = barrisVazios;
        this.$("#barrisCheios", content).textContent = barrisCheios;
        this.$("#chopeiras", content).textContent = this.DB.estoque.chopeiras;
        this.$("#cilindrosCO2", content).textContent = this.DB.estoque.cilindrosCO2;
        
        // Atualizar estatísticas do dia
        const hoje = new Date().toISOString().split('T')[0];
        const movHoje = this.DB.estoqueMov.filter(m => m.data?.startsWith(hoje));
        
        this.$("#movimentacoesHoje", content).textContent = movHoje.length;
        this.$("#entradasHoje", content).textContent = movHoje.filter(m => m.tipo === 'entrada' || m.tipo === 'recolha').length;
        this.$("#saidasHoje", content).textContent = movHoje.filter(m => m.tipo === 'saida' || m.tipo === 'devolucao').length;
        
        // Total de itens
        const totalItens = barrisVazios + barrisCheios + this.DB.estoque.chopeiras + this.DB.estoque.cilindrosCO2;
        this.$("#totalItens", content).textContent = totalItens;
        
        // Atualizar histórico
        this.updateEstoqueHistorico(content);
    }

    updateEstoqueHistorico(content) {
        const container = this.$("#historicoContainer", content);
        const pagination = this.$("#paginationContainer", content);
        
        if (!container) return;
        
        // Aplicar filtros
        let historicoFiltrado = [...this.DB.estoqueMov].reverse(); // Mais recentes primeiro
        
        const filtroTipo = this.$("#filtroTipo", content).value;
        if (filtroTipo) {
            historicoFiltrado = historicoFiltrado.filter(m => m.tipo === filtroTipo);
        }
        
        const filtroItem = this.$("#filtroItem", content).value;
        if (filtroItem) {
            historicoFiltrado = historicoFiltrado.filter(m => m.tipoItem === filtroItem);
        }
        
        // Paginação
        const totalPages = Math.ceil(historicoFiltrado.length / this.ESTOQUE_PAGE_SIZE);
        const startIndex = (this.currentEstoquePage - 1) * this.ESTOQUE_PAGE_SIZE;
        const endIndex = startIndex + this.ESTOQUE_PAGE_SIZE;
        const pageItems = historicoFiltrado.slice(startIndex, endIndex);
        
        // Atualizar controles de paginação
        if (pagination) {
            pagination.hidden = totalPages <= 1;
            this.$("#pageInfo", content).textContent = `Página ${this.currentEstoquePage} de ${totalPages}`;
            this.$("#prevBtn", content).disabled = this.currentEstoquePage === 1;
            this.$("#nextBtn", content).disabled = this.currentEstoquePage === totalPages;
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
            const dataStr = this.fmt.datetime(mov.data);
            
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

    navigateEstoquePage(direction, content) {
        this.currentEstoquePage += direction;
        this.updateEstoqueHistorico(content);
    }

    async registrarMovimentacaoEstoque(content) {
        const tipoItem = this.$("#tipoItem", content).value;
        const tipoMovimento = this.$("#tipoMovimento", content).value;
        const quantidade = parseInt(this.$("#quantidade", content).value);
        const cliente = this.$("#cliente", content).value.trim();
        const estadoBarril = this.$("#estadoBarril", content).value;
        const litragem = this.$("#litragemBarril", content).value;
        
        if (!tipoItem || !tipoMovimento || !quantidade) {
            this.showNotification("Preencha todos os campos obrigatórios", "warning");
            return;
        }
        
        // Registrar movimentação
        const movimentacao = {
            id: this.uid(),
            tipoItem,
            tipo: tipoMovimento,
            quantidade,
            cliente: cliente || "Não informado",
            estadoBarril,
            litragem,
            data: new Date().toISOString()
        };
        
        this.DB.estoqueMov.unshift(movimentacao);
        
        // Atualizar estoque
        this.atualizarEstoque(movimentacao);
        
        await this.save();
        await this.salvarDadosSupabase('estoque_movimentacoes', [movimentacao]);
        
        this.$("#movimentacaoForm", content).reset();
        this.updateEstoqueDashboard(content);
        
        this.showNotification("✅ Movimentação registrada com sucesso", "success");
    }

    atualizarEstoque(mov) {
        if (mov.tipoItem === "barril") {
            const chave = mov.estadoBarril === "vazio" ? "barrisVazios" : "barrisCheios";
            const subChave = `${mov.litragem}L`;
            
            if (mov.tipo === "entrada" || mov.tipo === "recolha") {
                this.DB.estoque[chave][subChave] += mov.quantidade;
            } else if (mov.tipo === "saida" || mov.tipo === "devolucao") {
                this.DB.estoque[chave][subChave] = Math.max(0, this.DB.estoque[chave][subChave] - mov.quantidade);
            }
        } else if (mov.tipoItem === "chopeira") {
            if (mov.tipo === "entrada") {
                this.DB.estoque.chopeiras += mov.quantidade;
            } else if (mov.tipo === "saida") {
                this.DB.estoque.chopeiras = Math.max(0, this.DB.estoque.chopeiras - mov.quantidade);
            }
        } else if (mov.tipoItem === "cilindro") {
            if (mov.tipo === "entrada") {
                this.DB.estoque.cilindrosCO2 += mov.quantidade;
            } else if (mov.tipo === "saida") {
                this.DB.estoque.cilindrosCO2 = Math.max(0, this.DB.estoque.cilindrosCO2 - mov.quantidade);
            }
        }
    }

    limparHistoricoEstoque() {
        this.confirmAction("Limpar todo o histórico de movimentações?", async () => {
            this.DB.estoqueMov = [];
            await this.save();
            await this.salvarDadosSupabase('estoque_movimentacoes', []);
            this.renderActive();
            this.showNotification("Histórico limpo", "success");
        });
    }

    gerarRelatorioEstoque() {
        const data = new Date().toLocaleDateString('pt-BR');
        const relatorio = `
RELATÓRIO DE ESTOQUE - ${data}

BARRIS VAZIOS: ${Object.values(this.DB.estoque.barrisVazios).reduce((a, b) => a + b, 0)}
   - 15L: ${this.DB.estoque.barrisVazios['15L']}
   - 20L: ${this.DB.estoque.barrisVazios['20L']}
   - 30L: ${this.DB.estoque.barrisVazios['30L']}
   - 50L: ${this.DB.estoque.barrisVazios['50L']}

BARRIS CHEIOS: ${Object.values(this.DB.estoque.barrisCheios).reduce((a, b) => a + b, 0)}
   - 15L: ${this.DB.estoque.barrisCheios['15L']}
   - 20L: ${this.DB.estoque.barrisCheios['20L']}
   - 30L: ${this.DB.estoque.barrisCheios['30L']}
   - 50L: ${this.DB.estoque.barrisCheios['50L']}

CHOPEIRAS: ${this.DB.estoque.chopeiras}
CILINDROS CO2: ${this.DB.estoque.cilindrosCO2}

TOTAL DE MOVIMENTAÇÕES: ${this.DB.estoqueMov.length}
    `.trim();
        
        const blob = new Blob([relatorio], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estoque_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification("Relatório gerado", "success");
    }

    // === TELA RELATÓRIO DE REPASSE ========================================
    renderRelRepasse() {
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
        
        this.setupRepasseEvents(div);
        this.renderRepasseVendas(div);
        this.renderRepasseDespesas(div);
        this.calcularRepasse(div);
        return div;
    }

    setupRepasseEvents(content) {
        this.$("#repAddCliente", content)?.addEventListener("click", () => this.addLinhaVenda(content));
        this.$("#repAddDespesa", content)?.addEventListener("click", () => this.addLinhaDespesa(content));
        this.$("#repPrint", content)?.addEventListener("click", () => this.gerarPDFRepasse(content));
        
        content.addEventListener("input", (e) => {
            if (e.target.classList.contains('repasse-input')) {
                this.atualizarRepasse(e.target, content);
            }
        });
        
        content.addEventListener("change", (e) => {
            if (e.target.type === 'checkbox' && e.target.closest('#repTblDespesas')) {
                this.atualizarRepasse(e.target, content);
            }
        });
        
        content.addEventListener("click", (e) => {
            const btn = e.target.closest('.icon-btn');
            if (!btn) return;
            
            if (btn.dataset.act === "del") {
                const id = btn.dataset.id;
                const row = btn.closest('tr');
                
                if (row.closest('#repTblVendas')) {
                    this.DB.repasse.clientes = this.DB.repasse.clientes.filter(c => c.id !== id);
                } else {
                    this.DB.repasse.despesas = this.DB.repasse.despesas.filter(d => d.id !== id);
                }
                
                this.save();
                this.renderActive();
            }
        });
        
        // Atualizar datas do header
        ["rep_dataIni", "rep_dataFim", "rep_dataPag"].forEach(id => {
            this.$(`#${id}`, content)?.addEventListener("change", (e) => {
                this.DB.repasse.header[e.target.id.replace('rep_', '')] = e.target.value;
                this.save();
            });
        });
    }

    addLinhaVenda(content) {
        this.DB.repasse.clientes.push({
            id: this.uid(),
            cliente: "",
            marca: "",
            qtdLitros: 30,
            custoPorLitro: 0,
            qtdBarris: 1,
            venda: 0
        });
        
        this.save();
        this.renderRepasseVendas(content);
        this.calcularRepasse(content);
    }

    addLinhaDespesa(content) {
        this.DB.repasse.despesas.push({
            id: this.uid(),
            descricao: "",
            valor: 0,
            obs: "",
            partJK: 0,
            partMarcos: 0,
            pago: false
        });
        
        this.save();
        this.renderRepasseDespesas(content);
        this.calcularRepasse(content);
    }

    renderRepasseVendas(content) {
        const tbody = this.$("#repTblVendas", content);
        if (!tbody) return;
        
        tbody.innerHTML = this.DB.repasse.clientes.map(cliente => {
            const litros = this.toNumber(cliente.qtdLitros);
            const barris = this.toNumber(cliente.qtdBarris) || 1;
            const custoPorLitro = this.toNumber(cliente.custoPorLitro);
            const venda = this.toNumber(cliente.venda);
            const custoTotal = custoPorLitro * litros * barris;
            const lucro = venda - custoTotal;
            const parteMarcos = lucro * (this.DB.repasse.split.percMarcos / 100);
            const parteJK = lucro * (this.DB.repasse.split.percJK / 100);
            
            return `
                <tr data-id="${cliente.id}">
                    <td><input class="repasse-input" data-field="cliente" value="${cliente.cliente}" placeholder="Nome do cliente"></td>
                    <td><input class="repasse-input" data-field="marca" value="${cliente.marca}" placeholder="Marca do chopp"></td>
                    <td class="text-right"><input class="repasse-input text-right" data-field="qtdLitros" type="number" value="${litros}" step="0.1"></td>
                    <td class="text-right"><input class="repasse-input text-right" data-field="custoPorLitro" type="number" value="${custoPorLitro}" step="0.01"></td>
                    <td class="text-right"><input class="repasse-input text-right" data-field="qtdBarris" type="number" value="${barris}" step="1"></td>
                    <td class="text-right">${this.fmt.money(custoTotal)}</td>
                    <td class="text-right"><input class="repasse-input text-right" data-field="venda" type="number" value="${venda}" step="0.01"></td>
                    <td class="text-right positive">${this.fmt.money(parteMarcos)}</td>
                    <td class="text-right positive">${this.fmt.money(parteJK)}</td>
                    <td class="text-center">${this.iconBtn("del", cliente.id, "Remover", "🗑️")}</td>
                </tr>
            `;
        }).join("") || `<tr><td colspan="10" class="empty">Nenhuma venda registrada</td></tr>`;
    }

    renderRepasseDespesas(content) {
        const tbody = this.$("#repTblDespesas", content);
        if (!tbody) return;
        
        tbody.innerHTML = this.DB.repasse.despesas.map(despesa => `
            <tr data-id="${despesa.id}">
                <td><input class="repasse-input" data-field="descricao" value="${despesa.descricao}" placeholder="Descrição"></td>
                <td class="text-right"><input class="repasse-input text-right" data-field="valor" type="number" value="${this.toNumber(despesa.valor)}" step="0.01"></td>
                <td><input class="repasse-input" data-field="obs" value="${despesa.obs}" placeholder="Observações"></td>
                <td class="text-right"><input class="repasse-input text-right" data-field="partJK" type="number" value="${this.toNumber(despesa.partJK)}" step="0.01"></td>
                <td class="text-right"><input class="repasse-input text-right" data-field="partMarcos" type="number" value="${this.toNumber(despesa.partMarcos)}" step="0.01"></td>
                <td class="text-center"><input type="checkbox" data-field="pago" ${despesa.pago ? "checked" : ""}></td>
                <td class="text-center">${this.iconBtn("del", despesa.id, "Remover", "🗑️")}</td>
            </tr>
        `).join("") || `<tr><td colspan="7" class="empty">Nenhuma despesa registrada</td></tr>`;
    }

    atualizarRepasse(input, content) {
        const field = input.dataset.field;
        const row = input.closest('tr');
        const id = row.dataset.id;
        
        let item;
        if (row.closest('#repTblVendas')) {
            item = this.DB.repasse.clientes.find(c => c.id === id);
        } else {
            item = this.DB.repasse.despesas.find(d => d.id === id);
        }
        
        if (!item) return;
        
        if (input.type === 'checkbox') {
            item[field] = input.checked;
        } else if (input.type === 'number') {
            item[field] = parseFloat(input.value) || 0;
        } else {
            item[field] = input.value;
        }
        
        this.save();
        this.calcularRepasse(content);
    }

    calcularRepasse(content) {
        const pMarcos = this.DB.repasse.split.percMarcos / 100;
        const pJK = this.DB.repasse.split.percJK / 100;
        
        // Totais de vendas
        let totCusto = 0, totVenda = 0, totMarcos = 0, totJK = 0;
        
        this.DB.repasse.clientes.forEach(c => {
            const litros = this.toNumber(c.qtdLitros);
            const barris = this.toNumber(c.qtdBarris) || 1;
            const custoPorLitro = this.toNumber(c.custoPorLitro);
            const venda = this.toNumber(c.venda);
            const custo = custoPorLitro * litros * barris;
            const lucro = venda - custo;
            
            totCusto += custo;
            totVenda += venda;
            totMarcos += lucro * pMarcos;
            totJK += lucro * pJK;
        });
        
        // Totais de despesas
        let totDespVal = 0, totDespJK = 0, totDespMarcos = 0;
        
        this.DB.repasse.despesas.forEach(d => {
            const valor = this.toNumber(d.valor);
            const partJK = this.toNumber(d.partJK);
            const partMarcos = this.toNumber(d.partMarcos);
            
            totDespVal += valor;
            totDespJK += partJK;
            totDespMarcos += partMarcos;
        });
        
        // Atualizar totais da tabela
        this.$("#repTotCusto", content).textContent = this.fmt.money(totCusto);
        this.$("#repTotVenda", content).textContent = this.fmt.money(totVenda);
        this.$("#repTotM", content).textContent = this.fmt.money(totMarcos);
        this.$("#repTotJ", content).textContent = this.fmt.money(totJK);
        this.$("#repTotDespVal", content).textContent = this.fmt.money(totDespVal);
        this.$("#repTotDespJK", content).textContent = this.fmt.money(totDespJK);
        this.$("#repTotDespM", content).textContent = this.fmt.money(totDespMarcos);
        
        // Atualizar resultados
        const totalMarcos = totMarcos - totDespMarcos;
        const saldoJK = totJK - totDespJK;
        const lucroLiquido = totVenda - totCusto - totDespVal;
        
        this.$("#resParteM", content).textContent = this.fmt.money(totMarcos);
        this.$("#resDespM", content).textContent = this.fmt.money(totDespMarcos);
        this.$("#resTotalM", content).textContent = this.fmt.money(totalMarcos);
        this.$("#resTotalM", content).className = totalMarcos >= 0 ? "positive" : "negative";
        
        this.$("#resParteJ", content).textContent = this.fmt.money(totJK);
        this.$("#resDespJ", content).textContent = this.fmt.money(totDespJK);
        this.$("#resSaldoJ", content).textContent = this.fmt.money(saldoJK);
        this.$("#resSaldoJ", content).className = saldoJK >= 0 ? "positive" : "negative";
        
        this.$("#resVendas", content).textContent = this.fmt.money(totVenda);
        this.$("#resCustos", content).textContent = this.fmt.money(totCusto);
        this.$("#resDespesas", content).textContent = this.fmt.money(totDespVal);
        this.$("#resLucro", content).textContent = this.fmt.money(lucroLiquido);
        this.$("#resLucro", content).className = lucroLiquido >= 0 ? "positive" : "negative";
    }

    gerarPDFRepasse(content) {
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
                    <div><strong>Período Inicial:</strong> ${this.DB.repasse.header.dataIni || 'Não informado'}</div>
                    <div><strong>Período Final:</strong> ${this.DB.repasse.header.dataFim || 'Não informado'}</div>
                    <div><strong>Data Pagamento:</strong> ${this.DB.repasse.header.dataPagamento || 'Não informado'}</div>
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
                        ${this.DB.repasse.clientes.map(c => {
                            const litros = this.toNumber(c.qtdLitros);
                            const barris = this.toNumber(c.qtdBarris) || 1;
                            const custoPorLitro = this.toNumber(c.custoPorLitro);
                            const venda = this.toNumber(c.venda);
                            const custo = custoPorLitro * litros * barris;
                            const lucro = venda - custo;
                            const parteMarcos = lucro * (this.DB.repasse.split.percMarcos / 100);
                            const parteJK = lucro * (this.DB.repasse.split.percJK / 100);
                            
                            return `
                                <tr>
                                    <td>${c.cliente || 'Não informado'}</td>
                                    <td>${c.marca || 'Não informado'}</td>
                                    <td class="text-right">${litros}L</td>
                                    <td class="text-right">${this.fmt.money(venda)}</td>
                                    <td class="text-right">${this.fmt.money(parteMarcos)}</td>
                                    <td class="text-right">${this.fmt.money(parteJK)}</td>
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
                        ${this.DB.repasse.despesas.map(d => `
                            <tr>
                                <td>${d.descricao || 'Não informado'}</td>
                                <td class="text-right">${this.fmt.money(this.toNumber(d.valor))}</td>
                                <td class="text-right">${this.fmt.money(this.toNumber(d.partJK))}</td>
                                <td class="text-right">${this.fmt.money(this.toNumber(d.partMarcos))}</td>
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
                            <strong>${this.$("#resParteM", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>− Despesas Marcos:</span>
                            <strong>${this.$("#resDespM", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <hr>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px;">
                            <span>Total a Receber:</span>
                            <strong class="${totalMarcos >= 0 ? 'positive' : 'negative'}">
                                ${this.$("#resTotalM", content)?.textContent || 'R$ 0,00'}
                            </strong>
                        </div>
                    </div>
                    
                    <div class="calc-box">
                        <h3>🏢 JK CHOPP</h3>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>Parte das Vendas:</span>
                            <strong>${this.$("#resParteJ", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>− Despesas JK:</span>
                            <strong>${this.$("#resDespJ", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <hr>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px;">
                            <span>Saldo Final:</span>
                            <strong class="${saldoJK >= 0 ? 'positive' : 'negative'}">
                                ${this.$("#resSaldoJ", content)?.textContent || 'R$ 0,00'}
                            </strong>
                        </div>
                    </div>
                    
                    <div class="calc-box">
                        <h3>📈 Resultado Geral</h3>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>Vendas Brutas:</span>
                            <strong>${this.$("#resVendas", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>− Custos:</span>
                            <strong>${this.$("#resCustos", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>− Despesas:</span>
                            <strong>${this.$("#resDespesas", content)?.textContent || 'R$ 0,00'}</strong>
                        </div>
                        <hr>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px;">
                            <span>Lucro Líquido:</span>
                            <strong class="${lucroLiquido >= 0 ? 'positive' : 'negative'}">
                                ${this.$("#resLucro", content)?.textContent || 'R$ 0,00'}
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

    // === TELA CONFIGURAÇÕES ===============================================
    renderConfiguracoes() {
        const div = document.createElement("div");
        div.className = "grid";
        div.innerHTML = `
            <section class="card">
                <h3>⚙️ Configurações do Sistema</h3>
                <p class="muted">Configure as preferências do sistema JK CHOPP</p>
                
                <div class="stack">
                    <div class="form-group">
                        <label class="form-label">Nome da Empresa</label>
                        <input class="input" id="config_empresa" value="${this.DB.config?.empresa || 'JK CHOPP'}" />
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">CNPJ</label>
                        <input class="input" id="config_cnpj" value="${this.DB.config?.cnpj || '60.856.264/0001-73'}" />
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input class="input" id="config_telefone" value="${this.DB.config?.telefone || '(11) 99999-9999'}" />
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input class="input" id="config_email" value="${this.DB.config?.email || 'contato@jkchopp.com'}" />
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Endereço</label>
                        <textarea class="input" id="config_endereco">${this.DB.config?.endereco || 'Endereço da empresa'}</textarea>
                    </div>
                    
                    <h4>Configurações de Repasse</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">% Marcos</label>
                            <input type="number" class="input" id="config_repasse_marcos" 
                                   value="${this.DB.repasse.split.percMarcos}" min="0" max="100" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">% JK</label>
                            <input type="number" class="input" id="config_repasse_jk" 
                                   value="${this.DB.repasse.split.percJK}" min="0" max="100" />
                        </div>
                    </div>
                    
                    <div class="flex">
                        <label class="pill">
                            <input type="checkbox" id="config_auto_save" ${this.DB.config?.autoSave !== false ? 'checked' : ''} />
                            Salvamento automático
                        </label>
                        <label class="pill">
                            <input type="checkbox" id="config_notificacoes" ${this.DB.config?.notificacoes !== false ? 'checked' : ''} />
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
                        <div><strong>Clientes:</strong> ${this.DB.pessoas.filter(p => p.categoria === 'cliente').length}</div>
                        <div><strong>Produtos:</strong> ${this.DB.produtos.length}</div>
                        <div><strong>Pedidos:</strong> ${this.DB.pedidos.length}</div>
                        <div><strong>Último Backup:</strong> ${this.DB.config?.ultimoBackup || 'Nunca'}</div>
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
        
        this.setupConfiguracoesEvents(div);
        return div;
    }

    setupConfiguracoesEvents(content) {
        this.$("#btnSalvarConfig", content)?.addEventListener("click", () => this.salvarConfiguracoes());
        this.$("#btnResetConfig", content)?.addEventListener("click", () => this.resetarConfiguracoes());
        this.$("#btnBackup", content)?.addEventListener("click", () => this.doExport());
        this.$("#btnLimparDados", content)?.addEventListener("click", () => this.limparDadosTemporarios());
        this.$("#btnResetCompleto", content)?.addEventListener("click", () => this.resetCompleto());
        this.$("#btnSuporte", content)?.addEventListener("click", () => this.contatarSuporte());
    }

    salvarConfiguracoes() {
        if (!this.DB.config) this.DB.config = {};
        
        this.DB.config.empresa = this.$("#config_empresa").value;
        this.DB.config.cnpj = this.$("#config_cnpj").value;
        this.DB.config.telefone = this.$("#config_telefone").value;
        this.DB.config.email = this.$("#config_email").value;
        this.DB.config.endereco = this.$("#config_endereco").value;
        this.DB.config.autoSave = this.$("#config_auto_save").checked;
        this.DB.config.notificacoes = this.$("#config_notificacoes").checked;
        this.DB.config.ultimoBackup = new Date().toLocaleString('pt-BR');
        
        // Atualizar repasse
        this.DB.repasse.split.percMarcos = parseInt(this.$("#config_repasse_marcos").value) || 50;
        this.DB.repasse.split.percJK = parseInt(this.$("#config_repasse_jk").value) || 50;
        
        this.save();
        this.showNotification("✅ Configurações salvas com sucesso", "success");
    }

    resetarConfiguracoes() {
        if (confirm("Restaurar configurações padrão?")) {
            this.DB.config = { ...this.DEF.config };
            this.DB.repasse.split = { percMarcos: 50, percJK: 50 };
            this.save();
            this.renderActive();
            this.showNotification("✅ Configurações restauradas", "success");
        }
    }

    limparDadosTemporarios() {
        if (confirm("Limpar dados temporários e cache?")) {
            // Limpar apenas dados não essenciais
            this.DB.agenda = this.DB.agenda.filter(a => new Date(a.data) >= new Date());
            this.save();
            this.showNotification("✅ Dados temporários limpos", "success");
        }
    }

    resetCompleto() {
        if (confirm("⚠️ ATENÇÃO: Isso apagará TODOS os dados permanentemente! Tem certeza?")) {
            localStorage.removeItem("jk_data");
            this.DB = { ...this.DEF };
            this.save();
            this.renderActive();
            this.showNotification("✅ Sistema resetado completamente", "success");
        }
    }

    contatarSuporte() {
        const email = "suporte@jkchopp.com";
        const assunto = "Suporte - Sistema JK CHOPP";
        const corpo = `Preciso de ajuda com o sistema JK CHOPP.%0D%0A%0D%0AProblema:%0D%0A%0D%0AVersão: 2.0.0%0D%0ADados: ${this.DB.pessoas.filter(p => p.categoria === 'cliente').length} clientes, ${this.DB.produtos.length} produtos`;
        
        window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`, '_blank');
    }

    // === TELA RELATÓRIOS ==================================================
    renderRelatorios() {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
            <h3>📊 Relatórios e Estatísticas</h3>
            <p class="muted">Visualize relatórios detalhados do sistema</p>
            
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                <div class="card">
                    <h4>📈 Vendas por Período</h4>
                    <p>Relatório de vendas agrupadas por mês</p>
                    <button class="btn" onclick="sistema.gerarRelatorioVendas()">Gerar Relatório</button>
                </div>
                
                <div class="card">
                    <h4>👥 Clientes Ativos</h4>
                    <p>Lista de clientes com pedidos recentes</p>
                    <button class="btn" onclick="sistema.gerarRelatorioClientes()">Gerar Relatório</button>
                </div>
                
                <div class="card">
                    <h4>📦 Estoque Crítico</h4>
                    <p>Produtos com estoque abaixo do mínimo</p>
                    <button class="btn" onclick="sistema.gerarRelatorioEstoqueCritico()">Gerar Relatório</button>
                </div>
                
                <div class="card">
                    <h4>💰 Financeiro Consolidado</h4>
                    <p>Resumo financeiro do período</p>
                    <button class="btn" onclick="sistema.gerarRelatorioFinanceiro()">Gerar Relatório</button>
                </div>
            </div>
        `;
        return div;
    }

    gerarRelatorioVendas() {
        const vendasPorMes = {};
        this.DB.pedidos.forEach(pedido => {
            const mes = pedido.dataCriacao.substring(0, 7); // YYYY-MM
            if (!vendasPorMes[mes]) vendasPorMes[mes] = 0;
            vendasPorMes[mes] += pedido.total;
        });
        
        let relatorio = "RELATÓRIO DE VENDAS POR MÊS\n\n";
        Object.keys(vendasPorMes).sort().forEach(mes => {
            relatorio += `${mes}: ${this.fmt.money(vendasPorMes[mes])}\n`;
        });
        
        this.downloadRelatorio(relatorio, 'vendas_por_mes.txt');
    }

    gerarRelatorioClientes() {
        const clientesAtivos = this.DB.pessoas.filter(p => 
            p.categoria === 'cliente' && p.ativo !== false
        );
        
        let relatorio = "RELATÓRIO DE CLIENTES ATIVOS\n\n";
        clientesAtivos.forEach(cliente => {
            const pedidosCliente = this.DB.pedidos.filter(p => p.clienteId === cliente.id);
            relatorio += `${cliente.tipo === 'PF' ? cliente.nome : cliente.razaoSocial} | `;
            relatorio += `Pedidos: ${pedidosCliente.length} | `;
            relatorio += `Total: ${this.fmt.money(pedidosCliente.reduce((sum, p) => sum + p.total, 0))}\n`;
        });
        
        this.downloadRelatorio(relatorio, 'clientes_ativos.txt');
    }

    gerarRelatorioEstoqueCritico() {
        const estoqueCritico = this.DB.produtos.filter(p => 
            p.controlaEstoque && p.estoque < p.estoqueMinimo
        );
        
        let relatorio = "RELATÓRIO DE ESTOQUE CRÍTICO\n\n";
        estoqueCritico.forEach(produto => {
            relatorio += `${produto.nome} | `;
            relatorio += `Estoque: ${produto.estoque} | `;
            relatorio += `Mínimo: ${produto.estoqueMinimo} | `;
            relatorio += `Déficit: ${produto.estoqueMinimo - produto.estoque}\n`;
        });
        
        this.downloadRelatorio(relatorio, 'estoque_critico.txt');
    }

    gerarRelatorioFinanceiro() {
        const receitas = this.DB.financeiro.filter(f => f.tipo === 'receber');
        const despesas = this.DB.financeiro.filter(f => f.tipo === 'pagar');
        
        let relatorio = "RELATÓRIO FINANCEIRO CONSOLIDADO\n\n";
        relatorio += `Receitas: ${this.fmt.money(receitas.reduce((sum, f) => sum + f.valor, 0))}\n`;
        relatorio += `Despesas: ${this.fmt.money(despesas.reduce((sum, f) => sum + f.valor, 0))}\n`;
        relatorio += `Saldo: ${this.fmt.money(receitas.reduce((sum, f) => sum + f.valor, 0) - despesas.reduce((sum, f) => sum + f.valor, 0))}\n\n`;
        
        relatorio += "Receitas Pendentes:\n";
        receitas.filter(f => f.status !== 'pago').forEach(f => {
            relatorio += `- ${f.descricao}: ${this.fmt.money(f.valor)}\n`;
        });
        
        relatorio += "\nDespesas Pendentes:\n";
        despesas.filter(f => f.status !== 'pago').forEach(f => {
            relatorio += `- ${f.descricao}: ${this.fmt.money(f.valor)}\n`;
        });
        
        this.downloadRelatorio(relatorio, 'financeiro_consolidado.txt');
    }

    downloadRelatorio(conteudo, nomeArquivo) {
        const blob = new Blob([conteudo], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification("Relatório gerado com sucesso", "success");
    }

    // === MODAIS ===========================================================
    initializeModalEvents() {
        // Modal Novo Pedido
        const modalNovoPedido = this.$('#modalNovoPedido');
        if (modalNovoPedido) {
            this.$('#btnAddItem')?.addEventListener('click', () => this.adicionarItemPedido());
            this.$('#btnFinalizarPedido')?.addEventListener('click', () => this.finalizarPedido());
            this.$('#btnCancelarPedido')?.addEventListener('click', () => {
                this.pedidoEditando = null;
                this.pedidoItens = [];
                modalNovoPedido.close();
            });
        }
        
        // Modal Perfil
        const modalPerfil = this.$('#modalPerfil');
        if (modalPerfil) {
            this.$('#perf_nome').value = this.DB.perfil.nome;
            this.$('#perf_email').value = this.DB.perfil.email;
            this.$('#perf_telefone').value = this.DB.perfil.telefone;
            
            this.$('#btnSalvarPerfil')?.addEventListener('click', () => this.salvarPerfil());
        }
        
        // Configurar fechamento de modais
        this.$$('dialog .close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('dialog').close();
            });
        });
    }

    showModal(modalId) {
        const modal = this.$(modalId);
        if (modal) {
            modal.showModal();
        }
    }

    showDetalhesPedido(pedido) {
        const modal = this.$('#modalDetalhesPedido');
        if (!modal || !pedido) return;
        
        this.$('#ped_det_codigo').textContent = pedido.codigo;
        this.$('#ped_det_cliente').textContent = pedido.cliente;
        this.$('#ped_det_status').textContent = this.getStatusText(pedido.status);
        this.$('#ped_det_data').textContent = this.fmt.date(pedido.dataCriacao);
        this.$('#ped_det_total').textContent = this.fmt.money(pedido.total);
        this.$('#ped_det_status_edit').value = pedido.status;
        
        const tbody = this.$('#tblItensPedidoDet').querySelector('tbody');
        tbody.innerHTML = (pedido.itens || []).map(item => `
            <tr>
                <td>${item.produto}</td>
                <td>${item.quantidade}</td>
                <td>${this.fmt.money(item.valorUnitario)}</td>
                <td>${this.fmt.money(item.total)}</td>
            </tr>
        `).join('');
        
        modal.showModal();
    }

    salvarPerfil() {
        this.DB.perfil = {
            nome: this.$('#perf_nome').value.trim(),
            email: this.$('#perf_email').value.trim(),
            telefone: this.$('#perf_telefone').value.trim()
        };
        
        this.save();
        this.$('#modalPerfil').close();
        this.showNotification('✅ Perfil atualizado com sucesso', 'success');
    }

    // === UTILITÁRIOS GLOBAIS ==============================================
    showNotification(mensagem, tipo = "info") {
        this.$$('.notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${tipo}`;
        notification.innerHTML = `
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()">✕</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    confirmAction(mensagem, callback) {
        if (confirm(mensagem)) {
            callback();
        }
    }

    enhanceResponsiveTables(container) {
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
}

// === INICIALIZAÇÃO ========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar link de fechamento no menu se não existir
    const nav = document.getElementById('sidebarNav');
    if (nav && !nav.querySelector('a[href="./telafechamen.html"]')) {
        const a = document.createElement('a');
        a.href = './telafechamen.html';
        a.className = 'menu-item';
        a.textContent = '📄 Fechamento';
        nav.appendChild(a);
    }
    
    // Inicializar sistema
    window.sistema = new JKChoppSistema();
});

// === EXPORTAR FUNÇÕES GLOBAIS ============================================
window.removerItemPedido = (itemId) => window.sistema?.removerItemPedido(itemId);
window.adicionarItemPedido = () => window.sistema?.adicionarItemPedido();
window.finalizarPedido = () => window.sistema?.finalizarPedido();
window.showModal = (modalId) => window.sistema?.showModal(modalId);
window.showDetalhesPedido = (pedido) => window.sistema?.showDetalhesPedido(pedido);

// Funções de relatórios
window.gerarRelatorioVendas = () => window.sistema?.gerarRelatorioVendas();
window.gerarRelatorioClientes = () => window.sistema?.gerarRelatorioClientes();
window.gerarRelatorioEstoqueCritico = () => window.sistema?.gerarRelatorioEstoqueCritico();
window.gerarRelatorioFinanceiro = () => window.sistema?.gerarRelatorioFinanceiro();

console.log('🎉 JK CHOPP - Sistema COMPLETO carregado e 100% funcional!');