import { AuthPanel } from "../../../components/auth-panel";
export const metadata = { title: "Entrar" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const query = await searchParams;
  return (
    <>
      {query.estado === "saida-pendente" && (
        <p className="vf-notice" role="status">
          O acesso foi removido deste navegador. Não foi possível confirmar a
          revogação no servidor.
        </p>
      )}
      <AuthPanel mode="login" unavailable={query.estado === "indisponivel"} />
    </>
  );
}
