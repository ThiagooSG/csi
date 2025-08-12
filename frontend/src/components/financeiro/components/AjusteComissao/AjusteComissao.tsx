import React, { useState } from "react";
import Comissao from "./Comissao/Comissao";
import ComissaoFios from "./ComissaoFios/ComissaoFios";
import "./ajustecomissao.css";

const AjusteComissao: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"comissao" | "comissaoFios">(
        "comissao"
    );

    return (
        <div className="ajuste-comissao-card">
            <div className="ajuste-comissao-header">
                <i
                    className="fas fa-percentage"
                    style={{ marginRight: 10, color: "#2563eb" }}
                ></i>
                <span className="ajuste-comissao-title">Ajuste Comissão</span>
            </div>
            <div className="ajuste-comissao-tabs">
                <button
                    className={activeTab === "comissao" ? "active" : ""}
                    onClick={() => setActiveTab("comissao")}
                >
                    Comissão
                </button>
                <button
                    className={activeTab === "comissaoFios" ? "active" : ""}
                    onClick={() => setActiveTab("comissaoFios")}
                >
                    Comissão Fios
                </button>
            </div>
            <div className="ajuste-comissao-content">
                {activeTab === "comissao" && <Comissao />}
                {activeTab === "comissaoFios" && <ComissaoFios />}
            </div>
        </div>
    );
};

export default AjusteComissao;
