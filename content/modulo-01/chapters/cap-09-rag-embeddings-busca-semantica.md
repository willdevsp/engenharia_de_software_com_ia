---
id: "m01-s09"
title: "Sessão 1.9 — RAG, Embeddings e Busca Semântica (Projeto com JS e Postgres)"
module: 1
session: "1.9"
slug: "cap-09-rag-embeddings-busca-semantica"
estimatedMinutes: 180
status: "reviewed"
subtopics:
  - "Por que RAG (Retrieval-Augmented Generation) vs. Fine-Tuning e Limites de Contexto"
  - "Modelos de Embedding e Espaços Vetoriais Multidimensionais (1536d e 768d)"
  - "Matemática da Busca Vetorial: Distância Euclidiana (L2), Produto Interno e Similaridade de Cosseno"
  - "PostgreSQL com pgvector: Operadores (<=>, <->, <#>) e Indexação HNSW vs. IVFFlat"
  - "Estratégias de Chunking com Overlap e Preservação de Fronteiras Semânticas"
  - "Projeto Prático Ponta a Ponta: Pipeline de Ingestão e Consulta RAG em Node.js + Docker + pgvector"
official_docs:
  - title: "pgvector Official Documentation (PostgreSQL Vector Extension)"
    url: "https://github.com/pgvector/pgvector"
    section: "Getting Started, Querying (<=> cosine distance) & Indexing (HNSW)"
  - title: "pgvector-node Official Integration Guide"
    url: "https://github.com/pgvector/pgvector-node"
    section: "Node.js pg Integration (registerTypes & toSql)"
  - title: "OpenAI Platform – Vector Embeddings Guide"
    url: "https://platform.openai.com/docs/guides/embeddings"
    section: "How to get embeddings & Question answering using embeddings-based search"
  - title: "Google Gemini API – Embeddings Guide"
    url: "https://ai.google.dev/gemini-api/docs/embeddings"
    section: "Generating Text Embeddings (text-embedding-004)"
media:
  audio_notebooklm: null
  video_url: "https://www.youtube.com/watch?v=rhZgXNdhWDY"
  videos:
    - title: "Retrieval Augmented Generation (RAG) Explained: Embedding, Sentence BERT, Vector Database (HNSW)"
      channel: "Umar Jamil"
      url: "https://www.youtube.com/watch?v=rhZgXNdhWDY"
---

# Sessão 1.9: RAG, Embeddings e Busca Semântica (Projeto com JS e Postgres)

> **Unidade 5 (Projeto Prático Principal do Módulo) — Memória Externa e Busca Vetorial**  
> Como fazer um LLM responder com precisão cirúrgica sobre políticas internas da sua empresa, contratos jurídicos confidenciais, post-mortems de arquitetura ou tickets criados há cinco minutos, sem re-treinar o modelo e sem inventar fatos? A resposta padrão da indústria é a arquitetura **RAG (*Retrieval-Augmented Generation*)**. Nesta sessão, dominaremos a matemática intuitiva dos espaços vetoriais, os algoritmos de indexação **HNSW** do **PostgreSQL (`pgvector`)** e construiremos do zero, passo a passo, um motor completo de ingestão e busca semântica em **Node.js + Docker + PostgreSQL**.

---

<a id="por-que-rag"></a>
## 1. Por que RAG (*Retrieval-Augmented Generation*) é Essencial na Engenharia de IA

Por mais impressionante que seja a capacidade de raciocínio de um Foundation Model como GPT-4o, Claude 3.7 Sonnet ou Gemini 2.5 Pro, todo modelo pré-treinado opera sob três restrições estruturais que impedem seu uso direto sobre dados corporativos privados:

1. **Data de Corte de Conhecimento (*Knowledge Cutoff*):** Os pesos paramétricos da rede neural congelam o estado do mundo no momento em que o corpus de pré-treinamento foi fechado. Eventos, releases de software ou transações ocorridas após essa data simplesmente não existem na memória paramétrica do modelo.
2. **Isolamento de Dados Privados:** Um modelo público não (e nem deve) ter sido treinado com o código-fonte proprietário da sua empresa, prontuários médicos de clientes, contratos de SLA ou páginas internas do Confluence/Notion.
3. **Alucinação por Extrapolação Probabilística:** Como vimos na Sessão 1.2, um LLM é um motor autorregressivo que maximiza a probabilidade condicional do próximo token $P(w_t \mid w_1, \dots, w_{t-1})$. Quando questionado sobre um fato ausente de sua janela de contexto, ele tende a fabricar uma resposta plausível na forma, porém factualmente falsa.

