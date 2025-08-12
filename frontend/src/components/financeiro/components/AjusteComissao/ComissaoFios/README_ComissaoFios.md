# Atualização: Consulta Múltipla de Duplicatas - Comissão de Fios

## Resumo da Atualização
Esta atualização permite que a funcionalidade de "Comissão de Fios" consulte múltiplas duplicatas de uma vez, assim como já era possível no ajuste de comissão.

## Arquivos Atualizados

### Frontend
- **ComissaoFios_multipla.tsx** - Componente atualizado para consulta múltipla

### Backend  
- **comissaoFiosRoute_multipla.js** - Rota atualizada para aceitar múltiplas duplicatas na consulta

## Instruções de Implementação

### 1. Substituir Arquivos

#### Frontend
```bash
# Substitua o arquivo atual por:
frontend/src/components/financeiro/components/AjusteComissao/ComissaoFios/ComissaoFios.tsx
```

#### Backend
```bash
# Substitua o arquivo atual por:
backend/src/routes/comissaoFiosRoute.js
```

### 2. Principais Mudanças

#### Frontend (ComissaoFios.tsx)
- ✅ Campo de consulta agora é `<textarea>` em vez de `<input>`
- ✅ Aceita múltiplas duplicatas separadas por vírgula ou quebra de linha
- ✅ Função `handlePesquisar` usa POST em vez de GET
- ✅ Tabela mostra contador de duplicatas encontradas
- ✅ Melhor feedback sobre duplicatas não encontradas

#### Backend (comissaoFiosRoute.js)
- ✅ Rota `/pesquisar` alterada de GET para POST
- ✅ Aceita array de duplicatas no body da requisição
- ✅ Query SQL dinâmica para buscar múltiplas duplicatas
- ✅ Retorna informações detalhadas sobre duplicatas não encontradas
- ✅ Logs melhorados para debug
- ✅ Ordenação dos resultados por número da duplicata

### 3. Novos Endpoints

#### POST /api/comissao-fios/pesquisar
**Body:**
```json
{
  "duplicatas": ["123456", "789012", "345678"]
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "rows": [
    {
      "num_docum": "123456",
      "cod_empresa": "01",
      "nome_cliente": "Cliente A",
      "cod_repres_1": "142",
      "nome_representante_1": "João da Silva",
      "pct_comis_1": "2"
    },
    {
      "num_docum": "789012",
      "cod_empresa": "01",
      "nome_cliente": "Cliente B",
      "cod_repres_1": "182",
      "nome_representante_1": "Maria Oliveira",
      "pct_comis_1": "1.5"
    }
  ],
  "message": "2 duplicata(s) encontrada(s). Não encontradas: 345678",
  "total_pesquisadas": 3,
  "total_encontradas": 2,
  "nao_encontradas": ["345678"]
}
```

**Resposta quando nenhuma é encontrada:**
```json
{
  "success": false,
  "message": "Nenhuma duplicata encontrada",
  "total_pesquisadas": 3,
  "total_encontradas": 0,
  "nao_encontradas": ["123456", "789012", "345678"]
}
```

### 4. Como Usar a Nova Funcionalidade

#### Consulta Múltipla
1. **Digite ou cole múltiplas duplicatas** no campo "Consultar Duplicatas"
2. **Separe por vírgula ou quebra de linha:**
   ```
   123456
   789012, 345678
   111222
   ```
3. **Clique em "Consultar"**
4. **Veja os resultados** na tabela com contador de duplicatas encontradas
5. **Receba feedback** sobre duplicatas não encontradas

#### Ajuste de Comissão (inalterado)
1. **Cole as duplicatas** que deseja ajustar no campo "Duplicatas para Ajuste"
2. **Selecione o representante** (nome será carregado automaticamente)
3. **Selecione o percentual de comissão**
4. **Clique em "Ajustar Comissão"**

### 5. Melhorias Implementadas

#### UX/UI
- ✅ **Feedback detalhado:** Informa quantas duplicatas foram encontradas e quais não foram
- ✅ **Contador na tabela:** Mostra "Duplicatas Encontradas (X)"
- ✅ **Validações robustas:** Verifica se pelo menos uma duplicata foi informada
- ✅ **Processamento inteligente:** Remove espaços e linhas vazias automaticamente

#### Performance
- ✅ **Query otimizada:** Busca todas as duplicatas em uma única consulta
- ✅ **Ordenação:** Resultados ordenados por número da duplicata
- ✅ **Logs detalhados:** Facilita debug e monitoramento

#### Segurança
- ✅ **Validações no backend:** Verifica se array de duplicatas é válido
- ✅ **Sanitização:** Remove espaços e entradas vazias
- ✅ **Autenticação:** Todas as rotas protegidas por JWT

### 6. Exemplo de Uso Completo

#### Cenário: Consultar 3 duplicatas
```
Input no campo "Consultar Duplicatas":
123456
789012, 345678
```

#### Resultado esperado:
- **Se todas existirem:** Tabela com 3 linhas + mensagem "3 duplicata(s) encontrada(s)"
- **Se 2 existirem:** Tabela com 2 linhas + mensagem "2 duplicata(s) encontrada(s). Não encontradas: 345678"
- **Se nenhuma existir:** Mensagem de erro "Nenhuma duplicata encontrada"

### 7. Testes Recomendados

1. **Consulta única:** Digite uma duplicata e teste
2. **Consulta múltipla:** Digite várias duplicatas separadas por vírgula
3. **Consulta com quebras de linha:** Digite uma duplicata por linha
4. **Duplicatas inexistentes:** Teste com números que não existem
5. **Mistura:** Teste com duplicatas existentes e inexistentes
6. **Campos vazios:** Teste com espaços e linhas vazias
7. **Ajuste após consulta:** Consulte duplicatas e depois ajuste a comissão

### 8. Troubleshooting

#### Erro "Unexpected token"
- Verifique se o proxy do Vite está configurado corretamente
- Certifique-se de que o backend está rodando na porta 3010

#### Nenhuma duplicata encontrada
- Verifique se as duplicatas pertencem à empresa '01'
- Verifique se são do tipo 'DP' (duplicata)
- Confirme se os números estão corretos no banco

#### Erro de autenticação
- Verifique se o usuário está logado
- Confirme se o token JWT está válido

## Conclusão

A funcionalidade agora permite consultar múltiplas duplicatas de uma vez, tornando o processo mais eficiente e alinhado com a funcionalidade de ajuste que já existia. A interface é intuitiva e fornece feedback detalhado sobre o resultado das consultas.
