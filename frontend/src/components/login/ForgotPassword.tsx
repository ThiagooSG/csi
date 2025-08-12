import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../../utils/api";
import "./login.css";

const ForgotPassword = () => {
    const [login, setLogin] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await apiPost("/api/auth/forgot-password", { login });
            if (response.success) {
                setMessage(response.message || "Instruções de redefinição enviadas.");
            } else {
                setError(response.message || "Ocorreu um erro.");
            }
        } catch (err) {
            setError("Erro de conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div
                className="login-container"
                style={{ maxWidth: "500px", display: "block" }}
            >
                <div className="login-right">
                    <div className="login-header">
                        <h2>Redefinir Senha</h2>
                        <p>Insira seu login para receber as instruções de redefinição.</p>
                    </div>
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="login">Login</label>
                            <div className="input-wrapper">
                                <i className="fas fa-user input-icon"></i>
                                <input
                                    id="login"
                                    type="text"
                                    placeholder="Digite seu login"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {message && <p className="feedback-message success">{message}</p>}
                        {error && <p className="feedback-message error">{error}</p>}

                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? "Enviando..." : "Solicitar Redefinição"}
                        </button>

                        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                            <Link
                                to="/"
                                className="forgot-password-link"
                                style={{ textAlign: "center", display: "inline" }}
                            >
                                Voltar para o Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
