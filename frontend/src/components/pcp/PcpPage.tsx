// src/pages/PCP/PcpPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import Layout from "../Layout/Layout";
import { apiGet } from "../../utils/api";
import PedidoDetalhesModal from "./PedidoDetalhesModal";
import "./PcpPage.css";

interface PedidoResumo {
    PEDIDO_CIC: number;
    NOME_CLIENTE: string;
    DATA_PEDIDO: string; // pode vir ISO string
    STATUS: string;
}
interface Pagination {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    limit?: number;
}

const PcpPage: React.FC = () => {
    const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPedido, setSelectedPedido] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchPedidos = useCallback(async (page: number) => {
        setLoading(true);
        try {
            // apiGet costuma retornar { data: <body> }, por isso o acesso response.data.data abaixo
            const response = await apiGet<{ success: boolean; data: PedidoResumo[]; pagination: Pagination }>(
                `/api/pcp?page=${page}&limit=10`
            );
            if (response?.data?.success) {
                setPedidos(response.data.data || []);
                setPagination(response.data.pagination || null);
            } else {
                setPedidos([]);
                setPagination(null);
            }
        } catch (error) {
            console.error("Erro ao buscar pedidos do PCP", error);
            setPedidos([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPedidos(currentPage);
    }, [currentPage, fetchPedidos]);

    const formatDate = (value?: string) => {
        if (!value) return "N/A";
        const d = new Date(value);
        if (isNaN(d as unknown as number)) return value;
        return d.toLocaleDateString("pt-BR");
    };

    return (
        <Layout>
            <div className="pcp-main-card">
                <div className="pcp-header">
                    <h2>Planejamento e Controle da Produção (PCP)</h2>
                    <p>Lista de pedidos pendentes para análise de produção.</p>
                </div>

                {loading ? (
                    <p>Carregando pedidos...</p>
                ) : pedidos.length === 0 ? (
                    <p>Nenhum pedido encontrado.</p>
                ) : (
                    <div className="pcp-table-wrapper">
                        <table className="pcp-table">
                            <thead>
                                <tr>
                                    <th>Pedido CIC</th>
                                    <th>Cliente</th>
                                    <th>Data do Pedido</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map((pedido) => (
                                    <tr key={pedido.PEDIDO_CIC} onClick={() => setSelectedPedido(pedido.PEDIDO_CIC)}>
                                        <td>{pedido.PEDIDO_CIC}</td>
                                        <td>{pedido.NOME_CLIENTE}</td>
                                        <td>{formatDate(pedido.DATA_PEDIDO)}</td>
                                        <td>
                                            <span className={`status-badge ${pedido.STATUS?.toLowerCase()}`}>{pedido.STATUS}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}>
                            Anterior
                        </button>
                        <span>
                            Página {currentPage} de {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => p + 1)}
                            disabled={currentPage === pagination.totalPages}
                        >
                            Próxima
                        </button>
                    </div>
                )}
            </div>

            {selectedPedido && (
                <PedidoDetalhesModal pedidoCic={selectedPedido} onClose={() => setSelectedPedido(null)} />
            )}
        </Layout>
    );
};

export default PcpPage;