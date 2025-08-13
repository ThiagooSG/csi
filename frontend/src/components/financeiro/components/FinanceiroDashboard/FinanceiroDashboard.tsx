import React, { useEffect, useState, useRef } from "react";
// import { apiGet } from "../../../../utils/api"; // API está comentada para usarmos dados de exemplo
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import "./FinanceiroDashboard.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// --- Interfaces ---
interface DashboardData {
    A_VENCER_HOJE: number;
    A_VENCER_1_DIA: number;
    A_VENCER_3_DIAS: number;
    A_VENCER_5_DIAS: number;
    A_VENCER_10_DIAS: number;
    VENCIDOS_1_DIA: number;
    VENCIDOS_3_DIAS: number;
    VENCIDOS_5_DIAS: number;
    VENCIDOS_10_DIAS: number;
    A_PAGAR_HOJE: number;
    A_PAGAR_1_DIA: number;
    A_PAGAR_3_DIAS: number;
    A_PAGAR_5_DIAS: number;
    A_PAGAR_10_DIAS: number;
    PAGAR_VENCIDO_1_DIA: number;
    PAGAR_VENCIDO_3_DIAS: number;
    PAGAR_VENCIDO_5_DIAS: number;
    PAGAR_VENCIDO_10_DIAS: number;
}
interface DetalheDuplicata {
    NUM_DOCUM: string;
    NOME_CLIENTE: string;
    VALOR_DUP: number;
    VENC_REAL: string;
}

