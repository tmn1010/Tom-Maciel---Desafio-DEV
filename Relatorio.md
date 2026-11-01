# Folhagem & Cia: relatório e documentação da API

## Visão geral
API REST que substitui a planilha de estoque da loja de plantas, evitando casos como vender
uma planta que não existe mais no estoque.
Stack: Node.js, TypeScript, Express, Prisma, PostgreSQL e Docker.
Fluxo de uma requisição: `routes.ts` → controller (HTTP e validação) → repository (único que acessa o banco).

## Como rodar
1. Abra o Docker Desktop.
2. `copy .env.example .env` (PowerShell) ou `cp .env.example .env`
3. `yarn`
4. `docker compose up -d --build`
5. `yarn migration`
6. A API fica em http://localhost:3001

## Modelo de dados
**Planta:** id (Int, autoincrement), nome, especie, preco (Int, em centavos), estoque (Int),
luminosidade (enum), petFriendly (Boolean), regaACadaDias (Int), createdAt, updatedAt.
**Enum Luminosidade:** SOMBRA, MEIA_SOMBRA, SOL_PLENO.

## Rotas

### POST /plantas
Cadastra uma planta. Todos os campos são obrigatórios.
```json
{ "nome": "Cacto", "especie": "Cereus jamacaru", "preco": 2500, "estoque": 8,
  "luminosidade": "SOL_PLENO", "petFriendly": true, "regaACadaDias": 14 }
```
Resposta 201: a planta criada, com `id`, `createdAt` e `updatedAt`.

### GET /plantas
Lista as plantas. Parâmetros opcionais, combináveis:
- `?luminosidade=SOMBRA` (SOMBRA, MEIA_SOMBRA ou SOL_PLENO)
- `?petFriendly=true` (ou `false`)
- `?nome=costela` busca parte do nome, sem diferenciar maiúsculas (bônus)
- `?ordem=preco` ou `?ordem=nome` ordena de forma crescente (bônus)

Resposta 200: lista de plantas (vazia se nenhuma casar).

### GET /plantas/esgotadas (bônus)
Resposta 200: lista das plantas com estoque 0.

### GET /plantas/:id
Resposta 200: a planta.

### PATCH /plantas/:id
Edita só os campos enviados, com as mesmas regras do cadastro.
Exemplo de corpo: `{ "preco": 5000 }`. Resposta 200: a planta atualizada.

### DELETE /plantas/:id
Resposta 204, sem corpo.

### POST /plantas/:id/venda
Exemplo de corpo: `{ "quantidade": 2 }`. Diminui o estoque.
Resposta 200: a planta com o estoque atualizado.

### GET /plantas/estoque/valor-total
Resposta 200: `{ "valorTotalEmCentavos": 154300, "totalDeVasos": 37 }`

## Erros e status HTTP
Formato dos erros: `{ "message": "texto explicando o problema" }`

| Status | Quando |
|---|---|
| 400 | Campo faltando no cadastro; tipo errado; preço <= 0; estoque negativo; regaACadaDias < 1; luminosidade fora do enum; filtro `petFriendly` diferente de true/false; `ordem` diferente de preco/nome; id não numérico; quantidade da venda inválida; estoque insuficiente na venda |
| 404 | Id inexistente em GET /:id, PATCH, DELETE e venda |
| 500 | Erro inesperado do servidor |

---

## 1. O que foi feito
**Rotas obrigatórias (todas):** POST, GET (com filtros), GET por id, PATCH, DELETE, venda e valor total.

**Regras de negócio:** campos obrigatórios no cadastro; preço maior que zero; `regaACadaDias`
pelo menos 1; estoque não negativo (zero é válido); luminosidade restrita ao enum; 400 para
dado inválido (inclusive filtros, venda e id não numérico); 404 para id inexistente; a venda
nunca deixa o estoque negativo.

**Bônus:** busca por nome sem diferenciar maiúsculas, ordenação por preço ou nome e rota de
plantas esgotadas. O script de seed não foi implementado.

## 2. Como foi feito
**Ordem de trabalho:** li o CRUD de usuários (o modelo) e segui a mesma ordem do treinamento:
`schema.prisma`, migration, repository, controller e rotas. Fiz primeiro o CRUD básico,
testando rota por rota, e só depois venda, valor total e bônus.

**Organização:** mantive a separação do modelo: o controller cuida de HTTP e validação, e o
repository é a única camada que fala com o banco. Criei a função `validarPlanta(dados, parcial)`
para não duplicar regras: no cadastro (`parcial = false`) os campos são obrigatórios; na edição
(`parcial = true`) só se valida o que foi enviado, com as mesmas regras.

