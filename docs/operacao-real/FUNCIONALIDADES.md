# Cobertura funcional observada

Esta análise cobre o código e os fluxos disponíveis. O PRD V01–V24 não foi fornecido; não é possível atestar cobertura integral desses módulos. O usuário confirmou que não existia OpenAPI original. O contrato inicial implementado está em `venda-api/contracts/venda.openapi.yaml`.

| Funcionalidade | Situação comprovável | Limite atual |
|---|---|---|
| Login e sessão | OIDC com Keycloak real validado no navegador; sessão opaca, cookie restrito, CSRF e logout exercitados | Testes usam identidades temporárias isoladas. Primeiro usuário do ambiente persistente ainda precisa criar sua conta. |
| Cadastro | Cadastro nativo habilitado no Keycloak local | Jornada de cadastro do primeiro usuário real ainda não executada; verificação de e-mail depende de SMTP. |
| Recuperação de senha | Tela informa indisponibilidade | Envio de e-mail e recuperação ponta a ponta não operacionais. |
| Organização | Criação, consulta e edição persistentes; fuso IANA | Gestão completa de ciclo de vida empresarial ainda não definida em PRD. |
| Membership e papéis | owner/admin/manager/agent/viewer/billing, checagem server-side, revogação e isolamento testados | Convites por e-mail indisponíveis; console interno não usa a sessão do cliente. |
| Contatos | CRUD, busca, paginação, arquivamento, versão e idempotência reais | Importação/exportação em massa e deduplicação comercial ainda não implementadas. |
| Oportunidades | CRUD e mudança de etapa no funil; vínculo de contato validado por tenant; centavos BRL | Ganho não confirma recebimento. Não há conciliação financeira nem drag-and-drop implementado. |
| Tarefas | CRUD, vínculo autorizado, conclusão, prazo com fuso explícito e arquivamento | Lembretes externos e calendário integrado ainda não implementados. |
| Conhecimento | CRUD de fontes textuais com persistência | Upload, ingestão, embeddings, busca vetorial e respostas de IA ausentes. |
| Automações | Wizard de rascunho, ativação explícita, pausa, worker separado e recibos; criação de tarefa por evento local | Sem envio de mensagens ou IA. Automações não encadeiam tarefas geradas automaticamente. |
| Retentativas internas | Outbox, processamento atômico, dedupe/recibo, retries limitados e dead-letter no banco | Não equivale a um pipeline SQS/DLQ implantado na AWS; console de reprocessamento ainda ausente. |
| Relatórios | Contagens e soma de propostas consultadas no PostgreSQL | Sem histórico temporal, gráficos financeiros ou receita recebida. Campo de receita confirmada permanece indisponível. |
| Conversas | Estrutura visual e estado de integração indisponível, sem conversas falsas | Recebimento, envio, templates e atribuição de conversas não operacionais. |
| Canal WhatsApp | Estado de configuração pendente | Cadastro Meta/WABA/número e adapter oficial ainda ausentes. |
| Assinatura e faturamento | Credenciais de conta de teste BR autenticadas; port de leitura disponível, sem preços ou assinatura inventados | Mercado Pago, webhook, reconciliador e entitlements ainda não implementados. |
| Consentimento e privacidade | Requisitos documentados e estado pendente | Captura por finalidade/canal, evidências, DSAR, retenção e exclusão precisam implementação. |
| Console admin | Fronteira arquitetural declarada | venda-admin/venda-admin-api, identidade interna, MFA e jornadas administrativas não operacionais. Admin técnico do Keycloak não substitui esse console. |
| Marca e responsividade | Inter local, tokens da marca, símbolo transparente, menu claro; capturas e testes automatizados de acessibilidade/reflow | SVG oficial e aprovação de direção de arte pendentes. Auditoria assistiva humana não executada. Consultar browser.json para o resultado da rodada final. |
| Produção e operação | Ambiente local real isolado, sem seeds comerciais | Deploy AWS, recuperação de backup, observabilidade operacional, carga acordada e RUM não certificados. |

## Backlog

- **P0:** primeiro acesso real do usuário; implementar e validar WhatsApp e consentimento operacional; assinatura Mercado Pago com reconciliação/entitlements; console admin com identidade/MFA separados; concluir os gates de segurança e disponibilidade antes de publicação.
- **P1:** SMTP e recuperação/convites; DSAR, retenção e exclusão; IA/RAG com contrato e provedor definidos; testes assistivos manuais; carga e restauração de backup; operação de DLQ.
- **P2:** importação/exportação, relatórios históricos, integrações de calendário, navegação por arraste acessível e otimizações após medição de volume real.

O produto **não está 100% funcional**. Aprovação dos testes do núcleo implementado não transforma integrações ausentes ou telas indisponíveis em funcionalidades concluídas.
