import fs from 'node:fs';
const {routes}=JSON.parse(fs.readFileSync('docs/ux/routes.json','utf8'));
let output=`// Gerado a partir do catálogo UX; telas isoladas sem dados ou APIs.\nimport type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Screen } from '../screens';\nconst meta = { title: 'Telas/Catalogo', component: Screen, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof Screen>;\nexport default meta;\ntype Story = StoryObj<typeof meta>;\n`;
for(const r of routes){
  output+=`export const ${r.id}Desktop: Story = { name: ${JSON.stringify(`${r.title} · desktop`)}, args: { routeId: '${r.id}' }, globals: { viewport: { value: 'desktop' } } };\n`;
  output+=`export const ${r.id}Mobile: Story = { name: ${JSON.stringify(`${r.title} · mobile`)}, args: { routeId: '${r.id}' }, globals: { viewport: { value: 'mobile' } } };\n`;
}
fs.writeFileSync('packages/ui/stories/Screens.stories.tsx',output);
console.log(`${routes.length*2} cenários de tela gerados.`);
