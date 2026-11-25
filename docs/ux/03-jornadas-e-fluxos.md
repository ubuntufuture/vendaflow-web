# Jornadas e fluxos essenciais

Todos os fluxos são especificações propostas. Estados E0–E6 e recuperação estão em 04-wireframes-e-estados.md; guards de segurança em 05-permissoes-e-integracoes.md. Nenhum fluxo representa integração executada.

## Jornadas por papel

| Papel | Gatilho e percurso | Momento de risco | Resultado e recuperação |
| --- | --- | --- | --- |
| Visitante | Entender produto → conferir planos verificados → entrar/cadastrar com OIDC | Preço indisponível ou consentimento genérico | Sem preço inventado; permitir conhecer capacidades e retomar contratação depois |
| Responsável | Autenticar → criar/selecionar organização autorizada → timezone → canal oficial → equipe → revisar setup | Conta Meta sem permissão; setup interrompido | Salvar progresso confirmado; canal fica pendente e CRM local continua acessível conforme entitlement |
| Gestor | Ver fila → filtrar pendências → atribuir → acompanhar tarefa e oportunidade → analisar relatório | Conflito de atribuição ou troca de organização | Atualizar responsável confirmado e oferecer revisão do estado atual |
| Atendente | Abrir conversa permitida → contexto/consentimento → responder → registrar próxima ação → resolver | Janela expira durante composição; timeout de envio | Preservar rascunho seguro; consultar estado antes de reenviar; modelo autorizado se elegível |
| Financeiro | Conferir plano e preço → revisar recorrência → Mercado Pago → aguardar reconciliação → consultar fatura | Retorno enganoso ou pagamento duplicado | Estado em confirmação; acesso somente após decisão server-side; nova tentativa sem duplicar operação |
| Suporte interno | MFA → localizar empresa mínima → declarar motivo → diagnóstico → orientar recuperação | Exposição de conteúdo do cliente | Mostrar apenas metadados autorizados e registrar consulta; sem impersonação |
| Financeiro interno | MFA → localizar assinatura → consultar divergência → solicitar reconciliação autorizada → conferir resultado | Evento fora de ordem ou provedor indisponível | Auditoria e estado inconclusivo; nenhum botão “marcar como pago” |
| Auditor interno | MFA → filtrar trilha → inspecionar evento sanitizado → encerrar | Exportação indevida | Somente leitura, escopo e retenção definidos pelo contrato |

## Onboarding e retomada

```mermaid
flowchart TD
  A[Entrar ou criar conta] --> B[OIDC]
  B --> C{Sessão e membership válidos?}
  C -->|Não| D[Sem acesso ou convite pendente]
  C -->|Sim| E[Selecionar organização autorizada]
  E --> F[Revisar nome locale e timezone IANA]
  F --> G{Pode configurar canal?}
  G -->|Não| H[Solicitar ação ao responsável]
  G -->|Sim| I[Conectar WhatsApp por fluxo oficial]
  I --> J{Estado verificado no servidor?}
  J -->|Pendente ou falha| K[Diagnóstico e retomar conexão]
  J -->|Conectado| L[Definir finalidades e políticas de comunicação]
  L --> M[Convidar equipe e revisar permissões]
  M --> N[Revisar progresso e abrir fila]
  K --> O[Continuar organização local permitida]
  H --> O
```

Não pedir senha Meta, token permanente nem código de autenticação em campos próprios. Convite expirado tem ação para solicitar novo convite, sem criar membership por conta própria. Cada etapa concluída depende do estado confirmado pelo servidor; voltar/atualizar não repete conexão ou convite. Faturamento pode ser acessado pelo responsável/financeiro, sem presumir trial ou gratuidade.

## Atendimento e consentimento

```mermaid
flowchart TD
  A[Abrir conversa] --> B{Membership e objeto permitidos?}
  B -->|Não| C[Estado sem acesso]
  B -->|Sim| D[Carregar histórico paginado e estado do canal]
  D --> E[Compor rascunho ou revisar sugestão IA]
  E --> F{Canal entitlement e finalidade elegíveis?}
  F -->|Não| G[Bloqueio explicado e ação local permitida]
  F -->|Sim| H{Janela oficial aberta no envio?}
  H -->|Não| I[Escolher modelo aprovado compatível]
  H -->|Sim| J[Revisar destinatário e enviar]
  I --> J
  J --> K[Servidor revalida e deduplica intenção]
  K --> L{Resultado conhecido?}
  L -->|Não| M[Envio em confirmação e consulta de estado]
  L -->|Rejeitado| N[Explicar motivo e preservar rascunho]
  L -->|Aceito| O[Estado aceito pelo provedor]
  O --> P[Atualizar entregue ou lido somente por evento confirmado]
  M --> L
```

