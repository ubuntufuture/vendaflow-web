# Catálogo local de UI

Next.js 16, React 19 e TypeScript strict. Este diretório é um sandbox de revisão visual, sem backend. Nenhuma rota, dado ou chamada deve ser confundida com o produto real.

Na raiz do repositório: `npm ci`, `npm run tokens`, `npm run build:ui`. Para prévia: `npm run dev:ui` em `http://127.0.0.1:3100`. Para abrir somente o export estático: `node scripts/serve-ui.mjs sandbox/ui-review/out 3100`.

`/` cataloga as telas; `/identidade/` compara o PNG de referência; `/componentes/` exibe estados e interações de UI DEMO_ONLY; `/telas/{ID}/` apresenta a rota candidata correspondente. O índice informa os limites do ambiente; as telas não fingem serviços configurados. Não existe credencial de teste inventada nem autorização concedida por componente.

Nenhuma publicação/deploy está configurada. Para converter telas em aplicação real é necessário o PRD, contratos e segurança, além de uma instrução explícita para iniciar a etapa seguinte. Os componentes de `packages/ui/components` podem ser reutilizados sem importar telas de revisão nem o PNG de comparação.
