import type { Meta, StoryObj } from "@storybook/react-vite";
import { AuthPanel } from "../components/auth-panel";
import { Fault, Panel, LoadingBlock, Unavailable } from "../components/ui";
const meta = {
  title: "Venda Web/Fundação",
  component: AuthPanel,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AuthPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Login: Story = { args: { mode: "login" } };
export const Cadastro: Story = { args: { mode: "register" } };
export const Recuperacao: Story = { args: { mode: "reset" } };
export const IdentidadeIndisponivel: Story = {
  args: { mode: "login", unavailable: true },
};
export const Estados: Story = {
  args: { mode: "login" },
  render: () => (
    <div className="vf-stack">
      <p>DEMO_ONLY — estados de apresentação, sem sessão ou dados reais.</p>
      <LoadingBlock />
      <Unavailable title="Consulta não disponível">
        A integração ainda não confirmou o estado.
      </Unavailable>
      {[401, 403, 404, 409, 500, 503, 504].map((status) => (
        <Fault key={status} status={status} />
      ))}
      <Panel title="Organização confirmada">
        <p>DEMO_ONLY — cenário de confirmação exclusivo do Storybook.</p>
      </Panel>
    </div>
  ),
};
