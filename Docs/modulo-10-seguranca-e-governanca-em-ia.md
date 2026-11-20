# Módulo 10: Segurança e Governança em IA

> **Etapa do Curso:** Trilha 3 – Arquitetura Enterprise, Dados & Governança (Etapa 10 de 12)  
> **Carga Horária Sugerida:** 20 horas  
> **Foco Técnico:** Frameworks de Governança em IA, Interpretabilidade e Explicabilidade (XAI), Detecção e Mitigação de Vieses (Fairness), Gerenciamento de Riscos (Aspectos Humanos/Éticos, Segurança Cibernética/Dados – OWASP Top 10 LLM, Aspectos Legais e Regulatórios – EU AI Act / LGPD / NIST / ISO 42001) e FinOps / Custos Financeiros em IA.

---

## Mapa de Documentações Oficiais do Módulo

| Padrão / Framework | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **OWASP Top 10 for LLM Apps & GenAI** | [genai.owasp.org](https://genai.owasp.org/) | [OWASP Top 10 for LLM Applications 2025 (LLM01 Prompt Injection to LLM10 Unbounded Consumption)](https://genai.owasp.org/llm-top-10/), [LLM AI Security & Governance Checklist](https://genai.owasp.org/initiatives/) |
| **NIST AI Risk Management Framework** | [nist.gov/itl/ai-risk-management-framework](https://www.nist.gov/itl/ai-risk-management-framework) | [NIST AI RMF 1.0 Core (Govern, Map, Measure, Manage)](https://airc.nist.gov/AI_RMF_Knowledge_Base/AI_RMF), [NIST AI 600-1: Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) |
| **EU AI Act & ISO/IEC 42001** | [artificialintelligenceact.eu](https://artificialintelligenceact.eu/) / [iso.org](https://www.iso.org/standard/81230.html) | [High-Level Summary & Risk Tiers (Unacceptable, High, Limited, Minimal)](https://artificialintelligenceact.eu/high-level-summary/), [General-Purpose AI (GPAI) Obligations](https://artificialintelligenceact.eu/gpai-guidelines-overview/) |
| **LGPD & ANPD (Brasil)** | [gov.br/anpd](https://www.gov.br/anpd/pt-br) | [Guia Orientativo e Estudos Técnicos da ANPD sobre IA Generativa e Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-estudo-preliminar-sobre-inteligencia-artificial) |
| **Guardrails & Segurança Técnica** | [platform.openai.com/docs](https://platform.openai.com/docs/guides/moderation) / [github.com/NVIDIA/NeMo-Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) | [OpenAI Moderation API (`omni-moderation-latest`)](https://platform.openai.com/docs/guides/moderation), [Safety Best Practices](https://platform.openai.com/docs/guides/safety-best-practices), [Google Cloud Model Armor & Safety Settings](https://ai.google.dev/gemini-api/docs/safety-settings) |
| **Model Cards & Explainability** | [modelcards.withgoogle.com](https://modelcards.withgoogle.com/about) | [Model Cards for Model Reporting Specification](https://arxiv.org/abs/1810.03993) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 10.1: O que é Governança em Inteligência Artificial
* **Posição na Etapa:** Unidade 1 – Estrutura organizacional e ciclo de vida governado de sistemas de IA.
* **Conteúdo Programático:**
  1. **Definição e Pilares da Governança em IA:**
     * O conjunto de políticas, processos, papéis, controles técnicos e métricas de auditoria que garantem que os sistemas de IA de uma organização operem de forma segura, ética, transparente, alinhada ao negócio e em conformidade com a lei.
  2. **Operacionalizando a Governança no Ciclo de Engenharia (SDLC de IA):**
     * **Inventário e Registro Central de Sistemas de IA:** Mapeamento de todos os modelos (proprietários, fine-tunados, open-source), provedores, servidores MCP e fluxos agênticos ativos na empresa.
     * **Classificação de Criticidade:** Separação entre casos de uso internos de baixo risco e sistemas críticos voltados ao cliente externo ou tomada de decisão automatizada.
     * **Framework NIST AI RMF 1.0 na Prática:** Implementação das 4 funções contínuas: **GOVERN** (cultura e responsabilidades), **MAP** (mapeamento de contexto e riscos), **MEASURE** (avaliação quantitativa e red teaming) e **MANAGE** (mitigação, resposta a incidentes e monitoramento contínuo).
* **Documentações Oficiais e Seções Específicas:**
  * [NIST AI Risk Management Framework (AI RMF 1.0) Playbook](https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook) – *Seções: Govern, Map, Measure e Manage*.

---

### Sessão 10.2: Interpretabilidade e Explicabilidade em Modelos de IA (XAI)
* **Posição na Etapa:** Unidade 1 – Tornando caixas-pretas compreensíveis e auditáveis.
* **Conteúdo Programático:**
  1. **Interpretabilidade vs. Explicabilidade:**
     * *Interpretabilidade:* O quanto conseguimos compreender a mecânica interna de causa e efeito de um modelo (ex.: árvores de decisão vs. redes neurais de bilhões de parâmetros).
     * *Explicabilidade (XAI - Explainable AI):* Técnicas e interfaces arquiteturais para explicar, em termos compreensíveis por humanos e auditores, **por que** o sistema de IA chegou a uma determinada saída ou decisão.
  2. **Explicabilidade Prática em Sistemas Baseados em LLMs e Agentes:**
     * **Grounding e Atribuição de Fontes em RAG:** Exigir que cada afirmação da resposta aponte para o `document_id`, parágrafo e trecho exato da fonte recuperada.
     * **Rastreabilidade de Raciocínio (*Reasoning Traces* e Tool Logs):** Registro estruturado das etapas intermediárias do agente, quais ferramentas foram consultadas, quais dados retornaram e qual regra do prompt motivou a decisão final.
     * **Calibração de Confiança e Honestidade Epistêmica:** Arquitetar o sistema para declarar explicitamente quando não há evidência suficiente na base para responder (*"Não encontrei base documental para confirmar este dado"*).
* **Documentações Oficiais e Seções Específicas:**
  * [Anthropic – Cite Sources & Grounding with Citations API](https://docs.anthropic.com/en/docs/build-with-claude/citations) – *Verificação e citação rastreável de documentos no nível da frase*.

---

### Sessão 10.3: Vieses e Responsabilidade em Modelos de IA
* **Posição na Etapa:** Unidade 2 – Equidade algorítmica (*Fairness*) e responsabilidade técnica (*Accountability*).
* **Conteúdo Programático:**
  1. **Anatomia dos Vieses Algorítmicos em IA Generativa:**
     * Como vieses históricos, demográficos (gênero, raça, idade, região socioeconômica), linguísticos e de confirmação presentes nos corpora da internet são absorvidos durante o pré-treinamento ou amplificados no fine-tuning e nos prompts.
  2. **Detecção, Medição e Mitigação de Vieses:**
     * Testes contrafactuais (*Counterfactual Testing*): executar o mesmo prompt alterando apenas variáveis demográficas (ex.: nome, gênero ou CEP no currículo/proposta de crédito) para medir se o modelo altera sua recomendação ou pontuação.
     * Mitigação na camada de engenharia: blindagem de atributos sensíveis antes de enviar ao LLM (*Feature/Attribute Blindness*), calibração de rubricas objetivas no prompt e avaliação contínua de paridade.
  3. **Responsabilidade (*Accountability*) e Documentação Transparente:**
     * Quem responde quando um agente autônomo comete um erro danoso ao cliente?
     * Adoção de **Model Cards** e **System Cards** documentando usos pretendidos, usos proibidos (*out-of-scope*), limitações conhecidas e resultados de testes de equidade.
* **Documentações Oficiais e Seções Específicas:**
  * [Google Model Cards Toolkit & Specification](https://modelcards.withgoogle.com/about).
  * [Google Responsible Generative AI Toolkit – Fairness & Bias Evaluation](https://ai.google.dev/responsible).

---

### Sessão 10.4: Gerenciamento de Riscos em IA – Aspectos Humanos e Éticos
* **Posição na Etapa:** Unidade 2 – Segurança psicológica, cognitiva e impacto social.
* **Conteúdo Programático:**
  1. **Riscos na Interação Humano-IA:**
     * **Automation Bias (Viés de Automação):** A tendência humana de confiar cegamente na resposta fluida e confiante de um LLM sem verificar os fatos, mesmo quando ela está errada.
     * **Sycophancy (Bajulação do Modelo):** A tendência dos LLMs de concordarem com premissas falsas do usuário em vez de corrigi-lo tecnicamente.
     * **Antropomorfização e Dependência Excessiva:** Limites éticos no design de personas conversacionais.
  2. **Design Centrado no Humano e *Meaningful Human Control*:**
     * Quando o *Human-in-the-Loop* é meramente "decorativo" (o operador humano aprova 500 alertas por hora sem ler) vs. *Controle Humano Significativo* (fornecer contexto resumido, destacar incertezas e exigir validação ativa em decisões de alto impacto como saúde, crédito, recrutamento e justiça).
* **Documentações Oficiais e Seções Específicas:**
  * [NIST AI 600-1 – Generative AI Profile: Human-AI Configuration Risks](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence).

---

### Sessão 10.5: Gerenciamento de Riscos em IA – Segurança e Dados
* **Posição na Etapa:** Unidade 3 – Segurança cibernética ofensiva/defensiva (OWASP Top 10 for LLM) e DLP.
* **Conteúdo Programático:**
  1. **Vetor de Ameaças (OWASP Top 10 for LLM Applications):**
     * **LLM01 – Prompt Injection (Direto e Indireto):**
       * *Direto:* Tentativas de *Jailbreak* pelo usuário no chat para ignorar instruções do sistema.
       * *Indireto (O mais perigoso para Agentes e RAG):* Instruções maliciosas ocultas dentro de uma página web, e-mail, currículo PDF ou registro de banco de dados lido pelo agente, que sequestram o controle do agente para exfiltrar dados ou invocar ferramentas destrutivas.
     * **LLM02 – Sensitive Information Disclosure:** Vazamento de PII, segredos de negócio ou do próprio *System Prompt*.
     * **LLM05 – Improper Output Handling:** Quando a saída do LLM é renderizada sem sanitização gerando **XSS**, ou passada para `eval()`/SQL/shell gerando **RCE / SQL Injection**.
     * **LLM06 – Excessive Agency:** Conceder a um agente ferramentas com permissões de escrita/exclusão amplas sem necessidade.
     * **LLM04 & LLM08 – Data and Vector/Embedding Poisoning:** Envenenamento da base de RAG ou do dataset de fine-tuning.
  2. **Arquitetura Defensiva em Profundidade (*Defense-in-Depth*):**
     * **Input Guardrails:** Classificadores de moderação, detectores de Prompt Injection e mascaramento de PII (DLP - *Data Loss Prevention*) antes de enviar dados para provedores externos.
     * **Isolamento de Privilégios:** Princípio do menor privilégio nas tools e execução de código gerado apenas em sandboxes efêmeras isoladas (containers sem rede/WASM).
     * **Output Guardrails:** Validação de schema, verificação de vazamento de segredos e sanitização HTML/SQL.
* **Documentações Oficiais e Seções Específicas:**
  * [OWASP Top 10 for Large Language Model Applications (2025)](https://genai.owasp.org/llm-top-10/) – *Análise detalhada de LLM01 a LLM10 com exemplos de ataque e prevenção*.
  * [OpenAI Moderation Guide](https://platform.openai.com/docs/guides/moderation) e [Gemini Safety Settings](https://ai.google.dev/gemini-api/docs/safety-settings).

---

### Sessão 10.6: Gerenciamento de Riscos em IA – Aspectos Legais e Regulatórios
* **Posição na Etapa:** Unidade 4 – Conformidade jurídica, proteção de dados e propriedade intelectual.
* **Conteúdo Programático:**
  1. **Regulação Baseada em Risco (EU AI Act e Marco Legal de IA no Brasil):**
     * A pirâmide de 4 níveis de risco:
       1. *Risco Inaceitável (Banido):* Manipulação subliminar, *social scoring*, vigilância biométrica em massa.
       2. *Alto Risco (Fortemente Regulado):* IA em infraestrutura crítica, triagem de currículos/RH, score de crédito, educação, saúde e aplicação da lei (exige gestão de risco, governança de dados, logging, supervisão humana e avaliação de conformidade).
       3. *Risco Limitado (Dever de Transparência):* Chatbots e conteúdos gerados por IA (*deepfakes*/mídia sintética) devem informar claramente ao usuário que ele está interagindo com uma IA.
       4. *Risco Mínimo:* Filtros de spam, jogos, copilots internos de código.
  2. **Privacidade e Proteção de Dados (LGPD e GDPR aplicados a LLMs):**
     * Bases legais para processamento de dados pessoais em prompts e RAG.
     * Garantias contratuais com provedores de API: **Zero Data Retention (ZDR)** e garantias explícitas de que dados enviados via API comercial **não** são usados para treinar modelos fundacionais públicos.
     * O desafio do "Direito ao Esquecimento / Exclusão": fácil de deletar uma linha em um banco vetorial (RAG), quase impossível de remover de pesos de um modelo após *fine-tuning* sem retreinar.
  3. **Propriedade Intelectual, Direitos Autorais e Licenciamento Open-Source:**
     * Licenças de modelos *open-weights* (Apache 2.0, MIT vs. Llama Community License, Gemma Terms of Use, licenças *Non-Commercial* CC-BY-NC) e titularidade de código/conteúdo gerado por IA.
* **Documentações Oficiais e Seções Específicas:**
  * [EU Artificial Intelligence Act – Official Explorer & Risk Classification](https://artificialintelligenceact.eu/high-level-summary/).
  * [OpenAI Enterprise Privacy & Data Usage Policies](https://openai.com/enterprise-privacy/) – *Políticas de retenção zero e não-treinamento em dados de API*.
  * [ISO/IEC 42001 – AI Management System Standard Overview](https://www.iso.org/standard/81230.html).

---

### Sessão 10.7: Custos Financeiros em Inteligência Artificial (AI FinOps)
* **Posição na Etapa:** Unidade 5 – Sustentabilidade econômica, precificação e proteção contra ataques financeiros.
* **Conteúdo Programático:**
  1. **Anatomia Completa dos Custos de um Sistema de IA (TCO):**
     * **Custos Variáveis de Inferência:** Tokens de entrada (*input*), tokens de saída (*output*), tokens ocultos de raciocínio (*reasoning tokens* em modelos como `o3` / `Claude Extended Thinking`), chamadas de ferramentas em múltiplos passos de agentes e transcrição/visão multimodal.
     * **Custos de Dados e Busca:** Geração e re-indexação de embeddings, memória RAM de índices vetoriais (HNSW no PostgreSQL/Qdrant/Pinecone) e chamadas de *Reranker*.
     * **Custos de Treinamento e Operação:** Jobs de Fine-Tuning, hospedagem de GPUs dedicadas e armazenamento de traces de observabilidade.
  2. **Riscos Financeiros Críticos e *Denial of Wallet (DoW)*:**
     * O que é a vulnerabilidade **LLM10:2025 Unbounded Consumption**: atacantes ou bugs que forçam o agente a processar entradas máximas ou entrar em loops de *tool calling*, gerando faturas de milhares de dólares em poucas horas.
  3. **Engenharia de Controle de Custos e Unit Economics:**
     * **Hard & Soft Budgets:** Limites rígidos de consumo diário/mensal por chave de API, por usuário e por tenant.
     * **Token Quotas & Max Output Tokens:** Limitação estrita de `max_completion_tokens` e número máximo de turnos do agente.
     * **Model Cascading / Tiering & Prompt Caching:** Redução estrutural de $60\%\text{–}85\%$ na fatura de IA mantendo a qualidade percebida.
     * Cálculo de **Margem Bruta em SaaS de IA**: como precificar planos de assinatura (*seat-based* vs. *usage/credit-based*) garantindo margem saudável.
* **Documentações Oficiais e Seções Específicas:**
  * [OWASP LLM10:2025 – Unbounded Consumption (Denial of Wallet)](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/).
  * [OpenAI – Managing Costs, Usage Tiers & Monthly Budgets](https://platform.openai.com/docs/guides/production-best-practices#managing-costs).
