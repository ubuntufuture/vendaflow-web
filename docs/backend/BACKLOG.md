# Backlog da fundação backend

| Prioridade | Item | Estado | Aceite |
| --- | --- | --- | --- |
| P0 B01 | Arquitetura, segurança, PRD V01–V24 e OpenAPI canônicos | Bloqueado: ausentes no workspace e no GitHub conectado vazio | Reconciliar contrato candidato, campos e política; executar compatibilidade backward |
| P0 B02 | Identidade/sessão/CSRF e isolamento por tenant | Implementado e testado localmente | Sessão opaca, JWS explícito, guardas, RLS FORCE e seletor de tenant sem bypass por cliente |
| P0 B03 | Migrations, outbox/inbox, auditoria e idempotência | Implementado e testado em PostgreSQL real | Atomicidade, dedupe, rollback, unicidade, último owner e down/up somente em banco descartável |
| P0 B04 | Cadastro do provedor OIDC real e MFA | Externo pendente | Issuer/client/callback/secret reais; política MFA e testes de integração autorizados; nenhum bypass em produção |
| P0 B05 | RDS/TLS, secrets, backups e recuperação | Não provisionado nesta fase | CA/roles/chaves reais, KMS/Secrets Manager/IaC e restauração exercitada; não confundir down/up com backup |
| P0 B06 | Revisão ASVS, proxy, rate limits e retenção/DSAR | Pendente de segurança/governança | Avaliar controles aplicáveis, WAF/limites distribuídos, limpeza e política de privacidade aprovada |
| P0 B07 | Performance | Baseline local medida, perfil de produção não acordado | GET p95 ≤300 ms e POST p95 ≤500 ms no perfil acordado, com dataset/carga e hardware documentados |
| P1 B08 | Revogação OIDC externa/backchannel e rotação gradual de chaves | Não implementado | Revogação no IdP sincronizada sem expor tokens; keyring/expiração conforme governança |
| P1 B09 | Transferência de ownership e autoalteração de perfil | Fluxo dedicado pendente | Revisão de acesso e auditoria preservadas mesmo ao retirar a própria autorização; falhas atuais revertem com segurança |
| P1 B10 | Paginação e retenção de idempotência | Limite atual de 100 registros por listagem, sem cursor | Contrato de cursor/limites e retenção aprovado antes de implementar |
| P1 B11 | Worker/publisher/reconciliador e DLQ | Fora do runtime atual; só envelopes/ports | Job separado, lease, jitter/retries limitados, dedupe e DLQ; não executar chamada externa em transaction de domínio |
| P1 B12 | API interna admin | Fronteira definida, nenhuma rota interna criada | Contrato, identidade, MFA, sessão e DB role próprios; cliente admin não vira staff |
| P2 B13 | Perfil de carga ampliado e testes de caos | Não executado | Escala representativa e cenários de indisponibilidade medidos, sem alegar impossibilidade de regressões |

Nenhuma etapa seguinte, integração de gateway, infraestrutura ou frontend foi iniciada automaticamente. Backlog não representa funcionalidades produtivas disponíveis.
