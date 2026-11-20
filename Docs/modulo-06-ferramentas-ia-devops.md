# Módulo 06: Ferramentas de IA para DevOps

> **Etapa do Curso:** Trilha 2 – IA Aplicada ao Ciclo de Produto & Ops (Etapa 6 de 12)  
> **Carga Horária Sugerida:** 45 horas  
> **Foco Técnico:** IA Generativa para Infraestrutura, IaC Copilot (Terraform, Pulumi, Helm, OPA/Sentinel), Agentes para Kubernetes e GitOps (Argo CD, Flux), Troubleshooting Assistido (ReAct, Logs, Traces), AIOps e Observabilidade (PromQL, LogQL, Grafana, Anomaly Detection), ChatOps com HITL e RBAC, DevSecOps Assistido por IA, CI/CD Inteligente, FinOps Cloud, RAG de Runbooks/Post-Mortem e Auto-Remediação Segura com Guardrails.

---

## Mapa de Documentações Oficiais do Módulo

| Domínio DevOps | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **AWS Bedrock (Infra AI)** | [docs.aws.amazon.com/bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html) | [Agents for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html), [Knowledge Bases (RAG)](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html), [Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) |
| **CrewAI & AutoGen** | [docs.crewai.com](https://docs.crewai.com/) / [microsoft.github.io/autogen](https://microsoft.github.io/autogen/) | [CrewAI Tasks & Process](https://docs.crewai.com/concepts/tasks), [AutoGen AgentChat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/index.html) |
| **Terraform & Open Policy Agent** | [developer.hashicorp.com/terraform/docs](https://developer.hashicorp.com/terraform/docs) / [openpolicyagent.org](https://www.openpolicyagent.org/docs/latest/) | [Terraform CLI Validate & Plan JSON](https://developer.hashicorp.com/terraform/cli/commands/plan), [OPA Terraform Evaluation](https://www.openpolicyagent.org/docs/latest/terraform/), [HashiCorp Sentinel](https://developer.hashicorp.com/sentinel/docs) |
| **Pulumi & Helm** | [pulumi.com/docs](https://www.pulumi.com/docs/) / [helm.sh/docs](https://helm.sh/docs/) | [Pulumi AI & Automation API](https://www.pulumi.com/docs/iac/using-pulumi/automation-api/), [Helm Chart Template Guide](https://helm.sh/docs/chart_template_guide/) |
| **Kubernetes & K8s AI (K8sGPT)** | [kubernetes.io/docs](https://kubernetes.io/docs/home/) / [docs.k8sgpt.ai](https://docs.k8sgpt.ai/) | [HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/), [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/), [K8sGPT Analyzers & MCP Mode](https://docs.k8sgpt.ai/reference/mcp/) |
| **GitOps (Argo CD, Argo Rollouts, Flux)** | [argo-cd.readthedocs.io](https://argo-cd.readthedocs.io/) / [fluxcd.io](https://fluxcd.io/flux/) | [Argo Rollouts Canary & Blue-Green](https://argoproj.github.io/argo-rollouts/), [Argo CD Automated Sync & Hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/) |
| **Observabilidade (Prometheus, Loki, Grafana, Jaeger)** | [prometheus.io/docs](https://prometheus.io/docs/prometheus/latest/querying/basics/) / [grafana.com/docs](https://grafana.com/docs/) | [PromQL Querying](https://prometheus.io/docs/prometheus/latest/querying/basics/), [Grafana Loki LogQL](https://grafana.com/docs/loki/latest/query/), [Grafana HTTP Provisioning API](https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/), [Jaeger / OpenTelemetry Tracing](https://www.jaegertracing.io/docs/) |
| **DevSecOps (Trivy, Checkov, Snyk)** | [trivy.dev](https://trivy.dev/latest/) / [checkov.io](https://www.checkov.io/) | [Trivy IaC & Container Scanning JSON Output](https://trivy.dev/latest/docs/configuration/reporting/), [Checkov Custom Policies](https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html) |
| **FinOps (Infracost)** | [infracost.io/docs](https://www.infracost.io/docs/) | [Infracost CLI & CI/CD Pull Request Comments](https://www.infracost.io/docs/features/cli_commands/) |
| **ChatOps (Slack Bolt JS)** | [tools.slack.dev/bolt-js](https://tools.slack.dev/bolt-js/) | [Slash Commands & Interactive Approval Blocks](https://tools.slack.dev/bolt-js/concepts/actions/) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 6.1 (Unidade I): Fundamentos de IA Generativa para Infraestrutura
* **Posição na Etapa:** Unidade I – Base conceitual e ferramental de IA para Engenharia de Plataforma e SRE.
* **Conteúdo Programático:**
  * **1.1. Arquitetura de Large Language Models (LLMs):** Como janelas de contexto, tokenização de arquivos YAML/HCL/Logs e parâmetros de geração (`temperature: 0`, `top_p`) impactam a confiabilidade em tarefas de infraestrutura.
  * **1.2. APIs de IA Corporativas:** Consumo seguro e comparativo de **OpenAI**, **Anthropic Claude** e **AWS Bedrock** (privacidade VPC, IAM Roles, logs no CloudTrail).
  * **1.3. Frameworks de Agentes Autônomos em Ops:** Quando utilizar **LangChain/LangGraph**, **CrewAI** (equipes de agentes com papéis de SRE, SecOps e FinOps) ou **AutoGen** (execução iterativa de código/scripts em sandbox).
  * **1.4. RAG Aplicado a Documentação Técnica:** Indexação de topologias de arquitetura, ADRs, catálogos de microsserviços (Backstage) e documentação interna de plataforma.
  * **1.5. Padrões de Prompting para Infraestrutura:** *System Prompts* restritivos para geração de YAML, HCL, Dockerfile e Bash idempotentes.
  * **1.6. Limitações, Alucinações e Estratégias de Validação:** Por que **nunca** executar output de LLM diretamente em produção sem passar por analisadores estáticos (AST/Linters) e *dry-run*.
* **Documentações Oficiais e Seções Específicas:**
  * [AWS Bedrock User Guide – Security & IAM](https://docs.aws.amazon.com/bedrock/latest/userguide/security.html).
  * [CrewAI Documentation – Core Concepts (Agents, Tasks, Crews)](https://docs.crewai.com/concepts/agents).

---

### Sessão 6.2 (Unidade II): IaC Copilot – Geração Inteligente de Infraestrutura
* **Posição na Etapa:** Unidade II – Automação e governança de Infrastructure as Code.
* **Conteúdo Programático:**
  * **2.1. Tradução de Linguagem Natural para IaC:** Conversão de diagramas e especificações arquiteturais em código declarativo modular.
  * **2.2. Geração Automatizada de Terraform, Pulumi e Helm Charts:** Estruturação de módulos reutilizáveis (`variables.tf`, `main.tf`, `outputs.tf`, `values.yaml` e `Chart.yaml`).
  * **2.3. Loop de Validação Automatizada:** Agente executando `terraform fmt -check`, `terraform validate -json`, `terraform plan -out=tfplan` e `helm lint` em loop de autocorreção até zerar erros sintáticos e de provedor.
  * **2.4. Policy-as-Code com OPA (Open Policy Agent) e Sentinel:** Avaliação do JSON do `terraform plan` contra políticas Rego (ex.: proibir buckets S3 públicos, exigir tags de centro de custo e criptografia KMS).
  * **2.5. Workflow PR-First com Revisão Assistida por IA:** Agente que abre Pull Request com a mudança de IaC e comenta a análise de risco e recursos afetados.
  * **2.6. Detecção de Drift de Infraestrutura e Sugestões de Correção:** Identificação de alterações manuais feitas no console da cloud (*ClickOps*) e geração automática do código IaC para reconciliar o estado.
  * **Prática 1:** Desenvolvimento de um **Copilot de IaC** que recebe um requisito de infraestrutura, gera o módulo Terraform, valida com `terraform validate/plan` e aplica políticas OPA antes de abrir o PR.
* **Documentações Oficiais e Seções Específicas:**
  * [Open Policy Agent – Terraform Policy Evaluation Tutorial](https://www.openpolicyagent.org/docs/latest/terraform/).
  * [Terraform CLI – JSON Output Format (`terraform show -json`)](https://developer.hashicorp.com/terraform/internals/json-format).
  * [Pulumi Automation API Documentation](https://www.pulumi.com/docs/iac/using-pulumi/automation-api/).

---

### Sessão 6.3 (Unidade III): Agentes para Kubernetes – Deploy e Operação
* **Posição na Etapa:** Unidade III – Orquestração inteligente de containers e GitOps.
* **Conteúdo Programático:**
  * **3.1. Geração e Ajuste de Manifests YAML via NL:** Criação de `Deployment`, `StatefulSet`, `ConfigMap`, `PodDisruptionBudget` e *Probes* (`liveness`, `readiness`, `startup`) seguindo melhores práticas de produção.
  * **3.2. Configuração Inteligente de HPA e VPA:** Cálculo assistido de *HorizontalPodAutoscaler* e *VerticalPodAutoscaler* com base em métricas de CPU, memória e latência.
  * **3.3. Autoscaling Baseado em Workload e Métricas Customizadas:** Geração de `ScaledObject` do **KEDA** baseado em tamanho de filas (SQS, Kafka, RabbitMQ) ou tráfego HTTP.
  * **3.4. Gerenciamento Automatizado de Ingress, Services e Network Policies:** Isolamento *Zero-Trust* gerando `NetworkPolicy` (Calico/Cilium) a partir do mapa de comunicação real dos serviços.
  * **3.5. Estratégias de Rollout/Rollback Guiadas por IA:** Implementação de *Canary*, *Blue-Green* e *Progressive Delivery* com **Argo Rollouts** e análise automatizada de métricas durante o rollout.
  * **3.6. Integração com GitOps (Argo CD e Flux):** Agentes que nunca rodam `kubectl apply` direto no cluster produtivo, mas operam via commits auditáveis no repositório GitOps monitorado pelo Argo CD / Flux.
  * **Prática 2:** Construção de um **Agente Kubernetes** para deployment end-to-end via GitOps com validação automática de *readiness* e *health checks*.
* **Documentações Oficiais e Seções Específicas:**
  * [Kubernetes Official Docs – HorizontalPodAutoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) e [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
  * [Argo Rollouts – Canary & AnalysisRun Specification](https://argoproj.github.io/argo-rollouts/features/analysis/).
  * [Argo CD – Declarative GitOps Setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/).

---

### Sessão 6.4 (Unidade IV): Troubleshooting Assistido e Diagnóstico Inteligente
* **Posição na Etapa:** Unidade IV – Redução drástica de MTTR (*Mean Time to Resolution*) em incidentes.
* **Conteúdo Programático:**
  * **4.1. Framework ReAct para Troubleshooting Estruturado:** O agente formula uma hipótese de falha, executa uma ferramenta de leitura (`kubectl describe`, consulta de log ou métrica), analisa a evidência e refina a hipótese até isolar a causa-raiz.
  * **4.2. Diagnóstico Automatizado de Erros Comuns no Kubernetes:** Investigação autônoma de `CrashLoopBackOff`, `ImagePullBackOff`, `OOMKilled`, `CreateContainerConfigError`, `FailedScheduling` e falhas de DNS/CoreDNS.
  * **4.3. Análise Inteligente de Logs Distribuídos e Stack Traces:** Agrupamento semântico de milhões de linhas de log, filtragem de ruído e identificação da primeira exceção da cadeia.
  * **4.4. Correlação de Traces (Jaeger, Zipkin, OpenTelemetry) e Métricas para RCA:** Rastreamento de requisições através de microsserviços usando `trace_id` para descobrir qual dependência downstream causou o gargalo.
  * **4.5. Detecção de Latência, Erros 5xx e Degradação de Performance:** Identificação de *tail latency* (P99), saturação de pool de conexões e vazamento de memória.
  * **4.6. Sugestão Automatizada de Fixes e Remediações:** Geração do patch exato (aumento de `memorylimit`, correção de variável de ambiente ou rollback de imagem) com justificativa baseada nas evidências coletadas.
  * **Prática 3:** Implementação de um **Sistema de Diagnóstico Automático de Pods** (integrando conceitos do K8sGPT + Agente ReAct com ferramentas readonly do cluster).
* **Documentações Oficiais e Seções Específicas:**
  * [Kubernetes – Debug Running Pods & Application Introspection](https://kubernetes.io/docs/tasks/debug/debug-application/).
  * [K8sGPT Official Documentation – Analyzers & Custom Rest Integrations](https://docs.k8sgpt.ai/).
  * [OpenTelemetry Specification – Traces & Context Propagation](https://opentelemetry.io/docs/concepts/signals/traces/).

---

### Sessão 6.5 (Unidade V): AIOps e Observabilidade Inteligente
* **Posição na Etapa:** Unidade V – Telemetria assistida por IA e aprendizado de máquina preditivo.
* **Conteúdo Programático:**
  * **5.1. Geração de Queries PromQL e LogQL via Linguagem Natural:** Tradução de perguntas operacionais (ex.: *"Qual serviço teve maior aumento percentual de erro 500 nos últimos 15 minutos comparado a ontem?"*) em queries **PromQL** e **LogQL** válidas via RAG das métricas exportadas (`/api/v1/label/__name__/values`).
  * **5.2. Criação Automatizada de Dashboards Grafana Contextualizados:** Geração programática do modelo JSON de dashboards do Grafana (RED Metrics: *Rate, Errors, Duration* e USE Metrics: *Utilization, Saturation, Errors*) provisionados via API.
  * **5.3. Detecção de Anomalias com Machine Learning:** Uso de **Prophet** (sazonalidade diária/semanal) e **Isolation Forest** para detectar desvios sutis que alertas de *threshold* estático não capturam.
  * **5.4. Correlação Inteligente entre Métricas, Logs e Traces:** Unificação dos 3 pilares da observabilidade via *Exemplars* e labels padronizados.
  * **5.5. Alertas Preditivos e Redução de Falsos Positivos:** Agrupamento inteligente de tempestades de alertas (*alert correlation & suppression*) para combater a fadiga de plantão.
  * **5.6. Análise de Tendências e Forecasting de Recursos:** Previsão de esgotamento de disco, cota de IPs ou saturação de cluster com semanas de antecedência.
  * **Prática 4:** Construção de um **Dashboard Inteligente com Pipeline de Detecção de Anomalias** em tempo real e assistente NL-to-PromQL.
* **Documentações Oficiais e Seções Específicas:**
  * [Prometheus – Querying Basics & PromQL Functions (`rate`, `histogram_quantile`, `predict_linear`)](https://prometheus.io/docs/prometheus/latest/querying/functions/).
  * [Grafana Loki – LogQL Query Language Reference](https://grafana.com/docs/loki/latest/query/).
  * [Grafana HTTP API – Dashboards Provisioning](https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/).

---

### Sessão 6.6 (Unidade VI): ChatOps com Aprovação Humana e Governança
* **Posição na Etapa:** Unidade VI – Operação colaborativa e auditável dentro do chat da equipe.
* **Conteúdo Programático:**
  * **6.1. Arquitetura de Bots Conversacionais para Slack, Discord e Microsoft Teams:** Eventos via WebSockets/Socket Mode ou Webhooks assinados criptograficamente.
  * **6.2. Implementação de Comandos Seguros:** Arquitetura dos comandos `/deploy`, `/scale`, `/rollback` e `/investigar` integrados ao agente orquestrador.
  * **6.3. Visualização de Diffs e Análise de Impacto no Chat:** Renderização clara do `diff` exato que será aplicado e estimativa de impacto antes de qualquer ação.
  * **6.4. Workflows de Aprovação com Guardrails e Circuit Breakers:** Botões interativos (`[Aprovar Deploy]` / `[Rejeitar]`) que exigem confirmação explícita (*Human-in-the-Loop*) com expiração por timeout.
  * **6.5. Integração com RBAC (Role-Based Access Control):** Validação da identidade do usuário no Slack/Teams contra grupos de permissão (ex.: apenas Tech Leads ou SREs de plantão podem clicar em *Aprovar Produção*).
  * **6.6. Auditoria e Rastreabilidade:** Registro imutável de quem solicitou, qual plano a IA gerou, quem aprovou e qual foi o saída da execução.
  * **Prática 5:** Desenvolvimento de um **Bot de ChatOps** em Node.js/TypeScript com fluxo de aprovação humana para deploys e rollbacks.
* **Documentações Oficiais e Seções Específicas:**
  * [Slack Bolt for JavaScript – Slash Commands & Block Kit Actions](https://tools.slack.dev/bolt-js/concepts/commands/).
  * [Slack Block Kit Builder & Interactive Modals](https://api.slack.com/block-kit).

---

### Sessão 6.7 (Unidade VII): Segurança e Compliance Assistidos por IA (DevSecOps)
* **Posição na Etapa:** Unidade VII – Automação de segurança contínua na infraestrutura e containers.
* **Conteúdo Programático:**
  * **7.1. Scan Automatizado de IaC e Containers:** Orquestração de **Snyk**, **Trivy** e **Checkov** gerando relatórios em JSON/SARIF.
  * **7.2. "AI Fix" Automático de Vulnerabilidades Detectadas:** Agente que lê o relatório SARIF do scanner, localiza o `Dockerfile` ou arquivo `.tf` vulnerável e gera automaticamente o Pull Request corrigindo a configuração ou atualizando a imagem base.
  * **7.3. Detecção e Prevenção de Vazamento de Secrets:** Combinação de scanners determinísticos (Gitleaks/TruffleHog) com classificação semântica por IA para barrar chaves, tokens e senhas antes do commit/merge.
  * **7.4. Explicação de Políticas OPA em Linguagem Natural:** Tradução de falhas de políticas Rego complexas em orientações claras de correção para o desenvolvedor.
  * **7.5. Remediação Guiada de CVEs e Vulnerabilidades Críticas:** Priorização baseada em explotabilidade real (*EPSS* + análise de alcançabilidade do código pelo agente).
  * **7.6. Geração de Relatórios de Compliance (SOC2, ISO 27001, PCI-DSS):** Coleta automatizada de evidências técnicas de infraestrutura e mapeamento para os controles regulatórios exigidos pelos auditores.
* **Documentações Oficiais e Seções Específicas:**
  * [Trivy Documentation – Scanning Containers, Kubernetes & IaC (JSON/SARIF)](https://trivy.dev/latest/docs/target/).
  * [Checkov Documentation – Suppressing & Fixing Policies](https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html).

---

### Sessão 6.8 (Unidade VIII): CI/CD Copilot e Pipelines Inteligentes
* **Posição na Etapa:** Unidade VIII – Esteiras de integração e entrega contínua autônomas e auto-otimizadas.
* **Conteúdo Programático:**
  * **8.1. Geração Automatizada de Pipelines:** Criação e tradução entre **GitHub Actions**, **GitLab CI** e **Jenkinsfiles** a partir da detecção da stack do repositório.
  * **8.2. Gates Inteligentes:** Orquestração dinâmica de testes automatizados, **SAST** (Semgrep/CodeQL), **DAST** (OWASP ZAP) e *Dependency Scanning*.
  * **8.3. Análise de Impacto de Mudanças em Pull Requests:** Agente revisor de PR que analisa a árvore de dependências afetadas pelo `git diff` e seleciona os testes relevantes.
  * **8.4. Recomendações de Estratégias de Deployment:** Classificação automática do risco da release para sugerir *Standard Rolling Update*, *Canary 5%* ou *Blue-Green*.
  * **8.5. Otimização de Tempo de Build e Cache Inteligente:** Diagnóstico de etapas lentas no CI, configuração automática de cache de camadas Docker (*BuildKit*) e paralelização de jobs (*matrix strategy*).
  * **8.6. Rollback Automático Baseado em Métricas de Qualidade:** Monitoramento pós-deploy integrado ao Prometheus/Datadog que dispara reversão imediata se a taxa de erro ou latência violar o SLO.
* **Documentações Oficiais e Seções Específicas:**
  * [GitHub Actions Documentation – Workflow Syntax & Security Hardening](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions).
  * [GitLab CI/CD YAML Syntax Reference](https://docs.gitlab.com/ee/ci/yaml/).

---

### Sessão 6.9 (Unidade IX): FinOps e Otimização de Custos com IA
* **Posição na Etapa:** Unidade IX – Eficiência financeira contínua em nuvem e Kubernetes.
* **Conteúdo Programático:**
  * **9.1. Estimativa de Custos em Pull Requests com Infracost:** Integração do **Infracost** no CI com um agente FinOps que explica o impacto financeiro mensal do PR e sugere alternativas mais econômicas antes do provisionamento.
  * **9.2. Rightsizing de Pods e Nodes Baseado em Histórico de Uso:** Cruzamento das métricas reais do Prometheus (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`) com os `requests/limits` declarados para eliminar desperdício (*slack*).
  * **9.3. Recomendações de Instâncias Spot e Reservadas:** Identificação de workloads *stateless* tolerantes a falhas elegíveis para *Spot Instances* (economia de até $70\%\text{–}90\%$) e cálculo de cobertura de *Reserved Instances / Savings Plans*.
  * **9.4. Detecção de Recursos Ociosos e "Zombie Resources":** Varredura automatizada de volumes EBS/PersistentVolumes desanexados, Elastic IPs ociosos, Load Balancers sem targets e ambientes de staging esquecidos.
  * **9.5. Forecasting de Custos com Machine Learning:** Projeção da fatura cloud por produto/squad e alerta precoce de anomalias de gasto (*Cost Anomaly Detection*).
  * **9.6. Otimização de Armazenamento e Networking:** Políticas inteligentes de *Lifecycle* (S3 Standard $\rightarrow$ Intelligent-Tiering / Glacier) e redução de custos de tráfego *Cross-AZ* e *NAT Gateway*.
* **Documentações Oficiais e Seções Específicas:**
  * [Infracost Documentation – CI/CD Integration & JSON Output](https://www.infracost.io/docs/integrations/cicd/).
  * [FinOps Foundation – Cloud FinOps Framework & Capabilities](https://www.finops.org/framework/).

---

### Sessão 6.10 (Unidade X): RAG de Runbooks e Post-Mortem Automático
* **Posição na Etapa:** Unidade X – Gestão do conhecimento operacional e aprendizado pós-incidente.
* **Conteúdo Programático:**
  * **10.1. Arquitetura de RAG para Documentação Técnica Interna:** Estratégias de *chunking* que preservam blocos de código Bash/kubectl, tabelas de parâmetros e hierarquia de títulos Markdown.
  * **10.2. Indexação de Playbooks, READMEs e Wikis Corporativos:** Conector contínuo com Git, Notion, Confluence e Backstage mantendo a base vetorial sincronizada a cada merge.
  * **10.3. Agente que Consulta e Executa Runbooks Automaticamente:** Dado um alerta do PagerDuty/Alertmanager, o agente localiza o runbook oficial correspondente e executa as etapas de verificação em modo assistido.
  * **10.4. Geração Automática de Timelines de Incidentes:** Consolidação cronológica precisa dos eventos do alerta, gráficos de métricas, commits de deploy e conversas da *war room* no Slack.
  * **10.5. Extração de Lições Aprendidas (Lessons Learned):** Identificação do que funcionou bem, onde houve atraso na detecção (MTTD) ou mitigação (MTTR) e geração de itens de ação preventivos (*Action Items*).
  * **10.6. Templates de Post-Mortem Blameless Automatizados:** Geração de documentos de Post-Mortem focados em falhas sistêmicas e melhorias arquiteturais (cultura *Blameless SRE*).
* **Documentações Oficiais e Seções Específicas:**
  * [Google SRE Book – Postmortem Culture: Learning from Failure](https://sre.google/sre-book/postmortem-culture/).

---

### Sessão 6.11 (Unidade XI): Auto-Remediação Segura com Guardrails
* **Posição na Etapa:** Unidade XI – Operação autônoma de malha fechada (*Closed-Loop Remediation*) com segurança máxima.
* **Conteúdo Programático:**
  * **11.1. Playbooks Acionados Automaticamente por Alertas:** Recebimento de webhooks do Prometheus Alertmanager / Datadog acionando fluxos de investigação e mitigação.
  * **11.2. O Fluxo de 4 Estágios:** $\text{Alerta} \rightarrow \text{Verificação de Contexto (RCA)} \rightarrow \text{Mitigação Controlada} \rightarrow \text{Validação Pós-Ação (SLOs voltaram ao verde?)}$.
  * **11.3. Canary Automático com Rollback Inteligente:** Promoção progressiva de tráfego ($5\% \rightarrow 25\% \rightarrow 50\% \rightarrow 100\%$) abortada automaticamente ao menor sinal de anomalia estatística.
  * **11.4. Circuit Breakers e Rate Limiting em Ações Automatizadas:** Travas de segurança rígidas (ex.: o agente nunca pode reiniciar mais que $N$ pods por hora ou escalar além do teto físico aprovado).
  * **11.5. Simulação (Dry-Run) Antes de Execução em Produção:** Validação obrigatória com `--dry-run=server` (Kubernetes) ou `terraform plan` antes de qualquer mutação.
  * **11.6. Human-in-the-Loop para Ações Críticas e de Alto Impacto:** Classificação de ações em *Tier 1 (Read-only - 100% autônomo)*, *Tier 2 (Mitigação reversível de baixo risco - autônomo com notificação)* e *Tier 3 (Mutação de estado/dados ou alto custo - exige aprovação humana via ChatOps)*.
* **Documentações Oficiais e Seções Específicas:**
  * [Prometheus Alertmanager – Webhook Receiver Configuration](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config).
  * [Kubernetes API – Server-Side Dry Run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run).

---

### Sessão 6.12 (Unidade XII): Projeto Integrador e Casos Práticos de DevOps com IA
* **Posição na Etapa:** Unidade XII (Projeto Final da Disciplina de DevOps).
* **Conteúdo Programático:**
  * **12.1. Desenvolvimento de Agente ou Copilot DevOps Completo:** Arquitetura modular em código unificando as capacidades construídas nas Práticas 1 a 5.
  * **12.2. Integração de Múltiplos Componentes ($\text{IaC} + \text{K8s} + \text{Observability} + \text{ChatOps}$):** Um fluxo ponta a ponta onde o copilot provisiona/valida IaC, implanta no Kubernetes, monitora métricas/logs, diagnostica falhas com RAG de Runbooks e interage via ChatOps.
  * **12.3. Implementação de Guardrails e Políticas de Segurança:** Validação OPA, sanitização de comandos, RBAC e *Approval Gates*.
  * **12.4. Testes de Validação e Simulação de Cenários Reais:** Simulação de incidentes reais (`OOMKilled`, deploy com bug `5xx`, PR com falha de segurança e explosão de custo) para comprovar a atuação do agente.
  * **12.5 & 12.6. Apresentação, Análise de Viabilidade, ROI e Melhores Práticas:** Cálculo do ganho de produtividade da engenharia, redução de MTTR/MTTD e custos de operação da plataforma de IA.
