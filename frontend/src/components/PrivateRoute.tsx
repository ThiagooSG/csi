import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated, clearAuthData } from "../services/authService";
import { verifyToken } from "../utils/api";
interface PrivateRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (!isAuthenticated()) {
                setIsValid(false);
                setIsLoading(false);
                return;
            }

            try {
                const tokenValid = await verifyToken();
                if (!tokenValid) {
                    clearAuthData();
                    setIsValid(false);
                } else {
                    setIsValid(true);
                }
            } catch (error) {
                console.error("Erro na verificação de autenticação:", error);
                clearAuthData();
                setIsValid(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
        // A CORREÇÃO ESTÁ AQUI: O array de dependências deve ser vazio `[]`
        // para que este efeito seja executado apenas uma vez.
    }, []);

    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    fontSize: "18px",
                }}
            >
                Verificando autenticação...
            </div>
        );
    }

    if (!isValid) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default PrivateRoute;
