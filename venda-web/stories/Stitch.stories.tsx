import type { Meta, StoryObj } from "@storybook/react-vite";
import { StitchScreen } from "../components/stitch-screens.client";
const meta = {
  title: "Venda Web/Stitch ativo",
  component: StitchScreen,
  args: { base: "/app/o/DEMO_ONLY", organizationName: "DEMO_ONLY — organização de teste", canMutate: true },
  decorators: [(Story) => <main className="workspace-main"><p className="st-notice">DEMO_ONLY — cenários visuais sem serviços comerciais ativos.</p><Story/></main>],
} satisfies Meta<typeof StitchScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Inicio: Story = {args:{slug:""}};
export const Conversas: Story = {args:{slug:"conversas"}};
export const Contatos: Story = {args:{slug:"clientes"}};
export const Funil: Story = {args:{slug:"vendas"}};
export const Automacoes: Story = {args:{slug:"automacoes"}};
export const CriarAutomacao: Story = {args:{slug:"automacoes/nova"}};
export const Assistente: Story = {args:{slug:"automacoes/assistente"}};
export const Relatorios: Story = {args:{slug:"relatorios"}};
export const Cobranca: Story = {args:{slug:"faturamento"}};
export const WhatsApp: Story = {args:{slug:"configuracoes/canais"}};
export const Privacidade: Story = {args:{slug:"configuracoes/privacidade"}};
