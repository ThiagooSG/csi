const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3010';

export interface Usuario {
    id: number;
    nome: string;
    login: string;
    admin: number;
    ativo: number;
    permissoes?: string[];
}

export interface LoginResponse {
    success: boolean;
    user?: Usuario;
    accessToken?: string;
    message: string;
}

export interface RefreshResponse {
    success: boolean;
    accessToken?: string;
    message?: string;
}

// Função de LOGIN
export async function login(login: string, senha: string): Promise<LoginResponse> {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ login, senha }),
        });

        const data = await response.json();

        if (data.success && data.accessToken) {
            setAccessToken(data.accessToken);
            setUsuario(data.user);
        }
        return data;
    } catch (error) {
        console.error('Erro no login:', error);
        return { success: false, message: 'Erro de conexão com o servidor' };
    }
}

// Função para renovar o token
export async function refreshToken(): Promise<RefreshResponse> {
    try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        const data = await response.json();
        if (data.success && data.accessToken) {
            setAccessToken(data.accessToken);
        }
        return data;
    } catch (error) {
        console.error('Erro no refresh:', error);
        return { success: false, message: 'Erro ao renovar token' };
    }
}

// Função de LOGOUT
export async function logout(): Promise<void> {
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch (error) {
        console.error('Erro no logout:', error);
    } finally {
        clearAuthData();
    }
}

// Função para verificar se o token é válido no servidor
export async function verifyToken(): Promise<boolean> {
    const token = getAccessToken();
    if (!token) return false;
    try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
            credentials: "include",
        });
        return response.ok;
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        return false;
    }
}

// Funções de gerenciamento de sessão
export function setAccessToken(token: string): void {
    sessionStorage.setItem("accessToken", token);
}

export function getAccessToken(): string | null {
    return sessionStorage.getItem("accessToken");
}

export function setUsuario(usuario: Usuario): void {
    sessionStorage.setItem("usuario", JSON.stringify(usuario));
}

export function getUsuario(): Usuario | null {
    const userData = sessionStorage.getItem("usuario");
    try {
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error("Erro ao parsear dados do usuário:", error);
        return null;
    }
}

export function clearAuthData(): void {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("usuario");
}

export function isAuthenticated(): boolean {
    return !!(getAccessToken() && getUsuario());
}

export function hasPermission(permissionName: string): boolean {
    const usuario = getUsuario();
    if (!usuario || !usuario.permissoes) {
        return false;
    }
    return usuario.permissoes.includes(permissionName);
}