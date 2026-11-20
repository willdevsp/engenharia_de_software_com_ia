# Módulo 09: Processamento de Dados e Fine-Tuning de Modelos

> **Etapa do Curso:** Trilha 3 – Arquitetura Enterprise, Dados & Governança (Etapa 9 de 12)  
> **Carga Horária Sugerida:** 30 horas  
> **Foco Técnico:** Decision Framework (Prompting vs. RAG vs. Fine-Tuning), Engenharia e Curadoria de Datasets JSONL em JavaScript, Fine-Tuning Comercial via API (OpenAI & Google Gemini/Vertex AI), LoRA e PEFT (Low-Rank Adaptation), Avaliação Quantitativa/Qualitativa e Testes A/B (Evals em JS) e Projeto de Modelo Customizado para Domínio Específico.

---

## Mapa de Documentações Oficiais do Módulo

| Plataforma / Tecnologia | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **OpenAI Fine-Tuning API** | [platform.openai.com/docs/guides/fine-tuning](https://platform.openai.com/docs/guides/fine-tuning) | [When to use fine-tuning](https://platform.openai.com/docs/guides/fine-tuning#when-to-use-fine-tuning), [Preparing your dataset (JSONL format)](https://platform.openai.com/docs/guides/fine-tuning#preparing-your-dataset), [Hyperparameters (`n_epochs`, `batch_size`, `learning_rate_multiplier`)](https://platform.openai.com/docs/api-reference/fine-tuning/create), [Analyzing your fine-tuned model](https://platform.openai.com/docs/guides/fine-tuning#analyzing-your-fine-tuned-model) |
| **OpenAI Evals & Distillation** | [platform.openai.com/docs/guides/evals](https://platform.openai.com/docs/guides/evals) | [Model Distillation Guide](https://platform.openai.com/docs/guides/distillation), [Building Evals & Graders](https://platform.openai.com/docs/guides/evals) |
| **Google Gemini / Vertex AI Supervised Tuning** | [ai.google.dev/gemini-api/docs/model-tuning](https://ai.google.dev/gemini-api/docs/model-tuning) / [cloud.google.com/vertex-ai](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning) | [Fine-tuning with the Gemini API](https://ai.google.dev/gemini-api/docs/model-tuning), [Prepare Supervised Tuning Data (JSONL)](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning-prepare), [Parameter-Efficient Tuning (LoRA on Vertex)](https://cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models) |
| **Hugging Face PEFT & LoRA** | [huggingface.co/docs/peft](https://huggingface.co/docs/peft/index) | [LoRA Conceptual Guide](https://huggingface.co/docs/peft/conceptual_guides/lora), [Quicktour & Adapter Configuration](https://huggingface.co/docs/peft/quicktour) |
| **Multi-LoRA Serving (Together AI / Fireworks / vLLM)** | [docs.vllm.ai](https://docs.vllm.ai/en/latest/features/lora.html) / [docs.together.ai](https://docs.together.ai/docs/fine-tuning-overview) | [Dynamic LoRA Adapters in Inference APIs](https://docs.vllm.ai/en/latest/features/lora.html), [Fine-Tuning LoRA with JSONL via API](https://docs.together.ai/docs/fine-tuning-quickstart) |
| **Promptfoo (JS/TS Eval Framework)** | [promptfoo.dev/docs](https://www.promptfoo.dev/docs/intro/) | [Evaluating Models & A/B Testing in JS/TS](https://www.promptfoo.dev/docs/getting-started/) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 9.1 (Unidade 1): Quando Fazer Fine-Tuning – Decision Framework
* **Posição na Etapa:** Unidade 1 – Critérios arquiteturais e econômicos para ajuste fino de modelos.
* **Conteúdo Programático:**
  1. **A Matriz de Decisão: Prompt Engineering vs. RAG vs. Fine-Tuning:**
     * **Prompt Engineering + Few-Shot:** Ponto de partida obrigatório para estabelecer o baseline rápido sem custo inicial de treino.
     * **RAG (Retrieval-Augmented Generation):** A escolha correta quando o objetivo é injetar **fatos dinâmicos**, documentos atualizados continuamente e exigir citação verificável de fontes.
     * **Fine-Tuning:** A escolha correta quando o objetivo é moldar **comportamento, estilo, tom de voz, formatação estrita complexa, domínio de jargão/DSL proprietária** ou **destilar conhecimento** (*Model Distillation*: ensinar um modelo pequeno, rápido e barato como `gpt-4o-mini` ou `gemini-2.5-flash` a reproduzir a qualidade de um modelo *frontier* com prompts 90% menores).
     * **Abordagem Híbrida (RAG + Fine-Tuning):** Modelo fine-tunado para dominar a linguagem do domínio e seguir regras estritas, alimentado em tempo real via RAG com os dados factuais do cliente.
  2. **Integração na Arquitetura Enterprise em Produção:**
     * Onde o modelo customizado se encaixa no stack completo: $\text{API Gateway} \rightarrow \text{Model Router (roteando tarefas específicas para o modelo fine-tunado)} \rightarrow \text{Serviços Compartilhados} \rightarrow \text{Observabilidade}$.
     * Princípios de *Loose Coupling*, *Clear Interfaces* e *Policy-Driven Control* para permitir atualização ou rollback de versões do modelo fine-tunado sem quebrar o sistema consumidor.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI – Fine-Tuning vs. Prompt Engineering vs. RAG](https://platform.openai.com/docs/guides/fine-tuning#when-to-use-fine-tuning).
  * [OpenAI – Model Distillation Guide](https://platform.openai.com/docs/guides/distillation).

---

### Sessão 9.2 (Unidade 2): Preparação de Datasets para Fine-Tuning
* **Posição na Etapa:** Unidade 2 – Engenharia de dados textuais e construção de pipelines JSONL em JavaScript.
* **Conteúdo Programático:**
  1. **Identificação, Coleta e Curadoria de Dados:**
     * Extração de exemplos reais de alta qualidade a partir de logs de produção aprovados por humanos, tickets de suporte resolvidos com nota máxima e bases especializadas.
     * Princípio *"Quality over Quantity"*: por que $100$ a $500$ exemplos impecáveis e diversos superam $50.000$ exemplos ruidosos no SFT (*Supervised Fine-Tuning*) moderno.
  2. **Limpeza, Anonimização, Balanceamento e Padronização:**
     * Remoção de dados pessoais identificáveis (**PII Masking**: CPF, e-mails, telefones, chaves), eliminação de duplicatas semânticas, normalização de encoding (UTF-8) e balanceamento da distribuição de classes/cenários (incluindo exemplos negativos e *edge cases*).
  3. **Estruturação Estrita no Formato JSONL:**
     * Anatomia do arquivo `.jsonl` (uma conversa JSON válida por linha): estrutura de arrays `messages` (`role: "system" | "user" | "assistant" | "tool"`), exemplos multi-turno e fine-tuning para *Function Calling*.
  4. **Laboratório Prático em JavaScript:**
     * Desenvolvimento de um pipeline automatizado em Node.js/TypeScript com Streams (`node:readline`, `node:fs`) e Zod para:
       1. Limpar e sanitizar dados brutos (CSV/Banco $\rightarrow$ JSONL).
       2. Validar o schema de cada linha e verificar limites de tokens por exemplo (`tiktoken` / `js-tiktoken`).
       3. Fazer a divisão estratificada automática em **Dataset de Treino ($80\%$)**, **Dataset de Validação ($10\%$)** e **Dataset de Teste/Holdout ($10\%$)**.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI – Preparing Your Dataset & Chat Conversational Format (JSONL)](https://platform.openai.com/docs/guides/fine-tuning#preparing-your-dataset).
  * [Vertex AI Gemini – Prepare Supervised Tuning Data](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning-prepare).

---

### Sessão 9.3 (Unidade 3): Fine-Tuning via API Comercial (Upload, Train e Automação)
* **Posição na Etapa:** Unidade 3 – Execução programática e gerenciamento de jobs de treinamento.
* **Conteúdo Programático:**
  1. **O Processo de Fine-Tuning em APIs Comerciais (OpenAI e Google Gemini):**
     * Fluxo de 4 etapas: Upload do arquivo JSONL (`purpose: "fine-tune"`) $\rightarrow$ Criação do Job de Fine-Tuning $\rightarrow$ Acompanhamento das curvas de perda (*Training Loss* e *Validation Loss*) $\rightarrow$ Disponibilização do endpoint do modelo customizado (`ft:gpt-4o-mini:...`).
  2. **Configuração e Ajuste de Hiperparâmetros Essenciais:**
     * **Epochs (`n_epochs`):** Quantas vezes o modelo percorre o dataset completo (risco de *underfitting* se muito baixo vs. *overfitting* se muito alto).
     * **Learning Rate Multiplier:** Escala da taxa de aprendizado sobre a taxa base do modelo.
     * **Batch Size:** Quantidade de exemplos processados por atualização de gradiente.
  3. **Laboratório Prático em JavaScript:**
     * Scripts em Node.js utilizando o SDK oficial para automatizar o upload dos arquivos `train.jsonl` e `val.jsonl`, iniciar o treinamento, escutar eventos/checkpoints em tempo real e registrar os metadados do modelo treinado.
  4. **Versionamento e Documentação de Modelos Fine-Tunados:**
     * Rastreabilidade completa (*Data & Model Lineage*): vincular cada ID de modelo gerado ao hash exato do dataset JSONL, hiperparâmetros utilizados e resultados da avaliação.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI API Reference – Fine-Tuning Endpoints (`client.fineTuning.jobs`)](https://platform.openai.com/docs/api-reference/fine-tuning).
  * [OpenAI API Reference – Files Upload (`client.files.create`)](https://platform.openai.com/docs/api-reference/files/create).
  * [Google Gemini API – Model Tuning Guide](https://ai.google.dev/gemini-api/docs/model-tuning).

---

### Sessão 9.4 (Unidade 4): LoRA e PEFT (Conceitos Práticos e Eficiência)
* **Posição na Etapa:** Unidade 4 – Como a matemática das matrizes de baixo posto revolucionou o custo e a velocidade do fine-tuning.
* **Conteúdo Programático:**
  1. **Princípios de PEFT (*Parameter-Efficient Fine-Tuning*) e LoRA (*Low-Rank Adaptation*):**
     * Por que o *Full Fine-Tuning* (atualizar $100\%$ dos bilhões de pesos do modelo) é proibitivamente caro e gera cópias gigantescas de armazenamento.
     * Como o **LoRA** congela os pesos originais da rede neural ($W_0$) e injeta pequenas matrizes treináveis de decomposição de baixo posto ($\Delta W = B \times A$, onde o *rank* $r \ll d$), treinando menos de $1\%$ dos parâmetros totais.
     * Hiperparâmetros específicos do LoRA: `r` (*rank*: 8, 16, 32, 64), `lora_alpha` (fator de escala) e `target_modules` (camadas de atenção `q_proj`, `v_proj`, etc.).
     * O que é **QLoRA**: combinação de quantização 4-bit NormalFloat (NF4) no modelo base com adaptadores LoRA em 16-bit.
  2. **Trade-offs: Full Fine-Tuning vs. LoRA:**
     * Comparativo de custo de treino, consumo de VRAM, velocidade, prevenção de esquecimento catastrófico e arquitetura de **Multi-LoRA Serving** (um único modelo base na GPU servindo dezenas de adaptadores LoRA diferentes por requisição com custo quase zero de troca).
  3. **Demonstrações Práticas em JavaScript:**
     * Consumo via API (Together AI / Fireworks / Vertex AI / vLLM) de modelos com adaptadores LoRA customizados e comparação direta de latência e precisão.
* **Documentações Oficiais e Seções Específicas:**
  * [Hugging Face PEFT – LoRA Conceptual Guide](https://huggingface.co/docs/peft/conceptual_guides/lora).
  * [Paper Original LoRA (Hu et al., 2021 - arXiv:2106.09685)](https://arxiv.org/abs/2106.09685).
  * [vLLM Documentation – Serving Dynamically Loaded LoRA Adapters](https://docs.vllm.ai/en/latest/features/lora.html).

---

### Sessão 9.5 (Unidade 5): Avaliação de Modelos Fine-Tunados (Evals & Testes A/B)
* **Posição na Etapa:** Unidade 5 – Rigor científico para provar que o modelo ajustado é superior ao modelo base.
* **Conteúdo Programático:**
  1. **Métricas Quantitativas e Qualitativas para Modelos Ajustados:**
     * **Métricas de Treino:** Interpretação das curvas de *Training Loss*, *Validation Loss* e *Token Accuracy*.
     * **Métricas Determinísticas de Tarefa:** *Exact Match*, F1-Score, validade sintática JSON/SQL, aderência a restrições de formato e tamanho.
     * **Métricas Semânticas e Qualitativas:** Similaridade de embedding com a resposta padrão-ouro (*Gold Standard*) e **LLM-as-a-Judge** (uso de um modelo juiz com rubrica estruturada para pontuar fidelidade, tom e completude).
  2. **Testes A/B e Comparação Cega (*Blind Side-by-Side*):**
     * Desenho experimental comparando 3 variantes no conjunto de *Holdout/Teste* (dados nunca vistos no treino):
       * *Variante A:* Modelo Base com Zero-Shot.
       * *Variante B:* Modelo Base com Prompt Longo + Few-Shot Examples.
       * *Variante C:* Modelo Fine-Tunado com System Prompt curto.
  3. **Riscos de Overfitting e Perda de Generalização:**
     * Como detectar quando o modelo "decorou" os exemplos de treino ou sofreu *Catastrophic Forgetting* (perdeu habilidades gerais de raciocínio ou segurança), e como corrigir via regularização, redução de épocas ou mistura de dados gerais (*replay data*).
  4. **Laboratório Prático em JavaScript:**
     * Implementação de uma suíte automatizada de *Evaluation & A/B Benchmarking* em Node.js que executa o dataset de teste nas variantes, calcula acurácia, latência P95 e custo por 1.000 chamadas, e salva logs detalhados em JSON/Markdown.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI – Analyzing Your Fine-Tuned Model](https://platform.openai.com/docs/guides/fine-tuning#analyzing-your-fine-tuned-model).
  * [OpenAI – Working with Evals Guide](https://platform.openai.com/docs/guides/evals).
  * [Promptfoo Documentation – Running Evals from Node.js/TypeScript](https://www.promptfoo.dev/docs/integrations/node-package/).

---

### Sessão 9.6 (Unidade 6): Projeto Final – Modelo Customizado para Domínio Específico
* **Posição na Etapa:** Unidade 6 (Projeto Prático Integrador do Módulo 9).
* **Conteúdo Programático:**
  1. **Planejamento e Seleção do Domínio Vertical:**
     * Escolha de um problema real de domínio específico:
       * *Opção 1 (Jurídico/Compliance):* Extração de cláusulas de risco e classificação de contratos no padrão interno do escritório.
       * *Opção 2 (Suporte Técnico N2 / Atendimento):* Triagem técnica, diagnóstico padronizado e resposta com o tom de voz oficial da marca.
       * *Opção 3 (Financeiro / Engenharia):* Tradução de perguntas de negócios para uma DSL interna ou formato contábil proprietário.
  2. **Execução do Ciclo Completo em JavaScript:**
     * Curadoria, limpeza e geração do dataset JSONL (`train.jsonl`, `val.jsonl`, `test.jsonl`).
     * Execução do fine-tuning via API e análise das curvas de convergência.
     * Execução da bateria de avaliação A/B comprovando ganho de acurácia, redução de latência ou economia de tokens em relação ao modelo genérico.
     * Construção de um protótipo funcional em JavaScript (Chatbot ou Agente especializado) consumindo o modelo customizado em produção.
  3. **Documentação e Defesa Técnica:**
     * Entrega do *Model Card* do projeto documentando a justificativa do fine-tuning, arquitetura do dataset, hiperparâmetros e resultados do benchmark.
