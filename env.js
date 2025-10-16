/* ==========================================================================
   JK CHOPP — ENV.JS (CONFIGURAÇÃO DE AMBIENTE E SUPABASE)
   ========================================================================== */

// === CONFIGURAÇÃO DO SUPABASE ============================================
window.SUPABASE_URL = 'https://vqklluhzbxngsjpopzxw.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_gG5EAcSXOWk9aPHX1fxxcg_Sm_TCwMa';

// === CONFIGURAÇÕES DO SISTEMA ============================================
window.JK_CONFIG = {
    // Configurações gerais do sistema
    APP_NAME: 'JK CHOPP - Sistema Interno',
    APP_VERSION: '1.0.0',
    APP_BUILD: '2024.09.001',
    
    // Configurações de tema
    DEFAULT_THEME: 'dark',
    THEME_PERSISTENCE: true,
    
    // Configurações de dados
    AUTO_SAVE: true,
    AUTO_SAVE_DELAY: 2000,
    BACKUP_AUTO: false,
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
    
    // Configurações de notificação
    NOTIFICATIONS_ENABLED: true,
    NOTIFICATION_TIMEOUT: 5000,
    
    // Configurações de exportação
    EXPORT_FILENAME_PREFIX: 'jkchopp_backup_',
    EXPORT_DATE_FORMAT: 'YYYY-MM-DD',
    
    // Configurações de validação
    VALIDATE_EMAIL: false,
    VALIDATE_PHONE: true,
    
    // Configurações de UI
    CONFIRM_DELETIONS: true,
    CONFIRM_RESET: true,
    ANIMATIONS_ENABLED: true,
    
    // Configurações específicas do negócio
    BUSINESS: {
        NAME: 'JK CHOPP',
        CNPJ: '60.856.264/0001-73',
        PHONE: '(11) 99999-9999',
        EMAIL: 'contato@jkchopp.com',
        ADDRESS: 'Endereço da empresa'
    },
    
    // Configurações financeiras
    FINANCE: {
        CURRENCY: 'BRL',
        DECIMAL_PLACES: 2,
        THOUSANDS_SEPARATOR: '.',
        DECIMAL_SEPARATOR: ','
    },
    
    // Configurações de repasse
    REPASSE: {
        DEFAULT_SPLIT: {
            percMarcos: 50,
            percJK: 50
        },
        CALCULATION_METHOD: 'profit' // 'profit' ou 'revenue'
    },
    
    // Configurações de estoque
    ESTOQUE: {
        TIPOS_ITEM: ['barril', 'chopeira', 'cilindro'],
        ESTADOS_BARRIL: ['cheio', 'vazio'],
        LITRAGENS_BARRIL: ['15', '20', '30', '50'],
        TIPOS_MOVIMENTO: ['entrada', 'saida', 'recolha', 'devolucao']
    },
    
    // Configurações de clientes
    CLIENTES: {
        TIPOS: ['PF', 'PJ'],
        MASCARA_DOC: {
            PF: '999.999.999-99',
            PJ: '99.999.999/9999-99'
        }
    },
    
    // Configurações de produtos
    PRODUTOS: {
        TIPOS: ['Chopeira', 'Barril', 'Cilindro CO2', 'Produto', 'Outro'],
        CONTROLE_ESTOQUE_PADRAO: true
    },
    
    // Configurações de pedidos
    PEDIDOS: {
        STATUS: ['Aberto', 'Em Atendimento', 'Concluído', 'Recebido'],
        PREFIXO_CODIGO: 'P',
        GERAR_CODIGO_AUTO: true
    },
    
    // Configurações de agenda
    AGENDA: {
        HORARIOS_PADRAO: [
            '08:00', '09:00', '10:00', '11:00', 
            '12:00', '13:00', '14:00', '15:00', 
            '16:00', '17:00', '18:00', '19:00'
        ],
        LEMBRETE_PADRAO: 30 // minutos
    }
};

