import type { Preview } from '@storybook/react-vite';
import '@fontsource-variable/inter';
import '../packages/ui/styles/tokens.css';
import '../packages/ui/styles/ui.css';
import '../venda-web/app/web.css';
import '../venda-web/app/stitch.css';
const preview: Preview = {
  globalTypes: { theme: { description: 'Tema', toolbar: { icon: 'circlehollow', items: ['light', 'dark'] } } },
  initialGlobals: { theme: 'light' },
  decorators: [(Story, context) => <div data-theme={context.globals.theme} className={context.title.startsWith('Telas/') ? undefined : 'vf-story'}><Story /></div>],
  parameters: {
    layout: 'fullscreen', a11y: { test: 'error' }, controls: { expanded: true },
    viewport: { options: { desktop: { name: 'Desktop 1440', styles: { width: '1440px', height: '1000px' } }, mobile: { name: 'Mobile 390', styles: { width: '390px', height: '844px' } } } },
  },
};
export default preview;
