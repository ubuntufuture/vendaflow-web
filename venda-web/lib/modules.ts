export const modules = [
  { slug: "", title: "Primeiros passos", group: "Geral" },
  { slug: "conversas", title: "Conversas", group: "Atendimento" },
  { slug: "clientes", title: "Contatos", group: "Atendimento" },
  { slug: "vendas", title: "Vendas e funis", group: "Comercial" },
  { slug: "tarefas", title: "Tarefas", group: "Comercial" },
  { slug: "automacoes", title: "Automações", group: "Comercial" },
  { slug: "relatorios", title: "Relatórios", group: "Comercial" },
  { slug: "faturamento", title: "Faturamento", group: "Organização" },
  {
    slug: "configuracoes/organizacao",
    title: "Organização",
    group: "Organização",
  },
  {
    slug: "configuracoes/equipe",
    title: "Equipe e acesso",
    group: "Organização",
  },
  {
    slug: "configuracoes/canais",
    title: "Canal WhatsApp",
    group: "Organização",
  },
  {
    slug: "configuracoes/privacidade",
    title: "Privacidade",
    group: "Organização",
  },
  { slug: "ajuda", title: "Ajuda", group: "Organização" },
] as const;
export function visibleModules(role: string) {
  if (role === "billing")
    return modules.filter((m) => ["", "faturamento", "ajuda"].includes(m.slug));
  return modules.filter(
    (m) =>
      role === "owner" ||
      role === "admin" ||
      ![
        "faturamento",
        "configuracoes/organizacao",
        "configuracoes/canais",
      ].includes(m.slug),
  );
}
export function moduleTitle(slug: string) {
  return (
    modules.find((m) => m.slug === slug)?.title ??
    (
      {
        configuracoes: "Configurações",
        "automacoes/nova": "Nova automação",
        "automacoes/assistente": "Assistente de IA",
        conhecimento: "Conhecimento",
        "faturamento/retorno": "Retorno de assinatura",
      } as Record<string, string>
    )[slug]
  );
}
