# Histórias e backlog de UX

## Histórias com aceite observável

Todas são especificações propostas; nenhum aceite de runtime está marcado como executado. E0–E6 devem ser exercitados nas rotas vinculadas, além do caminho principal.

| ID e prioridade | História e rotas | Critérios de aceite |
| --- | --- | --- |
| US01 P0 | Como visitante, quero entender a oferta antes de contratar; PUB01–PUB06 | Dado catálogo indisponível, não mostrar preço de exemplo; dado preço confirmado, informar BRL e recorrência; sem depoimentos ou parceiros não comprovados |
| US02 P0 | Como usuário, quero autenticar e retomar contexto; AUTH01, APP01 | Dada sessão válida e membership, abrir destino interno autorizado; sem membership, não carregar tenant; callback inválido não redireciona externamente; erro/timeout recuperável |
| US03 P0 | Como responsável, quero configurar canal e equipe; APP01, APP17–APP21 | Cada etapa representa estado confirmado; canal sem autorização permanece pendente; falha Meta não impede organização local autorizada; timezone IANA explícito |
| US04 P0 | Como atendente, quero responder sem duplicação; APP03–APP04 | Servidor revalida finalidade, canal, janela e acesso; janela fechada exige modelo elegível; timeout mostra confirmação pendente e não dispara novamente sem consulta; IA falha permite redigir |
| US05 P0 | Como gestor, quero atribuir e acompanhar fila; APP02–APP04 | Apenas equipe no escopo; conflito revela estado atual permitido e pede revisão; atribuição confirmada atualiza lista, detalhe e auditoria; troca de tenant limpa contexto |
| US06 P0 | Como atendente, quero registrar contato e opt-out; APP05–APP06, APP22 | Cadastro não implica consentimento; possível duplicidade não é mesclada; revogação mostra finalidade/canal; ação enfileirada revalida elegibilidade antes de enviar |
| US07 P0 | Como vendedor, quero organizar oportunidade; APP07–APP08 | Mover por teclado e toque; valor ausente permanece desconhecido; ganho comercial não vira receita verificada; falha/conflito restaura versão confirmada |
| US08 P0 | Como vendedor, quero próxima ação com prazo; APP09–APP10 | Responsável e vínculo respeitam objeto; data mostra timezone; concluir aguarda confirmação; horário ambíguo exige revisão; tarefa não equivale a mensagem enviada |
| US09 P0 | Como gestor autorizado, quero publicar automação revisada; APP11–APP12 | Rascunho não envia; resumo inclui finalidade, canal, horário e escopo; publicação/execução revalidam direitos; pausa diferencia pedido e efeito; falhas têm diagnóstico sem loop infinito |
| US10 P1 | Como gestor, quero assistência com conhecimento autorizado; APP13–APP14 | Indexação pendente não é pronta; conteúdo é isolado por tenant; sugestão exige revisão; nenhuma alegação factual/chave de pagamento inventada; teste sandbox não envia |
| US11 P0 | Como gestor, quero interpretar indicadores; APP15 | Período/timezone/fonte/atualização identificáveis; sem base não há variação percentual; receita/proposta/estimativa distintas; sem fonte confiável exibir indisponível |
| US12 P0 | Como financeiro, quero contratar com segurança; APP16, APP23 | Revisar preço/recorrência confirmados antes de sair; retorno inicia consulta; entitlement vem do servidor; repetição da mesma intenção não duplica; sem meio de pagamento presumido |
| US13 P0 | Como financeiro, quero entender divergência e cancelamento; APP16, ADM05 | Duplicata/atraso/timeout não criam sucesso falso; mudança/cancelamento mostram efeito confirmado; sem política não prometer tolerância, reembolso ou acesso vitalício |
| US14 P0 | Como titular/responsável, quero exercer privacidade; PUB05, APP21–APP22 | Finalidade específica, opções livres, revogação facilitada; solicitação verifica identidade e mostra protocolo real; retenção necessária é explicada sem apagar prova indiscriminadamente |
| US15 P0 | Como suporte interno, quero diagnóstico mínimo; ADM01–ADM04, ADM06 | Identidade interna/MFA e escopo; motivo para consulta; sem corpo de conversa ou token; ação autorizada é auditada; não há impersonação implícita |
| US16 P0 | Como auditor, quero trilha sanitizada; ADM07 | Somente leitura; eventos no escopo; sem payload pessoal; filtro vazio difere de sistema indisponível; exportação não vem por herança |
| US17 P0 | Como pessoa que usa teclado, quero concluir tarefas críticas; todas P0 | Fluxos de 06 executáveis sem arraste; foco visível e restaurado; feedback anunciado; erro associado ao campo; zoom/reflow e contraste verificados no produto futuro |
| US18 P0 | Como usuário, quero estado honesto em falha; todas P0 | Loading, vazio, erro, negado, timeout e sucesso definidos; integração falha não derruba módulo local permitido; dados desatualizados identificados; nenhuma métrica inventada |

## Backlog explícito

| Prioridade | Item | Estado e dependência | Critério para encerrar |
| --- | --- | --- | --- |
| P0 B01 | Obter PRD V01–V24 e arquitetura geral | Bloqueado por referência ausente | Traçar todos os requisitos e recontar rotas P0 contra PRD |
| P0 B02 | Obter OpenAPI e segurança/governança | Bloqueado por referência ausente | Extrair métodos/schemas/erros/RBAC existentes e revisar compatibilidade |
| P0 B03 | Obter tokens, logo original e validação de arte | Bloqueado por referência ausente | Resolver divergências e aprovar aplicação de Inter e contraste sem redesenhar símbolo |
| P0 B04 | Aprovar semântica de papéis e escopo | Proposta pronta, depende B01/B02 | Matriz ligada a capacidades reais e isolamento por objeto |
| P0 B05 | Validar base legal, avisos e política de retenção | Pendente Privacidade/Jurídico | Finalidades/canais/DSAR e opt-out aprovados |
| P0 B06 | Definir catálogo de assinatura e regras de acesso | Pendente Produto/Financeiro e contrato | Preços/recorrência/cancelamento/entitlements verificados; sem inferir do ZIP |
| P0 B07 | Reconciliar rotas, wireframes, estados e histórias | Especificação entregue; validação documental executável | Catálogo íntegro e sem tela crítica órfã no escopo candidato |
| P0 B08 | Validar protótipo e acessibilidade com pessoas | Planejado; requer protótipo autorizado | Testes de tarefas e revisão dos impedimentos críticos |
| P0 B09 | Medir baseline e gates de performance | Planejado; sem aplicação | Perfil aprovado, medições reais por rota e RUM segmentado |
| P0 B10 | Testar isolamento, assinatura e canal reais | Fase técnica futura, não iniciada | RLS PostgreSQL real e sandbox oficial, sem mock em produção |
| P1 B11 | Importação/exportação de contatos e relatórios | Não implementado; contrato ausente | Permissão própria, limites, proveniência e teste de privacidade |
| P1 B12 | Conhecimento e assistente detalhado | UX básica definida; depende PRD | Estados de indexação/fonte/handoff validados e contrato disponível |
| P1 B13 | Preferências e atalhos configuráveis | Proposta | Pesquisa confirma necessidade sem prejudicar teclado/leitor |
| P2 B14 | Refinar descoberta e atalhos analíticos | Hipótese | Evidência de uso prioriza; sem ampliar canais ou produtos |

Nenhum item de implementação de etapa posterior foi executado. Bloqueio por fonte ausente não autoriza fabricar PRD, OpenAPI, credenciais ou produto de demonstração.
