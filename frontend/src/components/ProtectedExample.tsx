import React, { useEffect, useState } from "react";
import { apiGet } from "../../utils/api";

interface ProtectedData {
    message: string;
    user: any;
}

const ProtectedExample: React.FC = () => {
    const [data, setData] = useState<ProtectedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const fetchProtectedData = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
                const response = await apiGet<ProtectedData>(`${API_URL}/api/protected`);

                if (response.success && response.data) {
                    setData(response.data);
                } else {
                    setError(response.error || "Erro ao carregar dados");
                }
            } catch (err) {
                setError("Erro de conexão");
            } finally {
                setLoading(false);
            }
        };

        fetchProtectedData();
    }, []);

    if (loading) {
        return <div>Carregando dados protegidos...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>Erro: {error}</div>;
    }

    return (
        <div>
            <h2>Dados Protegidos por JWT</h2>
            {data && (
                <div>
                    <p><strong>Mensagem:</strong> {data.message}</p>
                    <p><strong>Usuário:</strong> {JSON.stringify(data.user, null, 2)}</p>
                </div>
            )}
        </div>
    );
};

export default ProtectedExample;
