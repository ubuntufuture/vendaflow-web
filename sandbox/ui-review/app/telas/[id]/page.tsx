import { Screen } from '../../../../../packages/ui/screens';
import catalog from '../../../../../docs/ux/routes.json';
export function generateStaticParams() { return catalog.routes.map(r=>({id:r.id})); }
export default async function Page({ params }: { params: Promise<{id:string}> }) { const {id}=await params; return <Screen routeId={id} />; }