### RAG vs. Fine-Tuning vs. Long Context Window

Uma dúvida recorrente em entrevistas de arquitetura de IA é: *"Por que não fazer Fine-Tuning do modelo com os documentos da empresa, ou simplesmente colar tudo em uma janela de contexto de 1 milhão de tokens?"*

| Critério Arquitetural | RAG (*Retrieval-Augmented Generation*) | Fine-Tuning (SFT / LoRA) | Context Stuffing (Janela Longa Bruta) |
| :--- | :--- | :--- | :--- |
| **Objetivo Primário** | Injetar **fatos dinâmicos, dados privados e fontes verificáveis** em tempo de inferência | Adaptar **estilo, tom, formato de saída ou jargão específico** de domínio | Analisar um conjunto fechado de documentos de uma só vez sem infraestrutura de busca |
| **Latência de Atualização de Dados** | **Tempo real (milissegundos):** basta um `INSERT` ou `UPDATE` na tabela vetorial do PostgreSQL | **Horas ou dias:** exige curadoria de dataset, job de treino em GPU e re-deploy | **Imediata**, porém limitada ao que cabe no payload HTTP da requisição |
| **Custo por Requisição em Escala** | **Baixo e previsível:** envia ao LLM apenas os $k$ trechos mais relevantes (ex.: $1.500$ tokens) | Alto custo inicial de GPU + risco de *catastrophic forgetting* de fatos antigos | **Proibitivo em escala:** enviar $500.000$ tokens a cada pergunta multiplica custo e latência (TTFT) |
| **Auditabilidade e Controle de Acesso (RBAC)** | **Total:** filtra linhas no SQL (`WHERE tenant_id = $1`) e cita o documento exato de origem | **Nula:** conhecimento fica dissolvido nos pesos; impossível remover um documento (*unlearning*) | Parcial: difícil auditar qual página de um bloco de $500\text{k}$ tokens influenciou a resposta |

> **Regra de Ouro da Engenharia de IA:** *Fine-tuning ensina ao modelo **como se comportar** (forma e linguagem); RAG entrega ao modelo **o que ele precisa saber** (fatos e memória externa auditável).*

![Arquitetura Completa de RAG com Node.js e PostgreSQL pgvector](../assets/cap-09-rag-pgvector-pipeline.png)

---

<a id="embeddings-espacos-vetoriais"></a>
## 2. Fundamentos de Embeddings e Espaços Vetoriais Multidimensionais

A busca tradicional em bancos de dados relacionais (`WHERE conteudo ILIKE '%termo%'` ou *Full-Text Search* léxico com `tsvector` / BM25) baseia-se na correspondência exata de palavras ou radicais morfológicos. Se o manual de engenharia da empresa diz *"Procedimento de contingência para exaustão do pool de conexões RDS"* e o desenvolvedor pergunta no chat *"O que fazer quando o banco de dados para de aceitar novos clientes?"*, uma busca léxica simples falha porque **não há sobreposição de palavras-chave**, embora o **significado semântico** seja idêntico.

Para que um computador possa medir a proximidade de significado entre duas frases com vocabulários diferentes, utilizamos **Modelos de Embedding** (*Embedding Models*).

### Como um Texto Vira um Vetor Denso

Um modelo de embedding — como o **`text-embedding-3-small`** ($1536$ dimensões) ou **`text-embedding-3-large`** ($3072$ dimensões) da OpenAI, e o **`text-embedding-004`** ($768$ dimensões) do Google Gemini — é uma rede neural Transformer codificadora (*Encoder*) treinada com aprendizado contrastivo sobre bilhões de pares semânticos.

Ao receber um texto de entrada (uma palavra, um parágrafo de código ou uma pergunta), o modelo projeta seu significado como uma coordenada única $\vec{v} \in \mathbb{R}^d$ em um espaço contínuo de alta dimensão:

