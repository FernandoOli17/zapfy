import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    ignores: ['next-env.d.ts', '.next/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
