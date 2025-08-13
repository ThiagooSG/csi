import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

// 1. Importações da biblioteca de Toast
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./components/login/Login";
import Home from "./components/home/Home";
import Financeiro from "./components/financeiro/Financeiro";
import PrivateRoute from "./components/PrivateRoute";
import PaginaAdmin from "./components/admin/PaginaAdmin";
import ForgotPassword from "./components/login/ForgotPassword";
import ResetPassword from "./components/login/ResetPassword";

const App: React.FC = () => {
  return (
    <Router>
      {/* ToastContainer */}
      <ToastContainer
        position="top-right"
        autoClose={5000} // Fecha automaticamente após 5 segundos
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        {/* Rota pública - Login */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Rotas protegidas */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        <Route
          path="/financeiro/*"
          element={
            <PrivateRoute>
              <Financeiro />
            </PrivateRoute>
          }
        />

        {/* ROTA DE ADMIN DE USUÁRIOS */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <PaginaAdmin />
            </PrivateRoute>
          }
        />

        {/* Redireciona qualquer rota não encontrada para home */}
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  );
};

export default App;