$$\text{Embedding}(\text{"Exaustão do pool de conexões no PostgreSQL"}) = [0.0214, -0.0489, 0.0137, \dots, 0.0092] \in \mathbb{R}^{1536}$$

Diferente de representações esparsas (*One-Hot Encoding* ou *TF-IDF*, onde 99% das posições do vetor são zeros), um **embedding denso** codifica propriedades latentes de semântica, sintaxe, domínio técnico e intenção distribuídas ao longo de todas as $1536$ coordenadas em ponto flutuante (`float32`). Textos que tratam do mesmo conceito físico ou abstrato são mapeados para regiões geometricamente vizinhas nesse hiperespaço.

| Modelo de Embedding | Provedor | Dimensões Padrão ($d$) | Suporte a Redução de Dimensão (*Matryoshka*) | Limite de Tokens de Entrada |
| :--- | :--- | :--- | :--- | :--- |
| **`text-embedding-3-small`** | OpenAI | $1536$ | Sim (parâmetro `dimensions`, ex.: $512$ ou $1024$) | $8.191$ tokens |
| **`text-embedding-3-large`** | OpenAI | $3072$ | Sim (ex.: truncável para $1536$ ou $1024$ mantendo alta precisão) | $8.191$ tokens |
| **`text-embedding-004`** | Google Gemini | $768$ | Sim (`outputDimensionality`) | $2.048$ tokens |
| **`nomic-embed-text`** | Local (Ollama) | $768$ | Não | $8.192$ tokens |

---

<a id="matematica-similarity-search"></a>
## 3. Matemática da *Similarity Search*: $L_2$, Produto Interno e Similaridade de Cosseno

Uma vez que nossos documentos e a pergunta do usuário foram convertidos em vetores $\vec{A}, \vec{B} \in \mathbb{R}^d$, o problema de recuperar os trechos mais relevantes reduz-se a um cálculo geométrico de vizinhança (*k-Nearest Neighbors* ou *Approximate Nearest Neighbors — ANN*). Existem três métricas fundamentais suportadas nativamente pelos bancos vetoriais como o `pgvector`:

### 1. Distância Euclidiana ou $L_2$ (*Euclidean Distance*)

Mede o comprimento do segmento de reta que liga as pontas dos dois vetores no espaço $d$-dimensional (generalização do Teorema de Pitágoras):

$$d_{L_2}(\vec{A}, \vec{B}) = \|\vec{A} - \vec{B}\|_2 = \sqrt{\sum_{i=1}^{d} (A_i - B_i)^2}$$

* **Interpretação:** Quanto menor o valor ($d_{L_2} \to 0$), mais próximos estão os vetores. Sensível à magnitude (comprimento) dos vetores caso não estejam normalizados.

### 2. Produto Interno ou Produto Escalar (*Inner Product / Dot Product*)

Multiplica as coordenadas correspondentes de cada dimensão e soma os produtos:

$$\vec{A} \cdot \vec{B} = \sum_{i=1}^{d} A_i B_i = \|\vec{A}\| \|\vec{B}\| \cos(\theta)$$

* **Interpretação:** Quando os vetores já são **normalizados para comprimento unitário** ($\|\vec{A}\| = 1$ e $\|\vec{B}\| = 1$, como ocorre por padrão nos embeddings da OpenAI `text-embedding-3-*`), o produto interno é matematicamente equivalente ao cosseno do ângulo $\theta$, porém exige menos operações de CPU por dispensar a divisão pelas normas!

### 3. Similaridade de Cosseno e Distância de Cosseno (*Cosine Similarity & Cosine Distance*)

A **Similaridade de Cosseno** mede exclusivamente o cosseno do ângulo $\theta$ entre dois vetores, ignorando diferenças de magnitude:

$$\text{CosineSimilarity}(\vec{A}, \vec{B}) = \cos(\theta) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|} = \frac{\sum_{i=1}^{d} A_i B_i}{\sqrt{\sum_{i=1}^{d} A_i^2} \sqrt{\sum_{i=1}^{d} B_i^2}}$$

