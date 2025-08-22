// frontend/src/utils/api.ts

import {
    getAccessToken,
    setAccessToken,
    setUsuario,
    clearAuthData,
    Usuario,
} from "../services/authService";

const API_URL =
    import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3020";

// --- Interfaces de Resposta ---
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface LoginResponse {
    success: boolean;
    user?: Usuario;
    accessToken?: string;
    message: string;
}

// --- Funções de Autenticação ---

// CORREÇÃO: A função agora retorna o objeto ApiResponse completo
export async function login(
    loginStr: string,
    senha: string
): Promise<ApiResponse<LoginResponse>> {
    const response = await apiPost<LoginResponse>("/api/auth/login", {
        login: loginStr,
        senha,
    });

    if (response.success && response.data?.accessToken && response.data?.user) {
        setAccessToken(response.data.accessToken);
        setUsuario(response.data.user);
    }
    return response; // Retorna a resposta completa
}

export async function logout(): Promise<void> {
    try {
        await apiPost("/api/auth/logout", {});
    } catch (error) {
        console.error("Erro no logout:", error);
    } finally {
        clearAuthData();
    }
}

async function refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    return apiPost("/api/auth/refresh", {});
}

export async function verifyToken(): Promise<boolean> {
    try {
        const response = await apiGet("/api/auth/verify");
        return response.success;
    } catch {
        return false;
    }
}

// --- Função de Fetch Genérica ---
async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const fullUrl = `${API_URL}${path}`;
    let token = getAccessToken();

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: "include",
    });

    if (response.status === 401 && token) {
        try {
            console.log("Token expirado, tentando refresh...");
            const refreshResult = await refreshToken();

            if (refreshResult.success && refreshResult.data?.accessToken) {
                setAccessToken(refreshResult.data.accessToken);
                headers.set(
                    "Authorization",
                    `Bearer ${refreshResult.data.accessToken}`
                );
                response = await fetch(fullUrl, {
                    ...options,
                    headers,
                    credentials: "include",
                });
            } else {
                throw new Error("Falha no refresh do token");
            }
        } catch (error) {
            console.error("Erro no refresh do token:", error);
            clearAuthData();
            if (typeof window !== "undefined") {
                window.location.href = "/";
            }
            throw new Error("Sessão expirada. Faça login novamente.");
        }
    }

    return response;
}

// --- Wrappers para os métodos HTTP ---
async function handleApiResponse<T>(
    response: Response
): Promise<ApiResponse<T>> {
    const data = await response.json();
    return {
        success: response.ok,
        // CORREÇÃO: Em caso de erro, o 'data' agora contém a resposta de erro do backend
        data: data,
        message: data.message,
        error: response.ok ? undefined : data.message || "Erro na requisição",
    };
}

export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, { method: "GET" });
        return await handleApiResponse<T>(response);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
        };
    }
}

export async function apiPost<T = any>(
    url: string,
    body: any
): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, {
            method: "POST",
            body: JSON.stringify(body),
        });
        return await handleApiResponse<T>(response);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
        };
    }
}

export async function apiPut<T = any>(
    url: string,
    body: any
): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, {
            method: "PUT",
            body: JSON.stringify(body),
        });
        return await handleApiResponse<T>(response);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
        };
    }
}

export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, { method: "DELETE" });
        return await handleApiResponse<T>(response);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
        };
    }
}
