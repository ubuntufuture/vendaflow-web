# Wireframes por tela e estado

## Esqueleto comum

Wireframes low-fi textuais, sem frontend entregue. A chave `wireframe` de cada rota em routes.json aponta para uma seção desta página. Todos herdam E0–E6; detalhes abaixo especificam conteúdo e comportamento por família. Publicação depende de tokens e logo canônicos. Nenhum valor de screenshot deve entrar na aplicação.

Desktop cliente: `[pular ao conteúdo] [organização / navegação lateral] | [título / estado / ações] | [conteúdo principal] | [detalhes sob demanda]`. Admin tem shell próprio com identificação inequívoca “Console administrativo”. Público tem cabeçalho simples, conteúdo e rodapé legal. Avisos de integração não substituem título nem ocupam toda a primeira pintura.

| Estado | Representação e recuperação obrigatória |
| --- | --- |
| E0 loading | Nome da região e “Carregando…”; skeleton apenas da região solicitada; `aria-busy`; ações dependentes indisponíveis sem perder contexto |
| E1 empty | Separar ausência de registros de busca sem resultado. “Nenhuma conversa encontrada”; oferecer limpar filtros ou primeira ação autorizada. Zero só se contagem confirmada |
| E2 error | “Não foi possível carregar”; ação tentar novamente e referência de suporte sanitizada. Falha de gravação preserva edição em memória da sessão enquanto permitido |
| E3 forbidden | “Você não tem acesso a esta ação”; caminho seguro para voltar/solicitar ao responsável. Não renderizar dados do objeto nem revelar tenant externo |
| E4 timeout | Leitura: tentar novamente mantendo filtros. Escrita: “Ainda não confirmamos a operação”; consultar estado antes de repetir. Nunca converter timeout em sucesso ou falha definitiva |
| E5 success | Conteúdo e ação concluída apenas após confirmação; feedback acessível e histórico atualizado. Sucesso parcial identifica item e limite |
| E6 stale | “Última atualização em …” somente se timestamp conhecido; marcar dados desatualizados, não usar para autorizar envio/cobrança. Sem cache de outro tenant |

Offline preserva operações locais já confirmadas que possam ser vistas com segurança; informa indisponibilidade e não promete envio posterior sem contrato de fila. Rascunhos sensíveis não vão para localStorage por padrão. Ao expirar sessão/membership, limpar dados privados; oferecer aviso de perda antes de saída voluntária.

## WF01 Público

`[logo original quando disponível / navegação] [proposta de valor / CTA entrar ou criar conta] [capacidades verificadas] [rodapé]`. Início e planos não mostram logos de parceiros, fotos, depoimentos ou estatísticas não verificadas. Planos: comparação de capacidades apenas do catálogo aprovado; BRL, recorrência e condições visíveis antes de contratar. E0 preço carregando sem valor antigo enganoso; E1 catálogo vazio “Planos indisponíveis”; E2/E4 manter informação institucional e permitir tentar novamente; E3 oferta não elegível sem conteúdo privado; E5 catálogo confirmado. Privacidade e termos usam texto versionado aprovado; se ausente, informar indisponibilidade e bloquear aceite dependente, sem inventar documento jurídico.

## WF02 Identidade

`[marca textual / título] [continuar com identidade autorizada] [ajuda e política]`. Entrar/criar conta usam OIDC, sem implementar senha própria por dedução do ZIP. Callback contém status e redirecionamento interno validado. Admin explicita identidade interna e MFA. E1 sem organização/convite elegível; E2 provedor indisponível com retomar; E3 conta sem acesso interno; E4 conferir sessão antes de repetir callback; E5 destino autorizado. Sem códigos, credenciais ou URLs inventadas. Login permite colar e usar gerenciador de senhas/passkeys no provedor.

## WF03 Onboarding

`[etapas e progresso real] [organização e timezone] [conexão oficial] [finalidades] [equipe] [revisão]`. Navegação anterior/próxima com foco no título da etapa. Explicar pré-requisitos Meta sem alegar verificação. E1 organização sem canal/equipe; E2 falha por etapa; E3 pedir responsável; E4 conexão “em confirmação”; E5 checklist por estado confirmado. “Continuar depois” mantém etapas server-side confirmadas sem afirmar setup concluído. Não criar trial implícito.

## WF04 Início