O valor de $\cos(\theta)$ varia no intervalo $[-1, 1]$:
* $\cos(\theta) = 1$: Vetores apontam exatamente na mesma direção semântica ($\theta = 0^\circ$).
* $\cos(\theta) = 0$: Vetores são ortogonais / sem relação semântica ($\theta = 90^\circ$).
* $\cos(\theta) = -1$: Vetores apontam em sentidos diametralmente opostos ($\theta = 180^\circ$).

> **Atenção Crítica ao Operador do `pgvector`:** Como cláusulas `ORDER BY` em SQL ordenam por padrão do menor para o maior (`ASC`) para aproveitar índices B-Tree/HNSW, o **`pgvector` calcula a Distância de Cosseno**, definida como:
> $$\text{CosineDistance}(\vec{A}, \vec{B}) = 1 - \text{CosineSimilarity}(\vec{A}, \vec{B}) \in [0, 2]$$
> Portanto, no `pgvector`, distância $0$ significa **100% de similaridade**, e para obter a taxa de similaridade percentual ($0 \text{ a } 1$) na sua query SQL, escrevemos **`1 - (embedding <=> $1) AS similarity`**!

---

<a id="pgvector-operadores-hnsw"></a>
## 4. PostgreSQL com `pgvector`: Operadores e Indexação HNSW vs. IVFFlat

Em vez de introduzir um banco de dados vetorial proprietário separado — o que obrigaria sua arquitetura a sincronizar transações entre o banco relacional e o banco de vetores (*dual-write problem*) — a extensão open-source **`pgvector`** transforma o próprio **PostgreSQL** em um motor vetorial de alta performance com garantias ACID, joins relacionais, filtros `WHERE` transacionais e backups unificados.

### Tabela Oficial de Operadores e Classes de Índice do `pgvector`

Conforme a documentação oficial (`github.com/pgvector/pgvector`), cada métrica possui seu próprio operador SQL e sua própria classe de operador (*operator class*) que **deve coincidir exatamente** na criação do índice para que o planejador do PostgreSQL utilize a busca acelerada:

| Métrica Geométrica | Operador SQL no `pgvector` | Operator Class para Índice (`vector`) | Quando Utilizar |
| :--- | :--- | :--- | :--- |
| **Distância de Cosseno** ($1 - \cos\theta$) | **`<=>`** | **`vector_cosine_ops`** | Padrão universal para busca semântica de texto e RAG multimodal |
| **Distância Euclidiana ($L_2$)** | **`<->`** | **`vector_l2_ops`** | Dados onde a magnitude absoluta do vetor carrega informação relevante |
| **Produto Interno Negativo** ($-(\vec{A}\cdot\vec{B})$) | **`<#>`** | **`vector_ip_ops`** | Máxima velocidade de CPU quando os vetores são garantidamente normalizados ($\|\vec{v}\|=1$) |
| **Distância Manhattan ($L_1$)** | **`<+>`** | **`vector_l1_ops`** | Espaços esparsos ou métricas robustas a outliers em dimensões isoladas |

### Por que Indexar? Busca Exata (KNN) vs. Busca Aproximada (ANN: HNSW e IVFFlat)

Sem um índice vetorial, uma query `SELECT * FROM chunks ORDER BY embedding <=> $1 LIMIT 5` executa um **Sequential Scan (KNN Exato)**: o PostgreSQL calcula a distância de cosseno contra 100% das linhas da tabela. Para $10.000$ chunks isso leva poucos milissegundos, mas para $2.000.000$ de vetores de $1536$ dimensões a latência sobe para vários segundos.

Para manter buscas abaixo de $10\text{ ms}$ em milhões de vetores, o `pgvector` oferece dois algoritmos de **Busca de Vizinhos Mais Próximos Aproximados (ANN)**:

1. **IVFFlat (*Inverted File with Flat Compression*):** Divide o espaço vetorial em $N$ clusters (*lists*) usando *k-means* durante a criação do índice. Na hora da busca, o Postgres inspeciona apenas os clusters mais próximos (`ivfflat.probes`).
   * *Desvantagem:* Se você criar o índice IVFFlat com a tabela vazia ou se a distribuição dos seus dados mudar após milhares de novos `INSERT`s, os centróides ficam desatualizados e o *recall* (qualidade da busca) degrada até você reconstruir o índice (`REINDEX`).
