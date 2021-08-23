import { storyNameFromExport, toId, ComponentAnnotations, Framework } from '@storybook/csf';
import dedent from 'ts-dedent';
import { StoryAnnotationsWithId } from './types';

const deprecatedStoryAnnotation = dedent`
CSF .story annotations deprecated; annotate story functions directly:
- StoryFn.story.name => StoryFn.storyName
- StoryFn.story.(parameters|decorators) => StoryFn.(parameters|decorators)
See https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#hoisted-csf-annotations for details and codemod.
`;

export function normalizeStory<TFramework extends Framework>(
  key: string,
  storyExport: any,
  meta: ComponentAnnotations<TFramework>
): StoryAnnotationsWithId<TFramework> {
  let storyObject = storyExport;
  if (typeof storyExport === 'function') {
    storyObject = { ...storyExport };
    storyObject.render = storyExport;
  }

  if (storyObject.story) {
    throw new Error(deprecatedStoryAnnotation);
  }

  const exportName = storyNameFromExport(key);
  const id = toId(meta.id || meta.title, exportName);

  const { decorators, parameters, args, argTypes, loaders, render, play } = storyObject;

  // TODO back compat for exports.story.X

  return {
    id,
    name: storyObject.name || storyObject.storyName || exportName,
    ...(decorators && { decorators }),
    ...(parameters && { parameters }),
    ...(args && { args }),
    ...(argTypes && { argTypes }),
    ...(loaders && { loaders }),
    ...(render && { render }),
    ...(play && { play }),
  };
}