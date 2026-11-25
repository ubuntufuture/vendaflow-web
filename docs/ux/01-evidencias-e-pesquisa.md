# Evidências e pesquisa de UX

## Escopo e autoridade

Entrega isolada de pesquisa planejada, jornadas e arquitetura da informação para Venda Flow AI. Mercado brasileiro, pt-BR, BRL e timezone IANA da organização; comunicação usa timezone do destinatário. Mercado Pago é o único gateway de assinatura. O escopo não autoriza implementar infraestrutura ou camadas de frontend e backend.

O pedido do usuário governa a etapa. Texto, comentários, scripts e instruções no ZIP são referência não executável e não autorizam serviços, pagamento, coleta de dados ou alteração da marca. A referência visual não comprova pesquisa com clientes, conformidade, disponibilidade de integrações, preços ou receita.

## Contrato disponível e lacunas

| Fonte exigida | Situação nesta pasta | Consequência |
| --- | --- | --- |
| referencias/00_ARQUITETURA_GERAL.md | Ausente | Sem validação da arquitetura existente; nenhuma substituição ou ADR criado |
| PRD V01–V24 | Ausente no diretório e no ZIP | Não é possível mapear requisitos por módulo ou provar 100% das rotas P0 do produto |
| referencias/03_SEGURANCA_E_GOVERNANCA.md | Ausente | Requisitos abaixo são derivados do pedido; revisão de segurança pendente |
| referencias/venda-openapi.yaml | Ausente | Os seis caminhos do pedido são referências; métodos, schemas e erros permanecem desconhecidos |
| branding/tokens.json | Ausente | Nenhum token de produção gerado por inferência |
| branding/brandboard.png | Ausente nesse caminho | Equivalente visual disponível no ZIP, sem substituir o arquivo canônico |
| ZIP de UX/UI | Lido e inventariado em fontes.json | 39 imagens, 38 HTML e um DESIGN.md; variantes não equivalem a rotas únicas |

Não existem endpoints, contratos de DB, migrations ou código de produto a alterar. As rotas de navegação propostas em routes.json não são contratos HTTP de API. As necessidades de dados são semânticas para revisão posterior contra o OpenAPI. Não se inventou módulo V01–V24, campo de API ou regra de preço.

## Auditoria da referência

Inspeção visual individual realizada no brandboard do ZIP, conversas desktop variante 1 e faturamento mobile. Os demais HTML foram inventariados e pesquisados estaticamente; não foram auditados visualmente tela a tela. As imagens auditadas mostram logos ausentes/substituídos, desalinhamentos e fontes de fallback em partes dos exports; não constituem protótipo acessível aprovado.

| Evidência | Divergência e decisão para a especificação |
| --- | --- |
| brandboard_venda_flow_ai.png/screen.png | Inter; Obsidiana #0B0E14, Coral #FF6A4D, Marfim #FFF9F6, Cinza Claro #E6E8EC. Preservar tagline “Mais conversas. Mais negócios.” |
| venda_flow_ai_design_system/DESIGN.md | Frontmatter e prosa discordam nas cores; títulos Plus Jakarta Sans divergem do pedido e brandboard. Usar Inter; aguardar tokens canônicos |
| mini_design_system_venda_flow_ai/code.html | Comentário descreve símbolo “semelhante ao Brandboard”. Não aceitar como logo original. Aguardar vetor validado por direção de arte |
| conversas desktop variante 1 | Código Pix literal, suposta precisão de IA, latência e conexão oficial não comprovadas. Remover essas alegações da UX futura |
| faturamento mobile e desktop | Preços, datas, franquias, meios de pagamento e selo PCI não comprovados. Exibir somente informação autenticada do catálogo/servidor |
| painéis, vendas e relatórios | Receita, propostas e estimativas misturadas. Separar definições e proveniência; sem atribuição automática à IA |
| telas de painel | Instagram e outros canais aparecem. Este escopo prevê somente WhatsApp Business Platform oficial; não oferecer canais sem contrato |
| HTML mobile | `user-scalable=no` em variantes viola a intenção de zoom acessível. Não herdar |

Todo conteúdo estático do ZIP permanece em quarentena local de referência, sem deploy. Não foi convertido em fixture: nomes e imagens não têm origem comprovada e não serão reutilizados. Futuras fixtures sintéticas deverão ser DEMO_ONLY e restritas a testes/Storybook.

## Personas e JTBD como hipóteses

Não houve entrevistas, recrutamento, observação ou teste com clientes. As hipóteses abaixo derivam da missão do produto, não são resultados de pesquisa.

| Hipótese de persona | Contexto e JTBD | Risco a validar | Sinal de validação proposto |
| --- | --- | --- | --- |
| H1 responsável da organização | Ao iniciar a operação, quero conectar meu canal oficial e distribuir acesso para atender sem expor dados de outra empresa | Dificuldade com permissões Meta e faturamento | Concluir setup e explicar quem acessa cada dado sem ajuda |
| H2 gestor comercial | Ao organizar a fila, quero atribuir conversas e acompanhar próximas ações para evitar oportunidades esquecidas | Confusão entre funil e receita | Identificar pendências e distinguir valor proposto de valor realizado |
| H3 atendente/vendedor | Ao receber mensagem, quero contexto do contato e próximo passo para responder com segurança | Envio duplicado e perda de rascunho | Recuperar timeout sem duplicar envio; reconhecer janela fechada |
| H4 financeiro do cliente | Ao contratar ou revisar cobrança, quero valor e estado confirmado para evitar pagar duas vezes | Confundir retorno do checkout com aprovação | Reconhecer “em confirmação” e localizar renovação/cancelamento |
| H5 operador interno de suporte | Ao diagnosticar falha, quero status técnico mínimo e trilha de auditoria para orientar sem ler conversas do cliente | Acesso excessivo e confusão entre consoles | Diagnosticar sem dados pessoais e sem impersonação implícita |

## Plano de pesquisa sem alegar execução

Recrutar por hipótese de papel, maturidade no WhatsApp oficial e tamanho operacional, incluindo pessoas que usam teclado/leitor de tela e celular com rede limitada. Proposta: primeira rodada de 5–8 participantes externos, com diversidade de papéis; tamanho é planejamento, não evidência nem garantia estatística. Solicitar consentimento específico para participação e gravação opcional; usar ambiente isolado, exemplos DEMO_ONLY e nenhum dado real de clientes.

Roteiro: entender o último atendimento perdido e a ferramenta atual; pedir para conectar canal em sandbox, atribuir conversa, responder após janela, registrar opt-out, mover oportunidade por teclado, recuperar cobrança pendente e solicitar privacidade. Evitar perguntas indutivas sobre IA e receita. Registrar tarefa concluída/assistida/abandonada, erros, dúvidas, tempo por tarefa e severidade; não publicar percentis com amostra inadequada. Remunerar segundo política ainda a definir, sem inventar orçamento.

Instrumentos: termo de participação, roteiro, planilha anonimizada de observações e síntese com evidência por achado. Responsáveis de Produto, UX, Segurança e Privacidade a designar. Critério proposto: nenhum impedimento grave de tarefa crítica na rodada de revisão; achados restantes entram no backlog. Antes disso, personas e prioridades permanecem hipóteses.