**Decisões de validação e o porquê:**
- Uso `=== undefined` em vez de `!campo`, porque `estoque: 0` e `petFriendly: false` são
  válidos e `!campo` os trataria como ausentes.
- Preço em centavos (`Int`), como pede o enunciado, para evitar erros de arredondamento.
- Os filtros da URL chegam como texto: aceito só `"true"` e `"false"` em `petFriendly` e
  converto para booleano antes de chamar o repository.
- Na edição, repasso ao Prisma só os sete campos permitidos, nunca o `req.body` inteiro,
  para que um `id` ou `createdAt` enviado no corpo seja ignorado.
- Dado inválido (400) é checado antes da busca do id (404).
- `/plantas/esgotadas` está declarada antes de `/plantas/:id`, porque o Express lê as rotas de
  cima para baixo e confundiria "esgotadas" com um id.
- [Corpo vazio no PATCH: descreva o que observou ao testar, ou apague esta linha.]

**Venda concorrente:** a conferência e a baixa acontecem numa única operação no banco
(`updateMany` com `where: { id, estoque: { gte: quantidade } }` e `decrement`). Se duas vendas
disputarem o último vaso, o banco processa uma por vez e a segunda não altera nenhuma linha,
então responde 400 sem mexer no estoque. Evitei ler, conferir e gravar em passos separados,
que deixaria uma brecha entre a leitura e a gravação.

**Valor total:** busco `preco` e `estoque` de todas as plantas e somo no código com `reduce`.
Escolhi pela simplicidade; para uma tabela muito grande, valeria pedir a soma ao banco.

## 3. Principais dificuldades
- **Ambiente:** meu Node era o 18 (fora de suporte), então instalei o 24. No Windows, o `yarn`
  não era reconhecido porque o terminal tinha o PATH antigo; resolvi fechando e reabrindo o VS Code.
  Também estava com o VS Code conectado ao WSL enquanto o projeto estava no Windows.
- **Erro 500 no primeiro POST:** o log (`docker compose logs`) mostrou que `Luminosidade` era
  `undefined` dentro do container, porque o Prisma Client de lá foi gerado antes de o model existir.
  Resolvi com `docker compose up -d --build`. Aprendi a ler o log em vez de adivinhar.
- **Filtro `petFriendly` quebrado:** comparei com `typeof ... "boolean"`, mas valores de URL são
  sempre texto, então até `true` dava 400. Corrigi comparando com `"true"` e `"false"`. Cometi o
  mesmo erro ao reaproveitar `validarPlanta` nos filtros e removi.
- **Validações:** `preco < 0` deixava passar o zero (a regra é maior que zero), e troquei por `<= 0`.
  O `PATCH` ignorava quatro campos (lia só `nome`, `especie` e `preco`); percebi ao revisar o código.
- **Repositório:** criei o repositório pelo template e demorei a entender que não era um fork e que
  não havia branch de entrega, só a `main`.

## 4. Uso de IA
Usei o **Claude (Anthropic)** em uma conversa de chat, durante todo o desafio.

**Para quê:**
- Entender conceitos (API, CRUD, Docker, Prisma, migration) e ler o código do modelo de usuários.
- Instalar e configurar o ambiente (Node, yarn, Docker, WSL, Thunder Client).
- Revisar o que escrevi e entender erros (o 500 do container, o bug do `petFriendly`).
- **Gerar código:** `readPlantaById`, o esqueleto da `validarPlanta`, as funções de venda e de valor total (repository e controller).

**O que escrevi eu mesmo:** o schema, as funções do repository (CRUD e filtro), as validações do
`createPlanta`, o `readAllPlantas`, o corpo da `validarPlanta` e a adaptação do update e do delete.

**Como conferi:** testei cada rota à mão no Thunder Client (status e corpo de cada caso), conferi o
`valor-total` contra a conta feita à mão e li os logs quando vi 500. A IA também errou: disse que
`/plantas/estoque/valor-total` poderia conflitar com `/plantas/:id` (não conflita, o `:id` casa um
trecho só) e cometeu um erro de digitação em uma mensagem que repliquei no código. Só percebi o
primeiro porque questionei o que não batia.

**O que aprendi:** a separação entre controller e repository; por que `0` e `false` exigem cuidado
na validação; por que a venda precisa ser uma operação única no banco; e que dados de URL são texto.