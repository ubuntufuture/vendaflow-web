# Permissões consentimento e integrações

## Matriz de capacidades proposta

Legenda: S = permitido somente com membership ativo, objeto no escopo e entitlement aplicável; E = depende de concessão explícita; N = negado. Não são permissões de backend implementadas. Negação prevalece e o servidor revalida a cada uso. Alterar botão, URL ou cache não concede acesso.

| Ação | Responsável | Gestor | Atendente | Financeiro cliente | Suporte interno | Financeiro interno | Auditor interno |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ler conversas e contatos | S | S equipe autorizada | S atribuídos/escopo | N | N | N | N |
| Enviar mensagem elegível | S | S | S escopo | N | N | N | N |
| Atribuir conversa | S | S equipe | E transferência permitida | N | N | N | N |
| Editar contato/oportunidade/tarefa | S | S equipe | S escopo | N | N | N | N |
| Consultar prova de consentimento | S | E | E mínimo necessário | N | N | N | N |
| Registrar revogação do titular | S | S | S escopo | N | N | N | N |
| Publicar/pausar automação | S | E | N | N | N | N | N |
| Configurar IA/conhecimento | S | E | N | N | N | N | N |
| Relatórios da organização | S | E | E próprios | N | N | N | N |
| Exportar dados | E | E | N | N | N | N | N |
| Conectar canal/gerir equipe | S | E | N | N | N | N | N |
| Gerir assinatura | S | N | N | S | N | N | N |
| Ver metadados técnicos internos | N | N | N | N | S escopo interno | E | E |
| Reconciliar assinatura | N | N | N | N | N | E | N |
| Consultar auditoria interna | N | N | N | N | E escopo | E escopo | S escopo |
| Impersonar cliente/marcar pago | N | N | N | N | N | N | N |

Responsável não recebe superpoderes para contornar opt-out, janela, suspensão de canal ou assinatura. Leitura local durante falha de provedor segue direitos efetivos, não a cor do status. Papel interno exige identidade interna e MFA reforçado; acesso extraordinário não é desenhado sem política aprovada.

## Matriz de estado e ação

| Estado | Leitura | Mutação local autorizada | Envio/publicação | Faturamento | Mensagem/ação UX |
| --- | --- | --- | --- | --- | --- |
| Sessão ausente/expirada | Só público | Negada | Negado | Só público | Entrar e retomar destino interno seguro |
| Membership revogado | Nenhum dado do tenant | Negada | Negado | Negado | Limpar tela/cache e selecionar organização permitida |
| Objeto fora do escopo | Sem metadados do objeto | Negada | Negado | N/A | Resposta uniforme sem confirmar existência |
| Entitlement desconhecido | Somente o que servidor autorizar | Conforme servidor | Bloquear ação dependente | Consultar estado | “Não foi possível confirmar seus recursos” |
| Canal desconectado | CRM local permitido | Permitida conforme capacidade | Bloqueado | Independente | Reconectar se autorizado; salvar tarefa local |
| Janela fechada | Permitida | Permitida | Somente modelo aprovado e elegível | Independente | Explicar modelo, finalidade e política |
| Consentimento ausente/revogado | Mínimo legalmente permitido | Registrar prova/revogação | Bloquear finalidade/canal afetados | Independente | Não pedir consentimento marcado por padrão |
| IA indisponível | Permitida | Permitida | Resposta humana elegível | Independente | “Assistência indisponível; continue manualmente” |
| Assinatura em confirmação | Direitos vigentes confirmados | Conforme direito efetivo | Conforme direito efetivo | Consultar sem cobrar de novo | “Aguardando confirmação” |
| Assinatura suspensa/cancelada | Política de retenção e acesso a contratar | Conforme contrato | Negado se sem direito | Recuperar/cancelar conforme estado | Não inventar tolerância ou apagar dados automaticamente |
| Operação em timeout | Estado confirmado anterior rotulado | Não duplicar intenção pendente | Consultar estado | Não abrir nova cobrança automática | “Ainda não confirmamos a operação” |
| Fila/DLQ com falha | Local autorizado permanece | Permitida | Retentativa controlada no worker | Reconciliação independente | Progresso e diagnóstico sem payload sensível |

Combinações usam a restrição mais forte; por exemplo, canal conectado não permite enviar com membership revogado. Entre composição, clique e execução, revalidar cada guard no servidor/worker. A UI não decide política.

## Privacidade por finalidade e canal

Tratar separadamente: cadastro/execução do serviço SaaS; atendimento solicitado; comunicação transacional; marketing; uso de conteúdo em assistência IA; pesquisa de UX. A base legal aplicável a cada finalidade deve ser validada por privacidade. Não usar consentimento como base universal nem presumir legítimo interesse. Opt-in exigido pelo canal e base legal LGPD são verificações distintas.