2. **HNSW (*Hierarchical Navigable Small World*):** Constrói um grafo multicamadas onde a camada superior possui conexões longas ("rodovias expressas" pelo espaço vetorial) e as camadas inferiores refinam a vizinhança local até encontrar os vizinhos mais próximos.
   * *Por que HNSW é a recomendação padrão em produção:* Oferece a melhor curva de **Velocidade (QPS) $\times$ Recall**, **não exige que a tabela já possua dados** antes do `CREATE INDEX`, e mantém a precisão estável mesmo sob inserções contínuas em tempo real.

```sql
-- Criação de índice HNSW otimizado para Distância de Cosseno (<=>) no pgvector
CREATE INDEX idx_document_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Parâmetros do HNSW segundo a documentação oficial:
-- m (padrão 16): número máximo de conexões bidirecionais por nó em cada camada do grafo.
-- ef_construction (padrão 64): tamanho da lista dinâmica de candidatos durante a montagem do grafo.
-- Em tempo de query, podemos ajustar o trade-off recall/latência com: SET hnsw.ef_search = 100;
```

---

<a id="estrategias-chunking-overlap"></a>
## 5. Estratégia de *Chunking* com *Overlap*: Preparando Documentos para Ingestão

Um erro fatal de iniciantes ao construir um sistema RAG é tentar gerar um único vetor de embedding para um documento inteiro de 40 páginas. Isso falha por dois motivos matemáticos e arquiteturais:
1. **Diluição Semântica (*Embedding Dilution*):** Um único vetor de $1536$ números precisa comprimir o significado do texto de entrada. Se um PDF de 40 páginas aborda autenticação OAuth2 na página 3, políticas de férias na página 18 e configuração do Kubernetes na página 35, o vetor resultante será uma "média cinzenta" de todos esses assuntos e não terá alta similaridade com nenhuma pergunta específica.
2. **Orçamento do Prompt Aumentado:** Quando recuperamos os trechos relevantes para enviar ao LLM, queremos injetar apenas os parágrafos que respondem à pergunta (ex.: 3 a 5 fragmentos de 400 tokens), e não 40 páginas de ruído.

### Como Funciona o *Chunking* com *Overlap* (Sobreposição)

O processo de **Chunking** divide documentos longos em fragmentos menores e semanticamente coesos (*chunks*). Contudo, se cortarmos o texto de forma cega a cada $N$ caracteres, corremos o risco de partir uma frase ou raciocínio exatamente ao meio — por exemplo, deixando o sujeito da regra de negócio no final do `Chunk #4` e a condição numérica no início do `Chunk #5`.

Para evitar essa perda de contexto nas bordas, aplicamos duas técnicas combinadas:
1. **Janela Deslizante com *Overlap* (Sobreposição de 15% a 20%):** Se definirmos um `chunkSize` de $800$ caracteres (ou $\sim 200$ tokens) com `chunkOverlap` de $160$ caracteres (20%), os últimos $160$ caracteres do `Chunk #1` são repetidos no início do `Chunk #2`. Isso garante que qualquer frase situada na fronteira de corte apareça íntegra em pelo menos um dos dois chunks.
2. **Divisão Recursiva por Fronteiras Naturais (*Recursive Character/Markdown Splitting*):** Em vez de cortar no meio de uma palavra, o algoritmo tenta priorizar quebras naturais de parágrafo (`\n\n`), quebras de linha (`\n`), final de sentença (`. `) e, apenas em último caso, espaços em branco.

---

<a id="projeto-pratico-rag-nodejs-pgvector"></a>
## 6. Projeto Prático Ponta a Ponta: Construindo seu Primeiro RAG com Node.js, Docker e PostgreSQL (`pgvector`)

Chegou a hora de construir um sistema RAG completo, pronto para produção, utilizando **Node.js (ES Modules)**, **Docker Compose**, **PostgreSQL 17 com `pgvector`**, a biblioteca oficial **`pgvector`** para Node.js e a API de Embeddings/Chat da **OpenAI** (totalmente compatível também com Gemini ou Ollama).

### Etapa 1: Subindo o PostgreSQL com `pgvector` via Docker e Inicializando o Schema SQL