// --- Sub-componente Modal (com dados de exemplo) ---
const DetalhesDuplicatasModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
}> = ({ isOpen, onClose, title }) => {
    if (!isOpen) return null;

    const exampleData: DetalheDuplicata[] = [
        {
            NUM_DOCUM: "12345-A",
            NOME_CLIENTE: "Cliente Exemplo 1",
            VALOR_DUP: 1500.75,
            VENC_REAL: new Date().toISOString(),
        },
        {
            NUM_DOCUM: "67890-B",
            NOME_CLIENTE: "Cliente Exemplo 2",
            VALOR_DUP: 850.2,
            VENC_REAL: new Date().toISOString(),
        },
        {
            NUM_DOCUM: "11223-C",
            NOME_CLIENTE: "Cliente Exemplo 3",
            VALOR_DUP: 2300.0,
            VENC_REAL: new Date().toISOString(),
        },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <div className="details-table-wrapper">
                    <table className="details-table">
                        <thead>
                            <tr>
                                <th>Duplicata</th>
                                <th>Cliente</th>
                                <th>Vencimento</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exampleData.map((dup, index) => (
                                <tr key={`${dup.NUM_DOCUM}-${index}`}>
                                    <td>{dup.NUM_DOCUM}</td>
                                    <td>{dup.NOME_CLIENTE}</td>
                                    <td>{new Date(dup.VENC_REAL).toLocaleDateString("pt-BR")}</td>
                                    <td>
                                        {dup.VALOR_DUP.toLocaleString("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal do Dashboard ---
const FinanceiroDashboard: React.FC = () => {
    const [data] = useState<DashboardData>({
        A_VENCER_HOJE: 12500,
        A_VENCER_1_DIA: 8300,
        A_VENCER_3_DIAS: 15200,
        A_VENCER_5_DIAS: 7500,
        A_VENCER_10_DIAS: 22000,
        VENCIDOS_1_DIA: 4500,
        VENCIDOS_3_DIAS: 6200,
        VENCIDOS_5_DIAS: 3100,
        VENCIDOS_10_DIAS: 8900,
        A_PAGAR_HOJE: 9800,
        A_PAGAR_1_DIA: 4100,
        A_PAGAR_3_DIAS: 11300,
        A_PAGAR_5_DIAS: 6400,
        A_PAGAR_10_DIAS: 18500,
        PAGAR_VENCIDO_1_DIA: 2500,
        PAGAR_VENCIDO_3_DIAS: 1800,
        PAGAR_VENCIDO_5_DIAS: 900,
        PAGAR_VENCIDO_10_DIAS: 3200,
    });
    const [loading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");

    const handleChartClick = (label: string) => {
        setModalTitle(`Detalhes: ${label}`);
        setIsModalOpen(true);
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, font: { size: 16 }, color: "#334155" },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                        }).format(context.parsed.y);
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value: any) {
                        return "R$ " + value.toLocaleString("pt-BR");
                    },
                },
            },
        },
        onClick: (event: any, elements: any, chart: any) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const label = chart.data.labels[index];
                handleChartClick(label);
            }
        },
        onHover: (event: any, chartElement: any) => {
            const target = event.native.target;
            target.style.cursor = chartElement[0] ? "pointer" : "default";
        },
    };

    const aReceberData = {
        labels: ["Hoje", "+1 dia", "+2-3 dias", "+4-5 dias", "+6-10 dias"],
        datasets: [
            {
                data: [
                    data.A_VENCER_HOJE,
                    data.A_VENCER_1_DIA,
                    data.A_VENCER_3_DIAS,
                    data.A_VENCER_5_DIAS,
                    data.A_VENCER_10_DIAS,
                ],
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderColor: "rgba(59, 130, 246, 1)",
                borderWidth: 1,
            },
        ],
    };

    const vencidosData = {
        labels: ["-1 dia", "-2-3 dias", "-4-5 dias", "-6-10 dias"],
        datasets: [
            {
                data: [
                    data.VENCIDOS_1_DIA,
                    data.VENCIDOS_3_DIAS,
                    data.VENCIDOS_5_DIAS,
                    data.VENCIDOS_10_DIAS,
                ],
                backgroundColor: "rgba(239, 68, 68, 0.7)",
                borderColor: "rgba(239, 68, 68, 1)",
                borderWidth: 1,
            },
        ],
    };

    const aPagarData = {
        labels: ["Hoje", "+1 dia", "+2-3 dias", "+4-5 dias", "+6-10 dias"],
        datasets: [
            {
                data: [
                    data.A_PAGAR_HOJE,
                    data.A_PAGAR_1_DIA,
                    data.A_PAGAR_3_DIAS,
                    data.A_PAGAR_5_DIAS,
                    data.A_PAGAR_10_DIAS,
                ],
                backgroundColor: "rgba(245, 158, 11, 0.7)",
                borderColor: "rgba(245, 158, 11, 1)",
                borderWidth: 1,
            },
        ],
    };

    const pagarVencidoData = {
        labels: ["-1 dia", "-2-3 dias", "-4-5 dias", "-6-10 dias"],
        datasets: [
            {
                data: [
                    data.PAGAR_VENCIDO_1_DIA,
                    data.PAGAR_VENCIDO_3_DIAS,
                    data.PAGAR_VENCIDO_5_DIAS,
                    data.PAGAR_VENCIDO_10_DIAS,
                ],
                backgroundColor: "rgba(168, 85, 247, 0.7)",
                borderColor: "rgba(168, 85, 247, 1)",
                borderWidth: 1,
            },
        ],
    };

    if (loading) return <p>Carregando dashboard...</p>;

    return (
        <div className="dashboard-main-card">
            <div className="dashboard-header">
                <h2>Dashboard Financeiro</h2>
                <p>Resumo de títulos a pagar e a receber.</p>
            </div>
            <div className="dashboard-container">
                <div className="dashboard-card">
                    <Bar
                        options={{
                            ...commonOptions,
                            plugins: {
                                ...commonOptions.plugins,
                                title: {
                                    ...commonOptions.plugins.title,
                                    text: "Títulos a Vencer (Receber)",
                                },
                            },
                        }}
                        data={aReceberData}
                    />
                </div>
                <div className="dashboard-card">
                    <Bar
                        options={{
                            ...commonOptions,
                            plugins: {
                                ...commonOptions.plugins,
                                title: {
                                    ...commonOptions.plugins.title,
                                    text: "Títulos Vencidos (Receber)",
                                },
                            },
                        }}
                        data={vencidosData}
                    />
                </div>
                <div className="dashboard-card">
                    <Bar
                        options={{
                            ...commonOptions,
                            plugins: {
                                ...commonOptions.plugins,
                                title: {
                                    ...commonOptions.plugins.title,
                                    text: "Títulos a Pagar",
                                },
                            },
                        }}
                        data={aPagarData}
                    />
                </div>
                <div className="dashboard-card">
                    <Bar
                        options={{
                            ...commonOptions,
                            plugins: {
                                ...commonOptions.plugins,
                                title: {
                                    ...commonOptions.plugins.title,
                                    text: "Títulos a Pagar Vencidos",
                                },
                            },
                        }}
                        data={pagarVencidoData}
                    />
                </div>
            </div>
            <DetalhesDuplicatasModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
            />
        </div>
    );
};

export default FinanceiroDashboard;