A ficha UX de preferência precisa representar finalidade, canal, base legal validada, origem, instante e timezone exibível, versão do aviso, prova autorizada e eventual revogação. São requisitos semânticos, não novos campos de DB/API aprovados. Prova restrita e minimizada; não expor IP/documento completo a atendente. Mudança de finalidade exige revisão e nova manifestação quando aplicável. Exportação de contatos não transfere autorização de marketing.

Controle opcional desmarcado, linguagem específica, aceitar e recusar com esforço comparável. Revogação gratuita e facilitada; confirmação informa o que cessa e como acompanhar. DSAR verifica identidade proporcionalmente, mostra estado real e explica retenções legítimas; prazos/textos dependem de validação jurídica, não de cópia do ZIP. Evitar capturar conteúdo de conversas em analytics, gravações de sessão e logs.

Base normativa consultada em 21/11/2026: [LGPD, arts. 6–9 e 18](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm). A lei exige finalidade determinada e permite revogar consentimento; a seleção da base legal por caso permanece pendente de revisão jurídica.

## Disponibilidade do WhatsApp oficial

Na [política oficial consultada](https://whatsappbusiness.com/policy/), contatos subsequentes exigem opt-in e respostas livres ficam na janela de atendimento de 24 horas; fora dela, usar modelo aprovado. A política também requer caminho claro de escalada humana na automação. A UX mostra esses bloqueios antes do envio, sem substituir a checagem no processamento. O relógio local do navegador não decide elegibilidade.

Estado atual: nenhum ambiente Meta configurado ou credencial acessada. Futuro teste exige app, número de teste, permissões e destinatários autorizados, isolados de produção. Limites são os da conta e versão configurada, ainda desconhecidos; UI deve mostrar restrição recebida e recuperação, não quotas inventadas. [Erros oficiais](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes) podem chegar na resposta e no webhook; não confundir aceite síncrono com entrega. Mapear autenticação/permissão, rate limit, modelo indisponível, janela, destinatário e indisponibilidade para mensagens sanitizadas. Revalidar política no momento de implementação.

## Mercado Pago exclusivo para assinatura

Estado atual: sandbox e produção não configurados, nenhuma credencial acessada. Ambiente deve estar visível em diagnósticos internos; frontend não recebe access token nem segredo de webhook. Preço, meio elegível, recorrência, renovação e cancelamento vêm de catálogo/estado autorizados. Não assumir que exemplos de Pix/boleto do ZIP suportam recorrência.

As [notificações de Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/introduction) incluem eventos de assinatura e pagamento recorrente. A [documentação de Webhooks](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) descreve autenticação por `x-signature` e consulta do recurso após notificação. Retorno do navegador não é confirmação. Aplicar dedupe e reconciliação; não extrapolar instruções de outro produto Mercado Pago. Validar o mecanismo exato do tópico e teste suportado antes de implementar.

Limites, credenciais de teste, configuração de notificações, produtos habilitados e política de cancelamento estão pendentes. Falhas UX a cobrir: autorização negada; preço alterado antes da confirmação; checkout abandonado; timeout após submissão; recurso desconhecido; notificação duplicada/fora de ordem; pagamento recusado; estorno/contestação; reconciliação indisponível. Exibir estado inconclusivo enquanto necessário. Não criar números de cobrança, links, chaves ou comprovantes fictícios.

## Segurança prevista e revisão obrigatória

O pedido exige OIDC, cookies HttpOnly/Secure/SameSite e CSRF adequado; MFA interno; checagem de tenant e objeto por uso; RLS FORCE com role sem bypass; TLS, CSP e CORS estritos; secrets sob KMS/Secrets Manager; anexos/URLs resistentes a SSRF; limites de request; auditoria append-only; backups testados; Outbox/Inbox e idempotência. Nada disso foi implementado ou certificado neste pacote UX.

Ameaças principais: troca de ID/tenant em deep link; conteúdo de conversa com XSS; documento/URL malicioso no conhecimento; prompt injection exfiltrando outro tenant; callback de pagamento forjado; elevação de papel por UI; reenvio duplicado; vazamento em cache/log/RUM; suporte interno excessivo. Mitigações de UX: contexto de organização persistente, ações com escopo explícito, estado confirmado distinto de solicitado, preview seguro, erros sem payload pessoal, handoff humano e diagnósticos mínimos. Provas técnicas futuras exigem testes reais de RLS, autorização por objeto, webhook e sandbox; referência ASVS 5.0 solicitada pelo usuário, sem alegar auditoria de conformidade.