Crie um diretório `rag-pgvector-js` e adicione o arquivo `docker-compose.yml` utilizando a imagem oficial `pgvector/pgvector:pg17`, que já traz o PostgreSQL 17 compilado com a extensão `vector`:

```yaml
# docker-compose.yml
services:
  postgres-rag:
    image: pgvector/pgvector:pg17
    container_name: postgres-rag-pgvector
    restart: unless-stopped
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: engineering_kb
    ports:
      - "5432:5432"
    volumes:
      - pgvector_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro

volumes:
  pgvector_data:
```

Agora crie o arquivo `init.sql` na mesma pasta. Ele será executado automaticamente pelo container na primeira inicialização para ativar a extensão `vector`, criar a tabela com a coluna `vector(1536)` e configurar o índice **HNSW**:

```sql
-- init.sql
-- 1. Habilita a extensão oficial pgvector no banco de dados
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Cria a tabela de chunks da base de conhecimento com metadados JSONB e vetor de 1536 dimensões
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_title TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cria o índice HNSW usando a classe de operador de Distância de Cosseno (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hnsw
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

Suba o banco de dados no terminal:

```bash
docker compose up -d
```

### Etapa 2: Configurando o Projeto Node.js e Dependências Oficiais

Inicialize o projeto Node.js e instale o driver `pg`, o helper oficial **`pgvector`** (`github.com/pgvector/pgvector-node`) e o SDK oficial `openai`:

```bash
npm init -y
npm pkg set type="module"
npm install pg pgvector openai
```

### Etapa 3: Implementando o Algoritmo de *Chunking* com *Overlap* (`src/chunker.js`)

Vamos criar um módulo puro e determinístico em JavaScript que divide textos técnicos respeitando fronteiras de parágrafo/sentença e preserva o *overlap* configurado:

```javascript
// src/chunker.js
/**
 * Divide um documento de texto longo em chunks semânticos com sobreposição (overlap).
 * @param {string} text - Texto completo do documento.
 * @param {object} options - Configuração de tamanho e sobreposição em caracteres.
 * @param {number} [options.chunkSize=800] - Tamanho máximo alvo de cada chunk.
 * @param {number} [options.chunkOverlap=160] - Quantidade de caracteres sobrepostos entre chunks consecutivos.
 * @returns {Array<{ chunkIndex: number, content: string }>}
 */
export function splitTextIntoChunks(text, { chunkSize = 800, chunkOverlap = 160 } = {}) {
  if (chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap deve ser estritamente menor que chunkSize.");
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    // Se não chegamos ao fim do documento, recuamos até a quebra natural mais próxima
    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const lastParagraph = slice.lastIndexOf("\n\n");
      const lastNewline = slice.lastIndexOf("\n");
      const lastSentence = slice.lastIndexOf(". ");
      const lastSpace = slice.lastIndexOf(" ");

      const minBreakOffset = Math.floor(chunkSize * 0.5);
      if (lastParagraph > minBreakOffset) {
        end = start + lastParagraph + 2;
      } else if (lastNewline > minBreakOffset) {
        end = start + lastNewline + 1;
      } else if (lastSentence > minBreakOffset) {
        end = start + lastSentence + 2;
      } else if (lastSpace > minBreakOffset) {
        end = start + lastSpace + 1;
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({ chunkIndex: chunkIndex++, content });
    }

    if (end >= normalized.length) break;

    // Avança o ponteiro recuando pelo tamanho do overlap configurado
    start = Math.max(start + 1, end - chunkOverlap);
  }

  return chunks;
}
```

### Etapa 4: Pipeline de Ingestão (`src/ingest.js`)

Conforme a documentação oficial do `pgvector-node`, registramos os tipos vetoriais no cliente `pg` com `await pgvector.registerTypes(client)` e formatamos qualquer array numérico JavaScript para o literal SQL `'[-0.012, 0.043, ...]'` usando `pgvector.toSql(embeddingArray)`:

```javascript
// src/ingest.js
import pg from "pg";
import pgvector from "pgvector/pg";
import OpenAI from "openai";
import { splitTextIntoChunks } from "./chunker.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://devuser:devpassword@localhost:5432/engineering_kb",
});

// Garante que cada nova conexão do pool registre o parser de tipos do pgvector
pool.on("connect", async (client) => {
  await pgvector.registerTypes(client);
});

