require("dotenv").config();
const oracledb = require("oracledb");

// Configurações do oracledb
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT; // Retorna resultados como objetos
oracledb.autoCommit = true; // Commit automático

// Configura o diretório do Oracle Instant Client
if (process.env.ORACLE_CLIENT_LIB_DIR) {
    try {
        oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
        console.log("Oracle Client inicializado com sucesso");
    } catch (err) {
        console.error("Erro ao inicializar Oracle Client:", err);
        throw err;
    }
}

// Configuração do banco
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 0,
    poolMax: 10,
    poolIncrement: 1,
};

// Validação das variáveis de ambiente
function validateConfig() {
    const requiredEnvVars = ["DB_USER", "DB_PASSWORD", "DB_CONNECT_STRING"];
    const missing = requiredEnvVars.filter((var_) => !process.env[var_]);

    if (missing.length > 0) {
        throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}`);
    }

    console.log("Configuração do banco validada");
    console.log("Connect String:", dbConfig.connectString);
}

// Função para obter uma conexão
async function getConnection() {
    try {
        // Valida a configuração antes de tentar conectar
        validateConfig();

        console.log("Tentando conectar ao Oracle DB...");
        const connection = await oracledb.getConnection(dbConfig);

        // Testa a conexão
        const testResult = await connection.execute("SELECT 1 FROM DUAL");
        if (testResult) {
            console.log("Conexão ao Oracle DB estabelecida e testada com sucesso");
        }

        return connection;
    } catch (err) {
        console.error("=== ERRO DE CONEXÃO DETALHADO ===");
        console.error("Tipo do erro:", err.constructor.name);
        console.error("Mensagem:", err.message);
        console.error("Erro Oracle:", err.errorNum);
        console.error("Stack:", err.stack);
        console.error("================================");
        throw err;
    }
}

// Exporta a função getConnection
module.exports = { getConnection };
