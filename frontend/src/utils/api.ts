import { 
    getAccessToken, 
    refreshToken, 
    setAccessToken, 
    logout, 
    clearAuthData 
} from "../services/authService";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// Wrapper para fetch que gerencia JWT automaticamente
export async function apiFetch(
    input: RequestInfo | URL, 
    init: RequestInit = {}
): Promise<Response> {
    let token = getAccessToken();
    let headers: HeadersInit = { 
        "Content-Type": "application/json",
        ...(init.headers || {}) 
    };

    // Adicionar token se existir
    if (token) {
        headers = { 
            ...headers, 
            Authorization: `Bearer ${token}` 
        };
    }

    // Primeira tentativa
    let response = await fetch(input, { 
        ...init, 
        headers, 
        credentials: "include" 
    });

    // Se receber 401 (não autorizado), tentar refresh
    if (response.status === 401 && token) {
        console.log('Token expirado, tentando refresh...');

        try {
            const refreshResult = await refreshToken();

            if (refreshResult.success && refreshResult.accessToken) {
                // Atualizar headers com novo token
                headers = { 
                    ...headers, 
                    Authorization: `Bearer ${refreshResult.accessToken}` 
                };

                // Tentar novamente com novo token
                response = await fetch(input, { 
                    ...init, 
                    headers, 
                    credentials: "include" 
                });

                console.log('Token renovado com sucesso');
            } else {
                throw new Error('Falha no refresh token');
            }
        } catch (error) {
            console.error('Erro no refresh token:', error);

            // Se refresh falhar, fazer logout
            await logout();

            // Redirecionar para login
            if (typeof window !== 'undefined') {
                window.location.href = "/";
            }

            throw new Error("Sessão expirada. Faça login novamente.");
        }
    }

    return response;
}

// Wrapper para GET requests
export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, { method: 'GET' });
        const data = await response.json();

        return {
            success: response.ok,
            data: response.ok ? data : undefined,
            message: data.message,
            error: response.ok ? undefined : data.message || 'Erro na requisição'
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

// Wrapper para POST requests
export async function apiPost<T = any>(
    url: string, 
    body: any
): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return {
            success: response.ok,
            data: response.ok ? data : undefined,
            message: data.message,
            error: response.ok ? undefined : data.message || 'Erro na requisição'
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

// Wrapper para PUT requests
export async function apiPut<T = any>(
    url: string, 
    body: any
): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return {
            success: response.ok,
            data: response.ok ? data : undefined,
            message: data.message,
            error: response.ok ? undefined : data.message || 'Erro na requisição'
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

// Wrapper para DELETE requests
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
        const response = await apiFetch(url, { method: 'DELETE' });
        const data = await response.json();

        return {
            success: response.ok,
            data: response.ok ? data : undefined,
            message: data.message,
            error: response.ok ? undefined : data.message || 'Erro na requisição'
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}
