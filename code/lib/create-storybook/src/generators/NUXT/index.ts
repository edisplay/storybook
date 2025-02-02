import { baseGenerator } from '../baseGenerator';
import type { Generator } from '../types';

const generator: Generator = async (packageManager, npmOptions, options) => {
  await baseGenerator(
    packageManager,
    npmOptions,
    options,
    'vue3',
    {
      extraPackages: async () => {
        return ['@nuxtjs/storybook'];
      },
      installFrameworkPackages: false,
      componentsDestinationPath: './components',
      extraMain: {
        stories: ['../components/**/*.mdx', '../components/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
      },
    },
    'nuxt'
  );
  // Add nuxtjs/storybook to nuxt.config.js
  await packageManager.runPackageCommand('nuxi', [
    'module',
    'add',
    '@nuxtjs/storybook',
    '--skipInstall',
  ]);
};

export default generator;
