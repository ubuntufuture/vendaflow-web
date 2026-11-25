# Backlog da etapa UI

| Prioridade | Item | Estado e dependência | Aceite para encerrar |
| --- | --- | --- | --- |
| P0 UI01 | Reconciliar PRD V01–V24, arquitetura, segurança e OpenAPI | Bloqueado por documentos ausentes, inclusive no GitHub conectado vazio | 100% de rotas P0 do produto rastreadas; contratos existentes preservados |
| P0 UI02 | Tokens exatos, Inter e pares de contraste light/dark | Implementado e verificado | Cinco cores exatas; nenhum par essencial abaixo de AA nos componentes |
| P0 UI03 | Componentes, estados e Storybook | Implementado e testado | 92 histórias; loading/vazio/erro/negado/timeout/sucesso/desatualizado representados |
| P0 UI04 | Telas candidatas P0/admin desktop/mobile | Implementado no sandbox, cobertura contra PRD pendente | Capturas para todas as 37 P0 candidatas e validação das rotas contra PRD |
| P0 UI05 | Auditoria visual e acessibilidade | Chrome/axe/teclado e comparação realizados; avaliação assistiva completa pendente | Sem impedimento crítico em tarefa real; revisão de todos os critérios A/AA aplicáveis com NVDA/VoiceOver e pessoas |
| P0 UI06 | Baseline de performance e budgets | Laboratório local, analyzer e trace disponíveis após execução; produto/RUM não disponíveis | Aprovar baseline por rota e testar device/rede reais; não usar este sandbox como benchmark de produção |
| P0 UI07 | Aprovação de direção de arte para entrega produtiva | Paleta e fonte auditadas; sem SVG oficial validado | Receber SVG oficial, validar assinatura e sua integração sem recortar o PNG |
| P1 UI08 | Montar biblioteca Figma remota | Handoff entregue, nenhum arquivo remoto editado | Variáveis, variantes e constraints reconciliados com código em arquivo Figma autorizado |
| P1 UI09 | Fechar budget de JS produtivo e responsividade mobile | Analyzer e baseline entregues; TBT p75 mobile de até 443,084 ms no laboratório, sem ganho consistente após separar server/client | Investigar main thread com traces, validar INP real e aprovar limites por rota com dataset/carga de produto e gate de regressão |
| P1 UI10 | Rodada de usabilidade com diversidade de dispositivos | Planejada na UX; não executada | Registrar evidências consentidas e resolver impedimentos críticos |
| P2 UI11 | Preferências de densidade e atalhos | Hipótese, não implementada | Evidência de necessidade e teste com teclado/leitor sem alterar marca |

Dependências de autenticação, backend, Mercado Pago e Meta pertencem às etapas técnicas futuras. Não devem ser simuladas como serviços ativos para fechar UI. Nenhuma implementação posterior foi iniciada.
