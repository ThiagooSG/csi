import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPost } from "../../utils/api";
import "./login.css";

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (senha !== confirmarSenha) {
            setError("As senhas não coincidem.");
            return;
        }

        setLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await apiPost(`/api/auth/reset-password/${token}`, {
                senha,
            });
            if (response.success) {
                setMessage(
                    "Senha redefinida com sucesso! Você será redirecionado para o login."
                );
                setTimeout(() => navigate("/"), 3000);
            } else {
                setError(response.message || "Ocorreu um erro.");
            }
        } catch (err) {
            setError("Token inválido ou expirado.");
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
                        <h2>Crie sua Nova Senha</h2>
                    </div>
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="senha">Nova Senha</label>
                            <div className="input-wrapper">
                                <i className="fas fa-lock input-icon"></i>
                                <input
                                    id="senha"
                                    type="password"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
                            <div className="input-wrapper">
                                <i className="fas fa-lock input-icon"></i>
                                <input
                                    id="confirmarSenha"
                                    type="password"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {message && <p className="feedback-message success">{message}</p>}
                        {error && <p className="feedback-message error">{error}</p>}

                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Redefinir Senha"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
