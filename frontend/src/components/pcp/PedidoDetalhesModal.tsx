import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api';
import "./PcpPage.css"; // Reutiliza o mesmo CSS

// CORREÇÃO: A interface agora corresponde EXATAMENTE às colunas da sua VIEW
interface PedidoDetalhes {
    CLIENTE: number;
    CODREP: number;
    CONDICAO_PAGAMENTO: string;
    DATA_PEDIDO: string;
    GRUPO_ECONOMICO: number;
    GRUPO_EMBARQUE: string;
    MERCADO: string;
    NOME_CLIENTE: string;
    NOME_CONDICAO_PAGAMENTO: string;
    NOME_GRUPO_ECONOMICO: string;
    NOME_PAIS: string;
    NOME_REPRESENTANTE: string;
    PEDIDO_CIC: number;
    QUALIDADE: string;
    STATUS: string;
    PREVISAO_EMBARQUE: string;
    TIPO_MOEDA: string;
    // Adicionei os demais campos que faltavam, baseados na sua lista anterior
    GRUPO_ARTIGO_COMERCIAL: string;
    ITEM_PEDIDO: string;
    REPRESENTANTE: string; // Nome do representante (diferente de NOME_REPRESENTANTE)
    COR_PADRAO: string;
    GRUPO_ARTIGO: string;
    VALORPENDENTE: number;
    DOIS_ROLOS: string;
    DESENHO: string;
    SEMANAENTREGA: string;
    NOME_ARTIGO: string;
    FAMILIA: string;
    CLASSIFICACAO: string;
    EMBALAGEM: string;
    ANOMESENTREGA: string;
    ACABAMENTO: string;
    SORTIMENTO: string;
    ARTIGO: string;
    PEDIDO: string;
    COTTON_FLOW: string;
    DIAENTREGA: string;
    GRUPO: string;
    CODIGO_VARIANTE: string;
    QTDE: number;
    COR: string;
    UNIDADE: string;
}

interface Props {
    pedidoCic: number;
    onClose: () => void;
}

const PedidoDetalhesModal: React.FC<Props> = ({ pedidoCic, onClose }) => {
    const [detalhes, setDetalhes] = useState<PedidoDetalhes | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!pedidoCic) return;
        const fetchDetalhes = async () => {
            setLoading(true);
            try {
                const response = await apiGet<{ data: PedidoDetalhes }>(`/api/pcp/${pedidoCic}`);
                if (response.success && response.data) {
                    // O backend já retorna o objeto de dados diretamente
                    setDetalhes(response.data.data);
                }
            } catch (error) {
                console.error("Erro ao buscar detalhes do pedido", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetalhes();
    }, [pedidoCic]);

    const formatValue = (value: any) => value ?? "N/A";
    const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "N/A";

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Detalhes do Pedido: {pedidoCic}</h3>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>
                {loading ? <p>Carregando detalhes...</p> : detalhes ? (
                    <div className="details-grid-pcp">
                        {/* Bloco 1: Cliente e Pedido */}
                        <div className="detail-item-pcp"><strong>Pedido CIC:</strong><span>{formatValue(detalhes.PEDIDO_CIC)}</span></div>
                        <div className="detail-item-pcp"><strong>Pedido Original:</strong><span>{formatValue(detalhes.PEDIDO)}</span></div>
                        <div className="detail-item-pcp"><strong>Item:</strong><span>{formatValue(detalhes.ITEM_PEDIDO)}</span></div>
                        <div className="detail-item-pcp"><strong>Cliente:</strong><span>{detalhes.CLIENTE} - {formatValue(detalhes.NOME_CLIENTE?.trim())}</span></div>
                        <div className="detail-item-pcp"><strong>Grupo Econômico:</strong><span>{detalhes.GRUPO_ECONOMICO} - {formatValue(detalhes.NOME_GRUPO_ECONOMICO?.trim())}</span></div>
                        <div className="detail-item-pcp"><strong>Representante:</strong><span>{detalhes.CODREP} - {formatValue(detalhes.NOME_REPRESENTANTE?.trim())}</span></div>

                        {/* Bloco 2: Artigo e Qualidade */}
                        <div className="detail-item-pcp"><strong>Artigo:</strong><span>{formatValue(detalhes.ARTIGO)}</span></div>
                        <div className="detail-item-pcp"><strong>Nome do Artigo:</strong><span>{formatValue(detalhes.NOME_ARTIGO)}</span></div>
                        <div className="detail-item-pcp"><strong>Qualidade:</strong><span>{formatValue(detalhes.QUALIDADE)}</span></div>
                        <div className="detail-item-pcp"><strong>Cor:</strong><span>{formatValue(detalhes.COR)}</span></div>
                        <div className="detail-item-pcp"><strong>Cor Padrão:</strong><span>{formatValue(detalhes.COR_PADRAO)}</span></div>
                        <div className="detail-item-pcp"><strong>Desenho:</strong><span>{formatValue(detalhes.DESENHO)}</span></div>

                        {/* Bloco 3: Quantidade e Valores */}
                        <div className="detail-item-pcp"><strong>Quantidade:</strong><span>{formatValue(detalhes.QTDE)} {formatValue(detalhes.UNIDADE)}</span></div>
                        <div className="detail-item-pcp"><strong>Valor Pendente:</strong><span>{detalhes.VALORPENDENTE?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div className="detail-item-pcp"><strong>Tipo Moeda:</strong><span>{formatValue(detalhes.TIPO_MOEDA)}</span></div>

                        {/* Bloco 4: Entrega e Status */}
                        <div className="detail-item-pcp"><strong>Data do Pedido:</strong><span>{formatDate(detalhes.DATA_PEDIDO)}</span></div>
                        <div className="detail-item-pcp"><strong>Previsão Embarque:</strong><span>{formatDate(detalhes.PREVISAO_EMBARQUE)}</span></div>
                        <div className="detail-item-pcp"><strong>Semana Entrega:</strong><span>{formatValue(detalhes.SEMANAENTREGA)}</span></div>
                        <div className="detail-item-pcp"><strong>Grupo Embarque:</strong><span>{formatValue(detalhes.GRUPO_EMBARQUE)}</span></div>
                        <div className="detail-item-pcp"><strong>Status:</strong><span>{formatValue(detalhes.STATUS)}</span></div>
                        <div className="detail-item-pcp"><strong>País:</strong><span>{formatValue(detalhes.NOME_PAIS)}</span></div>

                        {/* Bloco 5: Informações Adicionais */}
                        <div className="detail-item-pcp"><strong>Mercado:</strong><span>{formatValue(detalhes.MERCADO)}</span></div>
                        <div className="detail-item-pcp"><strong>Família:</strong><span>{formatValue(detalhes.FAMILIA)}</span></div>
                        <div className="detail-item-pcp"><strong>Acabamento:</strong><span>{formatValue(detalhes.ACABAMENTO)}</span></div>
                        <div className="detail-item-pcp full-width"><strong>Cond. Pagamento:</strong><span>{detalhes.CONDICAO_PAGAMENTO} - {detalhes.NOME_CONDICAO_PAGAMENTO?.trim()}</span></div>
                    </div>
                ) : <p>Não foi possível carregar os detalhes do pedido.</p>}
            </div>
        </div>
    );
};

export default PedidoDetalhesModal;