/**
 * Gera embeddings em lote (batch) utilizando o modelo text-embedding-3-small (1536 dimensões).
 * @param {string[]} texts - Lista de strings para vetorizar em uma única chamada HTTP.
 * @returns {Promise<number[][]>}
 */
export async function generateEmbeddingsBatch(texts) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    encoding_format: "float",
  });
  return response.data.map((item) => item.embedding);
}

/**
 * Executa o pipeline completo de ingestão de um documento técnico no PostgreSQL pgvector.
 */
export async function ingestDocument({ title, rawText, category }) {
  const chunks = splitTextIntoChunks(rawText, { chunkSize: 700, chunkOverlap: 140 });
  console.log(`[Ingestão] Documento "${title}" dividido em ${chunks.length} chunks.`);

  // Gera todos os vetores de 1536 dimensões em uma única chamada batch para máxima eficiência
  const textsToEmbed = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddingsBatch(textsToEmbed);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < chunks.length; i++) {
      const { chunkIndex, content } = chunks[i];
      const vectorSql = pgvector.toSql(embeddings[i]);

      await client.query(
        `INSERT INTO knowledge_chunks (document_title, chunk_index, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          title,
          chunkIndex,
          content,
          JSON.stringify({ category, charLength: content.length }),
          vectorSql,
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`[Ingestão] ${chunks.length} vetores persistidos com sucesso no índice HNSW!`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

### Etapa 5: Pipeline de Busca Semântica (`<=>`) e Geração Aumentada (`src/query-rag.js`)

Agora implementamos o fluxo de consulta em tempo real:
1. Convertimos a pergunta do usuário em um vetor de $1536$ dimensões usando o **exato mesmo modelo de embedding** usado na ingestão (`text-embedding-3-small`).
2. Executamos a query SQL com o operador **`<=>` (Distância de Cosseno)** filtrando por um limiar mínimo de similaridade (`minSimilarity = 0.45`) para descartar ruídos irrelevantes.
3. Montamos o **Prompt Aumentado** instruindo o LLM a responder **exclusivamente** com base nas evidências recuperadas e citando o documento e o índice do chunk.

```javascript
// src/query-rag.js
import pg from "pg";
import pgvector from "pgvector/pg";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://devuser:devpassword@localhost:5432/engineering_kb",
});

/**
 * Passo 1 do RAG (Retrieval): Busca os top-K chunks mais próximos via Distância de Cosseno (<=>).
 */
export async function searchSimilarChunks(userQuestion, { topK = 4, minSimilarity = 0.45 } = {}) {
  // 1. Vetoriza a pergunta do usuário (1536 dimensões)
  const embResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: userQuestion,
  });
  const queryVector = pgvector.toSql(embResponse.data[0].embedding);

  // 2. Consulta o PostgreSQL usando o operador <=> (aproveitando o índice HNSW)
  // Nota: (embedding <=> $1) é a Distância de Cosseno; logo, 1 - (embedding <=> $1) é a Similaridade!
  const sql = `
    SELECT
      id,
      document_title,
      chunk_index,
      content,
      metadata,
      1 - (embedding <=> $1) AS similarity
    FROM knowledge_chunks
    WHERE 1 - (embedding <=> $1) >= $2
    ORDER BY embedding <=> $1 ASC
    LIMIT $3;
  `;

  const { rows } = await pool.query(sql, [queryVector, minSimilarity, topK]);
  return rows;
}

/**
 * Passo 2 do RAG (Augmented Generation): Monta o prompt fundamentado e gera a resposta com citações.
 */
