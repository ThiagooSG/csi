// frontend/src/services/authService.ts

export interface Usuario {
    id: number;
    nome: string;
    login: string;
    admin: number;
    ativo: number;
    permissoes?: string[];
}

// Funções que gerenciam o sessionStorage
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
