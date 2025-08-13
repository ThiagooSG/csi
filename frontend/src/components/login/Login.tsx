import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginApi } from "../../utils/api";
import "./login.css";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setLoading(true);

        try {
            const data = await loginApi(login, senha);

            if (data.success && data.user) {
                navigate("/home");
            } else {
                throw new Error(data.message || "Usuário ou senha inválidos.");
            }
        } catch (err: any) {
            setErro(err.message || "Erro ao fazer login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div className="login-container">
                <div className="login-left">
                    <div className="welcome-text">
                        <h1>Bem-vindo ao CSI</h1>
                        <p>Cataguases Sistemas Integrados</p>
                    </div>
                </div>
                <div className="login-right">
                    <div className="login-header">
                        <img
                            className="logo_img"
                            src="/logo_cic.jpg"
                            alt="Logo da empresa"
                        />
                        <h2>Login</h2>
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
                        <div className="form-group">
                            <label htmlFor="password">Senha</label>
                            <div className="input-wrapper">
                                <i className="fas fa-lock input-icon"></i>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Digite sua senha"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                <button
                                    type="button"
                                    className="show-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    <i
                                        className={`fas fa-eye${showPassword ? "-slash" : ""}`}
                                    ></i>
                                </button>
                            </div>
                        </div>

                        <Link to="/forgot-password" className="forgot-password-link">
                            Esqueceu a senha?
                        </Link>

                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? <div className="spinner"></div> : "Entrar"}
                        </button>
                        {erro && <div className="erro">{erro}</div>}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
