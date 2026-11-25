# Análise dos HTMLs do Stitch

Fonte primária de implementação: HTML/CSS dos exports. Imagens são conferência visual. Scripts dos exports não são executados.

38 HTMLs inventariados com SHA-256, títulos, landmarks, campos, controles, cores, assets externos e classes de layout no arquivo html-inventory.json.

| Export | Título | Campos | Botões |
|---|---|---:|---:|
| acessar_a_conta_venda_flow_ai_entrar/code.html |  | 9 | 8 |
| assinaturas_admin_assinaturas_console_administrativo_venda_flow_ai/code.html |  | 1 | 20 |
| assistente_de_ia_automa_es_mobile_390px/code.html | Venda Flow AI | 2 | 11 |
| assistente_de_ia_automa_es_venda_flow_ai_desktop_1440px/code.html | Venda Flow AI | 3 | 3 |
| automa_es_app_automacoes_mobile_390px/code.html | Venda Flow AI | 0 | 9 |
| automa_es_app_automacoes_venda_flow_ai_desktop_1440px/code.html | Venda Flow AI | 0 | 9 |
| clientes_app_clientes_venda_flow_ai_desktop_1440px_1/code.html |  | 2 | 26 |
| clientes_app_clientes_venda_flow_ai_desktop_1440px_2/code.html | Clientes e Contatos — Venda Flow AI | 2 | 27 |
| configura_es_app_configuracoes_mobile_390px/code.html |  | 0 | 12 |
| configura_es_app_configuracoes_venda_flow_ai_desktop_1440px/code.html |  | 6 | 17 |
| conversas_app_conversas_mobile_390px_1/code.html |  | 2 | 13 |
| conversas_app_conversas_mobile_390px_2/code.html |  | 2 | 18 |
| conversas_app_conversas_venda_flow_ai_desktop_1440px_1/code.html |  | 2 | 16 |
| conversas_app_conversas_venda_flow_ai_desktop_1440px_2/code.html | Venda Flow AI — Conversas | 2 | 18 |
| criar_automa_o_app_automacoes_nova_venda_flow_ai_desktop_1440px/code.html | Venda Flow AI | 4 | 4 |
| criar_conta_venda_flow_ai_cadastro/code.html |  | 4 | 3 |
| detalhe_da_oportunidade_mobile_390px/code.html |  | 6 | 18 |
| empresas_admin_empresas_console_administrativo_venda_flow_ai/code.html |  | 4 | 19 |
| in_cio_app_mobile_390px/code.html |  | 0 | 6 |
| in_cio_app_venda_flow_ai_desktop_1440px/code.html |  | 0 | 2 |
| login_administrativo_admin_login_venda_flow_ai/code.html |  | 8 | 6 |
| mini_design_system_venda_flow_ai/code.html | A. Mini Design System — Venda Flow AI | 6 | 26 |
| painel_do_cliente_mobile_390px/code.html |  | 0 | 13 |
| painel_do_cliente_venda_flow_ai_desktop_1440px/code.html |  | 0 | 16 |
| planos_e_faturamento_app_faturamento_mobile_390px/code.html |  | 0 | 6 |
| planos_e_faturamento_app_faturamento_venda_flow_ai_desktop_1440px/code.html |  | 0 | 14 |
| planos_e_pre_os_mobile_390px/code.html |  | 0 | 8 |
| planos_e_pre_os_venda_flow_ai/code.html |  | 0 | 3 |
| primeiros_passos_mobile_390px_configurar/code.html |  | 3 | 10 |
| primeiros_passos_venda_flow_ai_configurar/code.html |  | 3 | 18 |
| p_gina_inicial_mobile_390px/code.html |  | 0 | 4 |
| p_gina_inicial_venda_flow_ai/code.html |  | 0 | 4 |
| relat_rios_app_relatorios_mobile_390px/code.html |  | 0 | 6 |
| relat_rios_app_relatorios_venda_flow_ai_desktop_1440px/code.html |  | 0 | 9 |
| suporte_e_auditoria_admin_operacao_console_administrativo_venda_flow_ai/code.html |  | 5 | 29 |
| vendas_app_vendas_mobile_390px/code.html |  | 7 | 12 |
| vendas_app_vendas_venda_flow_ai_desktop_1440px/code.html |  | 4 | 15 |
| vis_o_geral_admin_console_administrativo_venda_flow_ai/code.html |  | 0 | 8 |

## Regras da conversão

- Preservar hierarquia, composição, painéis, navegação e responsividade dos HTMLs.
- Inter local e os cinco tokens aprovados prevalecem sobre fontes/paletas divergentes nos exports.
- Não carregar Tailwind CDN, scripts inline, Google Fonts, imagens remotas ou fotos de exemplo.
- Não converter contagens, preços, clientes, status de WhatsApp, aprovação de pagamento ou mensagens de exemplo em dados reais.
- Preservar OIDC e autorização server-side. Campos de senha do export não substituem o provedor de identidade.
- Shell cliente e console interno têm fronteiras de identidade distintas.
- APIs comerciais ausentes devem produzir estado indisponível dentro da estrutura da tela, sem confirmação falsa de mutação.