Antes de inserir uma sugestão IA, exibir “Sugestão — revise antes de enviar”. Inserir não envia. Erro ou timeout de IA não bloqueia redação humana. Sem percentual de confiança inventado, sem chave Pix gerada pela IA e sem exibir conhecimento de outro tenant. Escalada para pessoa visível; usuário pode desativar assistência conforme permissão.

Opt-out identificado pausa novas comunicações da finalidade/canal afetados e automações correspondentes; encaminha revisão quando a classificação for ambígua. Revalidar elegibilidade no processamento da fila, inclusive após revogação. Mensagem já submetida ao provedor pode não ser cancelável; informar limite sem prometer remoção. Conversa iniciada pelo titular não equivale a aceite geral de marketing.

## Contato oportunidade e tarefa

```mermaid
flowchart TD
  A[Contato permitido] --> B{Existe no tenant?}
  B -->|Sim| C[Revisar possível duplicidade sem mesclar automaticamente]
  B -->|Não| D[Cadastrar dados mínimos e origem]
  C --> E[Revisar base legal finalidade e canal]
  D --> E
  E --> F[Criar oportunidade com valor proposto se conhecido]
  F --> G[Selecionar etapa e responsável autorizados]
  G --> H[Adicionar tarefa e prazo com timezone]
  H --> I{Salvar confirmado?}
  I -->|Conflito| J[Mostrar versão atual e revisar edição]
  I -->|Timeout| K[Consultar operação antes de repetir]
  I -->|Sim| L[Atualizar detalhe e histórico]
  L --> M[Concluir tarefa ou declarar ganho com proveniência]
  M --> N[Relatório distingue negociação de receita verificada]
```

Não deduzir consentimento a partir da existência do telefone. Campo sem valor é desconhecido; zero somente quando confirmado. Movimento de etapa tem alternativa por menu/teclado. Perda exige motivo apenas se contrato exigir; não inventar campo obrigatório. Recebimentos do negócio do cliente e assinatura SaaS são conceitos distintos; não implementar cobrança das propostas nesta etapa.

## Automação autorizada

```mermaid
flowchart TD
  A[Gestor autorizado abre rascunho] --> B[Define gatilho condições ação e escopo]
  B --> C[Revisa destinatários finalidade canal e horário]
  C --> D[Validação sem disparar mensagens reais]
  D --> E{Elegível e configuração completa?}
  E -->|Não| F[Listar bloqueios por campo e ação]
  E -->|Sim| G[Resumo e confirmação de publicação]
  G --> H[Servidor revalida autorização e entitlement]
  H --> I[Publicação confirmada e auditoria]
  I --> J[Execução verifica consentimento e disponibilidade novamente]
  J --> K{Falha externa?}
  K -->|Sim| L[Retry limitado ou DLQ e alerta autorizado]
  K -->|Não| M[Resultado confirmado sem alegar entrega antecipada]
```

Pausar impede novas execuções conforme semântica a contratar; distinguir “pausa solicitada”, “pausada” e trabalhos já em voo. Editor informa horário do destinatário; se desconhecido, não programa ação sensível ao horário até resolver política. Limites de execução não são números inventados.

## Assinatura e reconciliação

```mermaid
sequenceDiagram
  actor F as Financeiro do cliente
  participant W as venda-web
  participant A as venda-api autorizada
  participant M as Mercado Pago
  participant R as Processamento e reconciliação
  F->>W: Revisar valor recorrência e termos verificados
  W->>A: Solicitar operação com intenção única
  A-->>W: Destino oficial autorizado ou erro
  W->>M: Checkout hospedado
  M-->>W: Retorno do navegador
  W->>A: Consultar estado confirmado
  A-->>W: Em confirmação enquanto inconclusivo
  M->>R: Notificação oficial
  R->>R: Validar autenticidade e deduplicar
  R->>M: Consultar recurso conforme contrato
  M-->>R: Estado do recurso
  R->>A: Atualizar estado e entitlement com auditoria
  W->>A: Consultar atualização
  A-->>W: Situação e direitos efetivos
```

Sem webhook, reconciliador consulta o provedor conforme política limitada futura. Eventos duplicados/atrasados não reativam estado obsoleto. Recusa não autoriza cobrança automática adicional fora do contrato. Cancelamento mostra efeitos e data efetiva confirmados; sem promessa de reembolso ou período de tolerância não definidos. Divergência fica “Em análise” até resolução confirmada.

## Diagnóstico interno

```mermaid
flowchart TD
  A[OIDC interno com MFA] --> B[Checar capacidade e escopo]
  B --> C[Localizar empresa com metadados mínimos]
  C --> D[Registrar motivo de acesso]
  D --> E[Exibir estado sanitizado da integração]
  E --> F{Reconciliar permitido?}
  F -->|Não| G[Orientar responsável sem alterar dados]
  F -->|Sim| H[Revisar escopo e solicitar operação auditável]
  H --> I[Em processamento com correlation ID]
  I --> J[Resultado confirmado ou pendência]
```