// === SCHEMA DO BANCO DE DADOS ============================================
window.JK_DB_SCHEMA = {
    // Estrutura esperada das tabelas no Supabase
    TABELAS: {
        CLIENTES: {
            nome: 'clientes',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                nome: { tipo: 'text', obrigatorio: true },
                tipo: { tipo: 'text', valores: ['PF', 'PJ'] },
                doc: { tipo: 'text', unico: true },
                fantasia: { tipo: 'text' },
                contato: { tipo: 'text' },
                email: { tipo: 'text' },
                endereco: { tipo: 'text' },
                fixo: { tipo: 'boolean', padrao: false },
                ativo: { tipo: 'boolean', padrao: true },
                delivery: { tipo: 'boolean', padrao: false },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' },
                atualizado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        PRODUTOS: {
            nome: 'produtos',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                tipo: { tipo: 'text', valores: ['Chopeira', 'Barril', 'Cilindro CO2', 'Produto', 'Outro'] },
                nome: { tipo: 'text', obrigatorio: true },
                codigo: { tipo: 'text', unico: true },
                preco: { tipo: 'decimal', precisao: 10, escala: 2 },
                estoque: { tipo: 'integer', padrao: 0 },
                controle_estoque: { tipo: 'boolean', padrao: true },
                descricao: { tipo: 'text' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' },
                atualizado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        PEDIDOS: {
            nome: 'pedidos',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                codigo: { tipo: 'text', unico: true },
                cliente_id: { tipo: 'uuid', referencia: 'clientes.id' },
                status: { tipo: 'text', valores: ['Aberto', 'Em Atendimento', 'Concluído', 'Recebido'] },
                total: { tipo: 'decimal', precisao: 10, escala: 2 },
                observacoes: { tipo: 'text' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' },
                atualizado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        ITENS_PEDIDO: {
            nome: 'itens_pedido',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                pedido_id: { tipo: 'uuid', referencia: 'pedidos.id' },
                produto_id: { tipo: 'uuid', referencia: 'produtos.id' },
                quantidade: { tipo: 'integer' },
                valor_unitario: { tipo: 'decimal', precisao: 10, escala: 2 },
                total: { tipo: 'decimal', precisao: 10, escala: 2 },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        AGENDA: {
            nome: 'agenda',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                titulo: { tipo: 'text', obrigatorio: true },
                data: { tipo: 'date', obrigatorio: true },
                hora: { tipo: 'time' },
                descricao: { tipo: 'text' },
                cliente_id: { tipo: 'uuid', referencia: 'clientes.id' },
                tipo: { tipo: 'text', valores: ['entrega', 'recolha', 'manutencao', 'reuniao', 'outro'] },
                status: { tipo: 'text', valores: ['agendado', 'confirmado', 'realizado', 'cancelado'] },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        FINANCEIRO: {
            nome: 'financeiro',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                documento: { tipo: 'text', obrigatorio: true },
                descricao: { tipo: 'text' },
                tipo: { tipo: 'text', valores: ['Receber', 'Pagar'] },
                valor: { tipo: 'decimal', precisao: 10, escala: 2 },
                vencimento: { tipo: 'date' },
                status: { tipo: 'text', valores: ['pendente', 'pago', 'atrasado'] },
                cliente_id: { tipo: 'uuid', referencia: 'clientes.id' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        CONTRATOS: {
            nome: 'contratos',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                cliente_id: { tipo: 'uuid', referencia: 'clientes.id' },
                numero: { tipo: 'text', unico: true },
                status: { tipo: 'text', valores: ['Pendente', 'Assinado', 'Cancelado'] },
                data_inicio: { tipo: 'date' },
                data_fim: { tipo: 'date' },
                valor_mensal: { tipo: 'decimal', precisao: 10, escala: 2 },
                termos: { tipo: 'text' },
                arquivo_url: { tipo: 'text' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' },
                atualizado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        ESTOQUE_MOV: {
            nome: 'estoque_movimentacoes',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                tipo_item: { tipo: 'text', valores: ['barril', 'chopeira', 'cilindro'] },
                estado_barril: { tipo: 'text', valores: ['cheio', 'vazio'] },
                litragem_barril: { tipo: 'text', valores: ['15', '20', '30', '50'] },
                tipo_movimento: { tipo: 'text', valores: ['entrada', 'saida', 'recolha', 'devolucao'] },
                quantidade: { tipo: 'integer' },
                cliente_id: { tipo: 'uuid', referencia: 'clientes.id' },
                observacao: { tipo: 'text' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        REPASSE_VENDAS: {
            nome: 'repasse_vendas',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                cliente: { tipo: 'text' },
                marca: { tipo: 'text' },
                quantidade_litros: { tipo: 'decimal', precisao: 10, escala: 2 },
                custo_por_litro: { tipo: 'decimal', precisao: 10, escala: 2 },
                quantidade_barris: { tipo: 'integer' },
                valor_venda: { tipo: 'decimal', precisao: 10, escala: 2 },
                periodo_inicio: { tipo: 'date' },
                periodo_fim: { tipo: 'date' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        },
        
        REPASSE_DESPESAS: {
            nome: 'repasse_despesas',
            campos: {
                id: { tipo: 'uuid', chave_primaria: true },
                descricao: { tipo: 'text' },
                valor_total: { tipo: 'decimal', precisao: 10, escala: 2 },
                observacoes: { tipo: 'text' },
                parte_jk: { tipo: 'decimal', precisao: 10, escala: 2 },
                parte_marcos: { tipo: 'decimal', precisao: 10, escala: 2 },
                pago: { tipo: 'boolean', padrao: false },
                periodo_inicio: { tipo: 'date' },
                periodo_fim: { tipo: 'date' },
                criado_em: { tipo: 'timestamptz', padrao: 'now()' }
            }
        }
    },
    
    // Relações entre tabelas
    RELACOES: {
        PEDIDOS_CLIENTES: {
            tabela: 'pedidos',
            campo: 'cliente_id',
            referencia: 'clientes.id'
        },
        ITENS_PEDIDO_PEDIDOS: {
            tabela: 'itens_pedido',
            campo: 'pedido_id',
            referencia: 'pedidos.id'
        },
        ITENS_PEDIDO_PRODUTOS: {
            tabela: 'itens_pedido',
            campo: 'produto_id',
            referencia: 'produtos.id'
        },
        AGENDA_CLIENTES: {
            tabela: 'agenda',
            campo: 'cliente_id',
            referencia: 'clientes.id'
        },
        FINANCEIRO_CLIENTES: {
            tabela: 'financeiro',
            campo: 'cliente_id',
            referencia: 'clientes.id'
        },
        CONTRATOS_CLIENTES: {
            tabela: 'contratos',
            campo: 'cliente_id',
            referencia: 'clientes.id'
        },
        ESTOQUE_MOV_CLIENTES: {
            tabela: 'estoque_movimentacoes',
            campo: 'cliente_id',
            referencia: 'clientes.id'
        }
    }
};

// === FUNÇÕES DE UTILIDADE DO AMBIENTE ====================================
window.JK_UTILS = {
    /**
     * Valida se as configurações do Supabase estão presentes
     */
    validarConfigSupabase: function() {
        const urlValida = window.SUPABASE_URL && 
                         window.SUPABASE_URL.startsWith('https://') && 
                         window.SUPABASE_URL.includes('.supabase.co');
        
        const keyValida = window.SUPABASE_ANON_KEY && 
                         window.SUPABASE_ANON_KEY.startsWith('sb_');
        
        return {
            sucesso: urlValida && keyValida,
            url: urlValida,
            chave: keyValida,
            mensagem: urlValida && keyValida ? 
                     'Configuração Supabase válida' :
                     `Problemas na configuração: ${!urlValida ? 'URL inválida' : ''} ${!keyValida ? 'Chave inválida' : ''}`
        };
    },
    
    /**
     * Inicializa o cliente Supabase
     */
    inicializarSupabase: function() {
        try {
            if (typeof window.supabase === 'undefined') {
                console.error('Biblioteca Supabase não carregada');
                return null;
            }
            
            const config = this.validarConfigSupabase();
            if (!config.sucesso) {
                console.error('Configuração Supabase inválida:', config.mensagem);
                return null;
            }
            
            const client = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                }
            );
            
            console.log('Cliente Supabase inicializado com sucesso');
            return client;
            
        } catch (error) {
            console.error('Erro ao inicializar Supabase:', error);
            return null;
        }
    },
    
    /**
     * Carrega configurações salvas localmente
     */
    carregarConfiguracoes: function() {
        try {
            const salvo = localStorage.getItem('jk_configuracoes');
            if (salvo) {
                const config = JSON.parse(salvo);
                // Mesclar com configurações padrão
                return { ...window.JK_CONFIG, ...config };
            }
            return window.JK_CONFIG;
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            return window.JK_CONFIG;
        }
    },
    
    /**
     * Salva configurações localmente
     */
    salvarConfiguracoes: function(config) {
        try {
            localStorage.setItem('jk_configuracoes', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            return false;
        }
    },
    
    /**
     * Gera um código único para pedidos
     */
    gerarCodigoPedido: function() {
        const prefixo = window.JK_CONFIG.PEDIDOS.PREFIXO_CODIGO || 'P';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${prefixo}${timestamp}${random}`;
    },
    
    /**
     * Formata valor monetário
     */
    formatarMoeda: function(valor) {
        const config = window.JK_CONFIG.FINANCE;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: config.CURRENCY
        }).format(valor);
    },
    
    /**
     * Valida formato de documento (CPF/CNPJ)
     */
    validarDocumento: function(documento, tipo) {
        if (!documento) return false;
        
        const docLimpo = documento.replace(/\D/g, '');
        
        if (tipo === 'PF') {
            // Validação básica de CPF
            return docLimpo.length === 11;
        } else if (tipo === 'PJ') {
            // Validação básica de CNPJ
            return docLimpo.length === 14;
        }
        
        return false;
    },
    
    /**
     * Aplica máscara a documento baseado no tipo
     */
    mascararDocumento: function(documento, tipo) {
        if (!documento) return '';
        
        const docLimpo = documento.replace(/\D/g, '');
        
        if (tipo === 'PF') {
            // CPF: 000.000.000-00
            return docLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (tipo === 'PJ') {
            // CNPJ: 00.000.000/0000-00
            return docLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        
        return documento;
    },
    
    /**
     * Converte data para formato ISO (YYYY-MM-DD)
     */
    paraDataISO: function(data) {
        if (!data) return '';
        
        if (data instanceof Date) {
            return data.toISOString().split('T')[0];
        }
        
        if (typeof data === 'string') {
            // Tenta converter de formato brasileiro
            const partes = data.split('/');
            if (partes.length === 3) {
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
            return data;
        }
        
        return '';
    },
    
    /**
     * Formata data para exibição (DD/MM/YYYY)
     */
    formatarData: function(data) {
        if (!data) return '';
        
        let dataObj;
        
        if (data instanceof Date) {
            dataObj = data;
        } else if (typeof data === 'string') {
            dataObj = new Date(data);
        } else {
            return '';
        }
        
        return dataObj.toLocaleDateString('pt-BR');
    },
    
    /**
     * Valida se uma string é um email válido
     */
    validarEmail: function(email) {
        if (!window.JK_CONFIG.VALIDATE_EMAIL) return true;
        if (!email) return true; // Email opcional
        
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    /**
     * Valida número de telefone
     */
    validarTelefone: function(telefone) {
        if (!window.JK_CONFIG.VALIDATE_PHONE) return true;
        if (!telefone) return true; // Telefone opcional
        
        const regex = /^(\+\d{1,3})?[\s-]?\(?\d{2,3}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
        return regex.test(telefone.replace(/\s/g, ''));
    },
    
    /**
     * Função de debounce para otimizar performance
     */
    debounce: function(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },
    
    /**
     * Deep clone de objeto
     */
    clonarProfundo: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Mescla dois objetos profundamente
     */
    mesclarObjetos: function(alvo, fonte) {
        for (const key in fonte) {
            if (fonte[key] && typeof fonte[key] === 'object' && !Array.isArray(fonte[key])) {
                if (!alvo[key] || typeof alvo[key] !== 'object') {
                    alvo[key] = {};
                }
                this.mesclarObjetos(alvo[key], fonte[key]);
            } else {
                alvo[key] = fonte[key];
            }
        }
        return alvo;
    }
};

// === INICIALIZAÇÃO DO AMBIENTE ===========================================
window.JK_ENV = {
    inicializado: false,
    supabase: null,
    config: null,
    
    inicializar: function() {
        try {
            console.log('🚀 Inicializando ambiente JK CHOPP...');
            
            // Carregar configurações
            this.config = window.JK_UTILS.carregarConfiguracoes();
            
            // Inicializar tema primeiro
            this.aplicarTema(this.config.DEFAULT_THEME);
            
            // Validar e inicializar Supabase
            const supabaseConfig = window.JK_UTILS.validarConfigSupabase();
            if (supabaseConfig.sucesso) {
                this.supabase = window.JK_UTILS.inicializarSupabase();
                if (this.supabase) {
                    console.log('✅ Supabase configurado com sucesso');
                } else {
                    console.warn('⚠️ Supabase não pôde ser inicializado, usando modo offline');
                }
            } else {
                console.warn('⚠️ Configuração Supabase inválida, usando modo offline');
            }
            
            this.inicializado = true;
            console.log('✅ Ambiente JK CHOPP inicializado com sucesso');
            
            return {
                sucesso: true,
                supabase: !!this.supabase,
                config: this.config
            };
            
        } catch (error) {
            console.error('❌ Erro na inicialização do ambiente:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    },
    
    /**
     * Aplica o tema ao sistema
     */
    aplicarTema: function(tema) {
        const temaValido = ['light', 'dark'].includes(tema);
        const temaAplicar = temaValido ? tema : this.config.DEFAULT_THEME;
        
        document.body.setAttribute('data-theme', temaAplicar);
        
        if (this.config.THEME_PERSISTENCE) {
            localStorage.setItem('jk_theme', temaAplicar);
        }
        
        console.log(`🎨 Tema aplicado: ${temaAplicar}`);
    },
    
    /**
     * Alterna entre temas claro/escuro
     */
    alternarTema: function() {
        const temaAtual = document.body.getAttribute('data-theme') || this.config.DEFAULT_THEME;
        const novoTema = temaAtual === 'light' ? 'dark' : 'light';
        
        this.aplicarTema(novoTema);
        return novoTema;
    },
    
    /**
     * Obtém informações do ambiente
     */
    obterInfo: function() {
        return {
            app: {
                nome: this.config.APP_NAME,
                versao: this.config.APP_VERSION,
                build: this.config.APP_BUILD
            },
            supabase: {
                conectado: !!this.supabase,
                url: window.SUPABASE_URL,
                configurado: window.JK_UTILS.validarConfigSupabase().sucesso
            },
            tema: document.body.getAttribute('data-theme') || this.config.DEFAULT_THEME,
            inicializado: this.inicializado,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Verifica a saúde do sistema
     */
    verificarSaude: function() {
        const checks = {
            localStorage: (() => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch {
                    return false;
                }
            })(),
            
            supabase: !!this.supabase,
            
            config: !!this.config,
            
            tema: document.body.hasAttribute('data-theme')
        };
        
        const todosChecks = Object.values(checks).every(check => check);
        
        return {
            saudavel: todosChecks,
            checks: checks,
            timestamp: new Date().toISOString()
        };
    }
};

// === POLYFILLS E COMPATIBILIDADE =========================================
// Garantir compatibilidade com navegadores mais antigos
if (typeof window.CustomEvent !== "function") {
    window.CustomEvent = function(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    };
}

// Polyfill para Object.entries se necessário
if (!Object.entries) {
    Object.entries = function(obj) {
        const ownProps = Object.keys(obj);
        let i = ownProps.length;
        const resArray = new Array(i);
        while (i--) {
            resArray[i] = [ownProps[i], obj[ownProps[i]]];
        }
        return resArray;
    };
}

// === INICIALIZAÇÃO AUTOMÁTICA ============================================
// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.JK_ENV.inicializar();
        }, 100);
    });
} else {
    setTimeout(() => {
        window.JK_ENV.inicializar();
    }, 100);
}

// === EXPORTAÇÃO PARA USO GLOBAL ==========================================
// Tornar utilitários disponíveis globalmente
window.JK = {
    config: window.JK_CONFIG,
    utils: window.JK_UTILS,
    env: window.JK_ENV,
    db: window.JK_DB_SCHEMA
};

console.log('📦 env.js carregado - Ambiente JK CHOPP pronto para inicialização');

// Export para módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_URL: window.SUPABASE_URL,
        SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY,
        JK_CONFIG: window.JK_CONFIG,
        JK_UTILS: window.JK_UTILS,
        JK_ENV: window.JK_ENV,
        JK_DB_SCHEMA: window.JK_DB_SCHEMA
    };
}