import React from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "../Layout/Layout";
import AjusteTaxa from "./components/AjusteTaxa/AjusteTaxa";
import AjustePortador from "./components/AjustePortador/AjustePortador";
import AjusteComissao from "./components/AjusteComissao/AjusteComissao";
import FinanceiroDashboard from "./components/FinanceiroDashboard/FinanceiroDashboard";
import "./financeiro.css";

const Financeiro: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (path: string) => {
    navigate(`/financeiro/${path}`);
  };

  const isFinanceiroHome =
    location.pathname === "/financeiro" || location.pathname === "/financeiro/";

  return (
    <Layout>
      <div className="financeiro-page-container">
        <nav className="financeiro-sidebar">
          <div className="menu-section">
            <h3>Menu Financeiro</h3>
            <ul>
              <li>
                <a
                  onClick={() => navigate("/financeiro")}
                  className={isFinanceiroHome ? "active" : ""}
                >
                  <i className="fas fa-tachometer-alt"></i> Dashboard
                </a>
              </li>
              <li>
                <a
                  onClick={() => handleMenuClick("ajuste-comissao")}
                  className={
                    location.pathname.includes("ajuste-comissao")
                      ? "active"
                      : ""
                  }
                >
                  <i className="fas fa-percentage"></i> Ajuste Comissão
                </a>
              </li>
              <li>
                <a
                  onClick={() => handleMenuClick("ajuste-portador")}
                  className={
                    location.pathname.includes("ajuste-portador")
                      ? "active"
                      : ""
                  }
                >
                  <i className="fas fa-university"></i> Ajuste do Portador
                </a>
              </li>
              <li>
                <a
                  onClick={() => handleMenuClick("ajuste-taxa")}
                  className={
                    location.pathname.includes("ajuste-taxa") ? "active" : ""
                  }
                >
                  <i className="fas fa-calculator"></i> Ajuste de Taxa
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="financeiro-content">
          <Routes>
            <Route index element={<FinanceiroDashboard />} />
            <Route path="ajuste-taxa" element={<AjusteTaxa />} />
            <Route path="ajuste-portador" element={<AjustePortador />} />
            <Route path="ajuste-comissao" element={<AjusteComissao />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
};

export default Financeiro;