`[título / período / timezone] [próximas ações] [conversas pendentes] [tarefas] [indicadores verificados opcionais]`. Prioridade operacional antes de gráficos. Os dois exports de painel e início são alternativas da mesma rota proposta. E1 organização sem atividade com CTA permitido; E2 erro isolado por card; E4 não derrubar fila por relatório lento; E5 links levam ao filtro correspondente. Sem contagens artificiais, variação percentual com base inexistente ou receita atribuída à IA.

## WF05 Conversas

Desktop: `[filtros / lista paginada] | [cabeçalho destinatário / responsável / canal] [histórico paginado] [sugestão opcional] [composer / anexar / modelo / enviar] | [contato e próxima tarefa recolhíveis]`. Detalhe usa rota estável; mobile abre lista → thread → contexto. Identificar canal, janela calculada pelo servidor e fonte do estado sem selo “Meta verificado” presumido.

E1 lista sem conversas difere de conversa sem histórico; E2 histórico falhou mantém lista; E3 acesso revogado limpa thread e composer; E4 envio em confirmação desabilita duplicação da mesma intenção, não toda a fila; E5 distingue aceito, enviado, entregue, lido e falhou conforme eventos do contrato. Retorno por link direto mostra tela sem seleção quando ID inválido. Conflito de atribuição mostra responsável atual, sem sobrescrever silenciosamente. Anexo: nome/tamanho/tipo e progresso, falha recuperável; download privado autorizado. Sem preview de arquivo perigoso ou conteúdo não sanitizado.

## WF06 Contatos

`[busca / filtros] [lista: identificador mínimo / responsável / estado] [adicionar permitido] [detalhe: dados / conversas / oportunidades / consentimento]`. Formulário valida campos definidos pelo contrato futuro; telefone com país explícito, sem deduzir DDD como tenant. Duplicidade sugere revisão, não mescla. E1 sem contato ou filtro vazio; E2 edição preservada; E3 mascarar ou retirar campos não permitidos; E4 consultar cadastro antes de repetir; E5 novo registro aparece somente após persistência. Importação/exportação ficam P1 e dependem de contrato, limites, segurança e privacidade.

## WF07 Vendas

`[funil / filtro / visualização lista ou quadro] [etapas / oportunidades] [detalhe: contato / responsável / valor proposto / histórico / próxima ação]`. Valor estimado, proposto e realizado têm rótulos distintos; nunca somar todos como receita. Sem valor conhecido exibir “Não informado”. E1 sem oportunidade sugere criar se permitido; E2 falha no movimento restaura posição confirmada; E3 remover mutação não autorizada; E4 mostrar movimento pendente; E5 anunciar etapa confirmada. Conflito de versão apresenta revisão atual. Lista acessível e menu “Mover para etapa” são equivalentes ao arraste.

## WF08 Tarefas

`[minhas / equipe se autorizado / prazo] [lista priorizada] [criar] [detalhe com responsável, vínculo e horário]`. Vencidas primeiro, depois próximas, concluídas sob filtro; ordem ainda hipótese. Prazo exibe timezone e formato pt-BR; avisar se horário inexistente/ambíguo na zona selecionada. E1 “Nenhuma tarefa para este filtro”; E2 mantém edição; E3 restringe equipe/objeto; E4 conclusão pendente sem duplicar tarefa; E5 ação concluída com alternativa de desfazer somente se contrato permitir.

## WF09 Automações

`[lista / estado real / última execução sanitizada] [novo rascunho] [editor: gatilho → condições → ações] [resumo / validar / publicar]`. Nova automação é rascunho, sem destinatário pré-selecionado. E1 sem regras; E2 erro de validação por campo; E3 publicação não autorizada; E4 publicação/pausa em confirmação; E5 versão confirmada com escopo e estado. Resumo mostra finalidade, canal, horário do destinatário, critérios de elegibilidade e consequência. Simulação é local/sandbox explícito, não envio real. DLQ mostra falha e encaminhamento ao operador, sem botão indiscriminado de replay para atendentes.

## WF10 Assistente e conhecimento

`[fontes autorizadas / estado de indexação] [configuração de assistência] [teste sandbox sem envio] [revisão humana]`. Conhecimento tem origem, versão e disponibilidade confirmadas; upload não equivale a pronto para uso. E1 sem fonte “Adicione uma fonte aprovada”; E2 processamento falhou sem indisponibilizar CRM; E3 fonte de outro tenant nunca visível; E4 indexação pendente; E5 pronta só quando confirmada. Respostas sem fonte suficiente pedem revisão/handoff, não inventam fatos. Teste não grava conversa produtiva, não gera cobrança e não publica automação.

