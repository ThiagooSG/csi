const bcrypt = require('bcrypt');

// Utilitário para gerar hash de senhas
async function generateHash(password) {
    try {
        const saltRounds = 12;
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`Senha: ${password}`);
        console.log(`Hash: ${hash}`);
        return hash;
    } catch (error) {
        console.error('Erro ao gerar hash:', error);
    }
}

// Utilitário para verificar senha
async function verifyPassword(password, hash) {
    try {
        const isValid = await bcrypt.compare(password, hash);
        console.log(`Senha válida: ${isValid}`);
        return isValid;
    } catch (error) {
        console.error('Erro ao verificar senha:', error);
        return false;
    }
}

// Se executado diretamente
if (require.main === module) {
    const password = process.argv[2];
    if (!password) {
        console.log('Uso: node generate-hash.js <senha>');
        process.exit(1);
    }
    generateHash(password);
}

module.exports = { generateHash, verifyPassword };
