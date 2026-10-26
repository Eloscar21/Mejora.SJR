import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/views/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sjr: {
          navy: '#0b132b',
          'navy-dark': '#060a17',
          'navy-light': '#1c2541',
          blue: '#1d4ed8',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
};
export default config;