## WF11 Relatórios

`[período / timezone / definição] [resumo verificado] [tabela acessível equivalente aos gráficos] [fonte e atualização]`. E1 sem dados no período; E2 falha por consulta; E3 acesso insuficiente; E4 consulta incompleta sem total; E5 denominadores e escopo explícitos. Não calcular conversão com base zero. “Receita verificada” requer evidência de realização definida no PRD; assinatura SaaS, oportunidade ganha e proposta não comprovam receita do cliente. Enquanto fonte não contratada: “Receita verificada indisponível”. Exportação P1 não herda permissão de visualizar.

## WF12 Faturamento

`[organização / estado da assinatura / última verificação] [plano e direitos efetivos] [valor e recorrência confirmados] [renovação/cancelamento] [histórico]`. Retorno do checkout usa mesma família, começando em confirmação. E1 sem assinatura não sugere plano inexistente; E2 falha de consulta não cria inadimplência; E3 papel financeiro necessário; E4 operação pendente sem novo checkout automático; E5 ativo/pago apenas por servidor. Tela de confirmação destaca compromisso e efeito do cancelamento; URL oficial só se validada pelo backend. Nada de selo PCI, Pix automático, boleto ou método não comprovado para o produto Assinaturas.

## WF13 Configurações e privacidade

`[organização / equipe / canal / privacidade] [formulário ou estado por seção] [salvar]`. Equipe: convite com escopo, papel e remoção de acesso; confirmar impacto em tarefas/conversas sem remover último responsável inadvertidamente conforme contrato. Canal: status, última confirmação e reconexão autorizada, nunca token. Consentimento: finalidade/canal, base legal, origem, versão do aviso e prova autorizada; desconhecido não vira aceito. Privacidade: solicitar acesso/correção/eliminação com identidade verificada; mostrar protocolo e estado reais, sem prometer apagar retenção obrigatória.

E1 sem membros adicionais/canal/prova; E2 erro por seção; E3 informação mínima e pedido ao responsável; E4 mudança em confirmação; E5 configuração confirmada. Revogar consentimento mostra finalidade e canal afetados e interrompe elegibilidade futura; não apagar prova auditável indiscriminadamente.

## WF14 Ajuda e páginas de sistema

`[título compreensível] [contexto sanitizado] [ação de recuperação] [referência de suporte se existente]`. E1 nenhuma orientação publicada, sem FAQ fictício; E2/E4 indisponibilidade parcial permite voltar; E3 sem revelar objeto; E5 instrução aprovada. Página 404 oferece início autorizado; sessão expirada oferece entrar. Não inserir corpo de conversa no pedido de suporte automaticamente. Não inventar contato ou SLA de suporte.

## WF15 Admin visão e empresas

`[Console administrativo / identidade interna] [escopo de acesso] [busca de empresa mínima] [estado técnico] [diagnóstico com motivo]`. E1 sem incidentes/empresas no escopo; E2 degradação não vira “tudo normal”; E3 bloqueio interno auditável; E4 diagnóstico pendente; E5 estado com fonte/horário. Dados comerciais e contatos não entram no painel global. Sem números de MRR ou empresas inventados. Detalhe não abre sessão de cliente.

## WF16 Admin assinaturas e operação

`[filtro de divergência] [assinatura mínima / estado local e do provedor] [linha do tempo sanitizada] [solicitar reconciliação autorizada]`. E1 nenhuma divergência confirmada; E2 provedor falhou; E3 escopo financeiro/operacional necessário; E4 em análise; E5 resultado auditado. Replay de evento exige capacidade específica, revalidação e dedupe; sem editar status financeiro manualmente. Falhas permanentes não entram em loop infinito. Separar sandbox e produção em contexto visível.

## WF17 Admin auditoria

`[intervalo / tipo / correlation ID] [eventos sanitizados] [detalhe permitido]`. Somente leitura; sem tokens, payload bruto ou conteúdo pessoal sensível. E1 sem eventos no escopo/filtro; E2 indisponibilidade com diagnóstico; E3 negar fora do escopo; E4 paginação pendente mantém consulta; E5 trilha autorizada sem alegar completude se houve perda. Exportação requer capacidade própria, não oferecida por padrão.
