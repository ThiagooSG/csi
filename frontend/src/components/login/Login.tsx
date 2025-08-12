import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { login as loginApi } from "../../services/authService";
import { Link } from "react-router-dom";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function checkScroll() {
            const container = containerRef.current;
            if (!container) return;
            const contentHeight = container.scrollHeight;
            const windowHeight = window.innerHeight;
            if (contentHeight > windowHeight) {
                container.classList.add("has-scroll");
            } else {
                container.classList.remove("has-scroll");
            }
        }
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setLoading(true);

        try {
            const data = await loginApi(login, senha); // Chama o serviço

            if (data.success && data.user) {
                // Se o login foi um sucesso, o componente navega
                navigate("/home");
            } else {
                throw new Error(data.message || "Erro ao fazer login");
            }
        } catch (err: any) {
            setErro(err.message || "Erro ao fazer login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`login-bg ${fadeOut ? "fade-out" : "fade-in"}`}
            ref={containerRef}
        >
            <div className="login-container">
                {/* ESTA É A PARTE QUE ESTAVA FALTANDO */}
                <div className="login-left">
                    <div className="welcome-text">
                        <h1>Bem-vindos ao CIS</h1>
                        <p>Cataguases Sistemas Integrados</p>
                    </div>
                </div>
                <div className="login-right">
                    <div className="login-header">
                        <img
                            className="logo_img"
                            src="/logo_cic.jpg"
                            alt="logo empresa"
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

                        <button
                            className={`login-btn ${loading ? "loading" : ""}`}
                            type="submit"
                            disabled={loading}
                        >
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
