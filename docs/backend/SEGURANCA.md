# Segurança da fundação Venda Flow AI

## Modelo de confiança

O cliente nunca escolhe userId autenticado ou role. OIDC valida Authorization Code/PKCE, state, nonce, JWS/JWKS, issuer, audience e expiração; somente issuer/sub verificados resolvem a identidade interna. A configuração e o fetch permitem apenas endpoints na origem do issuer, HTTPS em produção, sem redirects e com timeout. O teste de assinatura inválida revelou que a biblioteca usa confiança no canal TLS por padrão; a implementação ativa explicitamente `enableNonRepudiationChecks`, conforme a [documentação primária](https://github.com/panva/openid-client/blob/main/docs/functions/enableNonRepudiationChecks.md). Falhas de credencial/claims não abrem o circuit breaker global; falhas técnicas repetidas abrem por 30 segundos. Código OIDC não é repetido automaticamente por ser de uso único.

A sessão local é um segredo aleatório de 256 bits. O banco guarda HMAC do identificador, nunca o cookie em claro. Os fluxos temporários guardam PKCE/state/nonce cifrados com AES-256-GCM e expiram em cinco minutos; callback consome a linha uma única vez antes da chamada externa. Não são armazenados access token, refresh token, email ou perfil OIDC. Três chaves independentes são exigidas; segredos reais dependem do secret manager/IaC da fase de infraestrutura. Troca de chaves hoje invalida sessões/fluxos; keyring de rotação progressiva permanece pendente.

Toda mutação de domínio exige sessão, Origin, CSRF, membership e papel. Path/query são seletores, não autorização. Header X-Organization-Id só pode concordar com o seletor; X-Tenant-Id não é aceito. Campos extras no body e query são rejeitados. Acesso a objeto externo recebe erro uniforme sem confirmar sua existência. Logout é operação de segurança da própria sessão e permanece permitido ao viewer com CSRF, sem conceder mutação de domínio.

## RLS e transações

As nove tabelas do schema venda têm ENABLE e FORCE ROW LEVEL SECURITY. Runtime é login sem superuser/bypass e sem ownership ou membership nas roles privilegiadas. Contexto é parametrizado e local à transação; nunca se faz SET de sessão reutilizável no pool. A [documentação PostgreSQL](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) e a [regra de transactions do driver](https://node-postgres.com/features/transactions) fundamentam essa separação; a prova local usa PostgreSQL 18.7 real.

`venda_authorizer` é NOLOGIN/NOBYPASSRLS e tem policy própria de SELECT sobre memberships para executar apenas uma função booleana SECURITY DEFINER. Isso evita recursão de policy sem conceder BYPASSRLS ao runtime. `venda_bootstrap` só insere organização e owner do ator corrente; `venda_identity` só resolve issuer/sub verificados pela camada OIDC. Funções têm search_path fixo e EXECUTE público revogado. A API não recebe membership nessas roles. Quem controla a credencial DB ou consegue executar SQL arbitrário já está dentro da fronteira de confiança da aplicação; RLS com GUC não substitui prevenção de SQL injection ou proteção do login DB.

Advisory locks compartilhados por membership serializam seu uso com alterações, cujo trigger adquire lock exclusivo. Não se usa FOR SHARE em memberships como substituto de autorização: essa operação aciona policy de UPDATE no PostgreSQL e havia negado leitura a viewer nos testes iniciais. Sessões usam lock de leitura durante a transação de domínio para serializar logout. Último owner não pode ser removido/rebaixado. Self-service de transferência de ownership não está completo; auto-revogação/rebaixamento que retire a capacidade de gravar auditoria falha e reverte a transação, sem anunciar sucesso. Fluxo dedicado depende do PRD/governança.

Mutações, auditoria, outbox e registro de idempotência usam o mesmo commit. Auditoria é INSERT-only para a API e um trigger rejeita UPDATE/DELETE até para uma execução administrativa acidental. Outbox tem envelopes mínimos, sem corpo de conversa ou dados de pagamento. Inbox tem chave única por organização/source/evento e rollback permite nova tentativa. Ainda não existem publisher, lease de worker, retries com jitter, reconciliador ou DLQ externos; não alegar essas integrações como prontas.

## Threat model

| Ameaça | Controle implementado | Prova/limite |
| --- | --- | --- |
| Troca de tenant por path/body/query/header | Membership server-side, guards, query/body estritos, RLS por ator/tenant | HTTP negativo e SQL direto no PostgreSQL real |
| Elevação por role forjada | Enum fixo e papel lido do banco; admin não concede owner/admin | Testes de viewer/agent/manager/billing e admin |
| IDOR em membership de B usando path de A | Objeto consultado com organização e ID; RLS e guardas | Retorno 404 sem alteração |
| Sessão fixada, expirada ou revogada | Novo cookie opaco por login, TTL absoluto/idle, revogação e rechecagem transacional | Cookies, logout, expiração/idle e membership revogado |
| CSRF e origem não autorizada | Token sincronizador derivado de segredo da sessão, comparação constante, Origin exato, SameSite e CORS restritos | Token ausente/inválido e origem externa rejeitados |
| JWT adulterado e mix-up | JWS explícito, JWKS, state/nonce/issuer/audience/expiração, callback fixo | Simulador de protocolo local assinado, não sandbox de fornecedor |
| SSRF por metadata OIDC | Issuer configurado, endpoints na mesma origem, redirects bloqueados e timeout | Implementação revisada; provider real pendente |
| Vazamento em logs/traces | Allowlist de método/rota/status/duração/requestId; sem headers, query, corpo, SQL ou tokens | Teste com marcadores sensíveis e exporter OTLP local |
| Replay e duplicação | Idempotência por ator/escopo/key/hash, unicidade e locks; autorização antes do replay | Seis criações concorrentes, um resultado/evento |
| Auditoria mutável | Sem grants de UPDATE/DELETE e trigger append-only | SQL rejeitado inclusive via controle administrativo de teste |
| Sobrecarga ou falha externa | Limite 16 KiB, pool/espera/statement/lock deadlines, circuito OIDC e operações locais independentes | Provedor simulado indisponível não derruba leitura local |

## Pendências para produção

Não há certificação [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/), pentest ou revisão completa. Precisam de contrato/governança: provedor e MFA reais, logout/backchannel do IdP, rate limiting distribuído/WAF, confiança de proxy, retenção/limpeza de sessões/flows/idempotência, DSAR, trilha de eventos de autenticação além do log HTTP, rotação progressiva de chaves, backups/restauração e recuperação de desastre. A distribuição de teste não inclui pg_dump/pg_restore; down/up não é teste de backup. TLS, KMS/Secrets Manager e parâmetros de logs PostgreSQL/RDS precisam de validação no ambiente real; não foram provisionados.

Falha de billing/entitlements/canal não é simulada como ativo. Mercado Pago e WhatsApp têm apenas fronteiras/ports neste módulo, sem credenciais ou SDK. Sem integração externa produtiva, nenhum dado de outro produto, sessão, tema, gateway ou storage é compartilhado.
