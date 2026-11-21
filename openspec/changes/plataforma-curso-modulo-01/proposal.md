## Why

Transformar a estrutura curricular do curso de Engenharia de Software em IA Aplicada (iniciando pelo **Módulo 01: Fundamentos de IA e LLMs para Programadores**) em uma plataforma de aprendizado pessoal e avaliação de maestria técnica que funcione localmente no Desktop, offline no celular Android (`.APK`) e como livro digital colorido no **Kindle Colorsoft** (via *Send to Kindle*). Além da leitura aprofundada com gráficos das documentações oficiais e ilustrações geradas via **Nano Banana**, o sistema precisa validar a qualidade real do conhecimento através de provas de até 30 questões por sessão, um dashboard analítico de desempenho com recomendações acionáveis do que melhorar e uma Skill dedicada para auditar o rigor técnico do conteúdo frente às documentações oficiais.

## What Changes

- **Produção Completa do Conteúdo do Módulo 01 (11 Capítulos + Ilustrações + 11 Provas):**
  - Criação dos 11 capítulos aprofundados (correspondentes às Sessões 1.1 a 1.11 de `Docs/modulo-01-fundamentos-ia-e-llms.md`) em formato de livro técnico rico, fundamentados nas documentações oficiais mapeadas.
  - Geração e incorporação de gráficos e diagramas técnicos extraídos das documentações oficiais ou gerados via **Nano Banana** com paleta de alto contraste e fundo claro, otimizados para telas OLED/LCD e para a tela E-Ink colorida (*Kaleido 3*) do **Kindle Colorsoft**.
  - Criação de um banco de avaliação com **até 30 questões por sessão** (11 provas no Módulo 01), cada questão contendo metadados de subtópico, nível cognitivo (Conceitual, Arquitetura Interna, Prática/Debug de Código), âncora para a seção do capítulo, link da documentação oficial e gabarito comentado.
- **Skill de Revisão e Auditoria de Conteúdo (`course-content-reviewer`):**
  - Criação da skill `.agents/skills/course-content-reviewer/SKILL.md` responsável por auditar capítulos e bancos de questões gerados, verificando fidelidade às documentações oficiais, profundidade didática, precisão técnica dos gabaritos e compatibilidade visual das imagens para o Kindle Colorsoft.
- **Motor de Provas e Dashboard de Desempenho & Diagnóstico ("O que melhorar"):**
  - Interface interativa de avaliação por sessão (modo prova completa de até 30 questões, simulado rápido e modo *"Caderno de Erros"* focado nas questões/tópicos errados anteriormente).
  - Dashboard analítico exibindo métricas de desempenho por sessão e consolidado do módulo, radar por nível cognitivo, histórico de evolução e motor de diagnóstico *"O que posso melhorar"* que identifica os subtópicos com menor taxa de acerto e aponta links diretos para reler o trecho exato do capítulo e a documentação oficial.
- **Plataforma Leitora Multiplataforma (Desktop Local + `.APK` Android + `.EPUB` Kindle Colorsoft):**
  - Aplicação Web Local-First (Fase 1 focada em texto, gráficos, provas e dashboard; preparada no schema de dados para receber Áudio do Gemini Notebook e Vídeos na Fase 2 e Tutor Gemini na Fase 3).
  - Empacotamento nativo Android via Capacitor gerando o instalador `.APK` 100% offline utilizando o Android SDK local, com exportação/importação de backup de progresso (`.json`) entre Desktop e Android.
  - Compilador Node.js para geração de arquivo `.EPUB` (EPUB 3 colorido) com capa, sumário navegável, capítulos, gráficos de alta resolução embutidos e caderno de questões com gabarito comentado, pronto para envio via **Send to Kindle** ao Kindle Colorsoft.

## Capabilities

### New Capabilities
- `content-authoring-and-review`: Especifica a estrutura dos 11 capítulos aprofundados do Módulo 01, diretrizes de geração de gráficos (Nano Banana e documentações oficiais) compatíveis com Kindle Colorsoft, estrutura do banco de até 30 questões por sessão e o protocolo de auditoria da skill `course-content-reviewer`.
- `assessment-and-analytics-dashboard`: Especifica o motor de aplicação de provas por sessão, cálculo de métricas de qualidade do conhecimento, dashboard de desempenho por sessão e módulo, diagnóstico automático de lacunas (*"O que posso melhorar"*) e modo de revisão direcionada (*Caderno de Erros*).
- `multiplatform-reader-and-kindle`: Especifica a aplicação leitora para Desktop local, o build do pacote `.APK` Android offline, a sincronização/backup de progresso do aluno, o gerador de `.EPUB` colorido para Send to Kindle (Kindle Colorsoft) e os pontos de extensão para Áudio (Gemini Notebook), Vídeo e Tutor Gemini.

### Modified Capabilities
<!-- Nenhuma capability existente está sendo modificada. -->

## Impact

- **Novos Diretórios e Conteúdo:**
  - `.agents/skills/course-content-reviewer/SKILL.md` (Skill de auditoria técnica, didática e visual).
  - `content/modulo-01/` (11 capítulos em Markdown `cap-01.md` a `cap-11.md`, `assets/` com gráficos PNG/JPG de alto contraste e `quizzes/quiz-s01.json` a `quiz-s11.json` com até 30 questões por sessão).
- **Aplicação e Ferramentas de Build:**
  - Aplicação Web + Capacitor Android (`app/` ou raiz estruturada) para execução local Desktop e compilação do `.APK` usando o Android SDK local (`$env:LOCALAPPDATA\Android\Sdk`).
  - Script compilador de EPUB 3 (`scripts/build-epub.ts` / `npm run build:kindle`) gerando o artefato `.epub` colorido para o Kindle Colorsoft.
