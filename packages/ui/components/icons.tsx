import type { SVGProps } from 'react';
const paths = {
  conversation: 'M4 4h16v12H9l-5 4V4Z M8 9h8 M8 12h5',
  home: 'm3 11 9-8 9 8 M5 9v12h14V9 M9 21v-7h6v7',
  contacts: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  sales: 'M4 20V4 M4 20h16 M8 16v-5 M13 16V7 M18 16v-8',
  task: 'M8 3h8v4H8V3Z M8 5H5v16h14V5h-3 M8 13l2 2 5-5',
  automation: 'm13 2-9 12h7l-1 8 10-12h-7l0-8Z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 5l2-2 3 2h6l3-2 2 2-2 3v8l2 3-2 2-3-2H9l-3 2-2-2 2-3V8L4 5Z',
  billing: 'M3 5h18v14H3V5Z M3 10h18 M7 15h3',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M17 17l5 5',
  plus: 'M12 5v14 M5 12h14',
  close: 'm6 6 12 12 M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  warning: 'm12 3 10 18H2L12 3Z M12 9v5 M12 17v1',
  lock: 'M5 10h14v11H5V10Z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  chevron: 'm8 4 8 8-8 8',
  folder: 'M3 6h7l2 3h9v11H3V6Z',
  shield: 'm12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4Z M8 12l3 3 5-6',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
