// auth.js
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // Verificar se usuário está logado
    checkAuth() {
        const user = localStorage.getItem('jk_user');
        const token = localStorage.getItem('jk_token');
        
        if (user && token) {
            this.currentUser = JSON.parse(user);
            this.isAuthenticated = true;
            return true;
        }
        return false;
    }

    // Fazer login
    login(username, password) {
        // Usuários padrão (em produção, isso viria de uma API)
        const users = [
            { id: 1, username: 'admin', password: 'jk#adm25', nome: 'Administrador', nivel: 'admin' },
            { id: 2, username: 'user', password: 'user123', nome: 'Usuário Padrão', nivel: 'user' }
        ];

        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = user;
            this.isAuthenticated = true;
            
            // Salvar no localStorage
            localStorage.setItem('jk_user', JSON.stringify(user));
            localStorage.setItem('jk_token', 'jk_' + Date.now());
            
            return true;
        }
        return false;
    }

    // Fazer logout
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('jk_user');
        localStorage.removeItem('jk_token');
        window.location.reload();
    }

    // Verificar permissões
    hasPermission(nivelRequerido) {
        if (!this.currentUser) return false;
        
        const niveis = { 'user': 1, 'admin': 2 };
        return niveis[this.currentUser.nivel] >= niveis[nivelRequerido];
    }
}

// Instância global
window.authSystem = new AuthSystem();