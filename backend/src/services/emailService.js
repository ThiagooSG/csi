const nodemailer = require("nodemailer");
require("dotenv").config();

// Configura o "transportador" de e-mail usando as credenciais do .env
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true para porta 465, false para outras
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // --- ADICIONADO ESTE BLOCO PARA ACEITAR CERTIFICADOS INTERNOS ---
    tls: {
        rejectUnauthorized: false
    }
    // -----------------------------------------------------------
});

/**
 * Envia um e-mail de redefinição de senha.
 * @param {string} to - O e-mail do destinatário.
 * @param {string} token - O token de redefinição.
 */
async function sendPasswordResetEmail(to, token) {
    const resetUrl = `http://localhost:5173/reset-password/${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: to, // O e-mail do usuário
        subject: "Redefinição de Senha - Sistema CSI",
        html: `
            <p>Olá,</p>
            <p>Você solicitou a redefinição de sua senha no sistema CSI.</p>
            <p>Clique no link abaixo para criar uma nova senha:</p>
            <p><a href="${resetUrl}" target="_blank">Redefinir minha senha</a></p>
            <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
            <p>O link é válido por 1 hora.</p>
            <br>
            <p>Atenciosamente,</p>
            <p>Equipe de TI</p>
        `,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(
            "E-mail de redefinição enviado com sucesso: %s",
            info.messageId
        );
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        // Em um ambiente de produção, você poderia ter um sistema de alerta aqui
    }
}

module.exports = { sendPasswordResetEmail };