export async function answerWithRAG(userQuestion) {
  const retrievedChunks = await searchSimilarChunks(userQuestion, {
    topK: 4,
    minSimilarity: 0.45,
  });

  if (retrievedChunks.length === 0) {
    return {
      answer:
        "Não encontrei informações suficientes na base de conhecimento oficial para responder a essa pergunta com segurança.",
      sources: [],
    };
  }

  // Formata os blocos de contexto com identificadores auditáveis
  const contextBlocks = retrievedChunks
    .map(
      (chunk, idx) =>
        `[FONTE ${idx + 1} | Doc: "${chunk.document_title}" | Chunk #${chunk.chunk_index} | Similaridade: ${(
          chunk.similarity * 100
        ).toFixed(1)}%]\n${chunk.content}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `Você é um Engenheiro de Software Principal respondendo dúvidas técnicas da equipe.
REGRAS ESTRITAS DE GROUNDING (FUNDAMENTAÇÃO):
1. Responda APENAS utilizando os fatos contidos no bloco <contexto_recuperado>.
2. Se a resposta não estiver explícita no contexto, declare que a informação não consta na documentação interna. Nunca invente comandos, portas ou políticas.
3. Cite sempre a fonte no formato [Doc: "Título", Chunk #N] ao final de cada afirmação técnica.`;

  const userPrompt = `<contexto_recuperado>
${contextBlocks}
</contexto_recuperado>

<pergunta_do_usuario>
${userQuestion}
</pergunta_do_usuario>`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1, // Temperatura baixa para máxima fidelidade factual ao contexto
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    answer: completion.choices[0].message.content,
    sources: retrievedChunks.map((c) => ({
      documentTitle: c.document_title,
      chunkIndex: c.chunk_index,
      similarity: Number(c.similarity.toFixed(4)),
    })),
  };
}
```

### Boas Práticas de Produção para Sistemas RAG

Para levar essa arquitetura do laboratório para um ambiente corporativo de missão crítica, atente-se a quatro invariantes de engenharia:
1. **Imutabilidade do Espaço Vetorial por Modelo:** Nunca misture vetores gerados pelo `text-embedding-3-small` com vetores do `text-embedding-004` ou do `nomic-embed-text` na mesma coluna, nem consulte a base com um modelo diferente daquele usado na ingestão. Cada modelo possui sua própria geometria latente; comparar coordenadas de modelos distintos produz ruído matemático sem significado.
2. **Busca Híbrida (*Hybrid Search*: Semântica + Léxica):** Enquanto a busca vetorial (`<=>`) brilha na compreensão de conceitos e paráfrases, códigos exatos de erro (ex.: `ERR_SSL_PROTOCOL_ERROR`, `SKU-9941-B`) são melhor capturados por busca textual exata (`tsvector` / BM25 no próprio PostgreSQL). Combinar os dois rankings via **RRF (*Reciprocal Rank Fusion*)** entrega a maior precisão possível.
3. **Filtro HNSW com Catálogo Grande (*Iterative Scan* no `pgvector 0.8+`):** Quando uma query combina `WHERE metadata->>'category' = 'security'` com `ORDER BY embedding <=> $1 LIMIT 5`, um índice ANN pode retornar menos de 5 linhas se o filtro `WHERE` for muito restritivo. No `pgvector 0.8.0+`, habilite `SET hnsw.iterative_scan = strict_order;` para que o grafo HNSW continue caminhando automaticamente até preencher os $k$ resultados filtrados.
4. **Temperatura Baixa no Gerador:** Configure `temperature` entre `0.0` e `0.2` na chamada final do LLM para minimizar a criatividade estocástica e manter a resposta ancorada nos fatos recuperados.

---

## Resumo Técnico da Sessão 1.9

1. **Propósito do RAG:** Supera a data de corte (*knowledge cutoff*), protege dados privados com filtros relacionais e elimina alucinações injetando evidências recuperadas em tempo de execução, sem o custo e a rigidez do *fine-tuning*.
2. **Embeddings e Geometria Semântica:** Modelos como `text-embedding-3-small` ($1536\text{d}$) e `text-embedding-004` ($768\text{d}$) projetam textos em vetores densos onde a proximidade semântica é medida pelo ângulo entre os vetores (**Similaridade de Cosseno**).
3. **PostgreSQL `pgvector` e HNSW:** O operador **`<=>`** calcula a **Distância de Cosseno** ($1 - \cos\theta$), exigindo ordenação ascendente (`ORDER BY embedding <=> $1 ASC`) e índice **`USING hnsw (embedding vector_cosine_ops)`** para buscas sub-10ms em alta escala.
4. **Chunking com Overlap:** Dividir documentos preservando fronteiras de parágrafo e sobreposição de $15\%\text{–}20\%$ evita a diluição semântica do vetor e impede a perda de contexto nas bordas dos fragmentos.
