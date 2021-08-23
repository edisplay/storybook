import dedent from 'ts-dedent';
import deprecate from 'util-deprecate';

import {
  Parameters,
  Args,
  ArgTypes,
  LegacyStoryFn,
  ArgsStoryFn,
  StoryContextForEnhancers,
  StoryContext,
  Framework,
  GlobalAnnotations,
} from '@storybook/csf';

import { ComponentAnnotationsWithId, Story, StoryAnnotationsWithId } from './types';
import { combineParameters } from './parameters';
import { applyHooks } from './hooks';
import { defaultDecorateStory } from './decorators';

const argTypeDefaultValueWarning = deprecate(
  () => {},
  dedent`
  \`argType.defaultValue\` is deprecated and will be removed in Storybook 7.0.

  https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#deprecated-argtype-defaultValue`
);

// Combine all the metadata about a story (both direct and inherited from the component/global scope)
// into a "renderable" story function, with all decorators applied, parameters passed as context etc
//
// Note that this story function is *stateless* in the sense that it does not track args or globals
// Instead, it is expected these are tracked separately (if necessary) and are passed into each invocation.
export function prepareStory<TFramework extends Framework>(
  storyAnnotations: StoryAnnotationsWithId<TFramework>,
  componentAnnotations: ComponentAnnotationsWithId<TFramework>,
  globalAnnotations: GlobalAnnotations<TFramework>
): Story<TFramework> {
  // NOTE: in the current implementation we are doing everything once, up front, rather than doing
  // anything at render time. The assumption is that as we don't load all the stories at once, this
  // will have a limited cost. If this proves misguided, we can refactor it.

  const { id, name } = storyAnnotations;
  const { title } = componentAnnotations;

  const parameters: Parameters = combineParameters(
    globalAnnotations.parameters,
    componentAnnotations.parameters,
    storyAnnotations.parameters
  );

  const decorators = [
    ...(storyAnnotations.decorators || []),
    ...(componentAnnotations.decorators || []),
    ...(globalAnnotations.decorators || []),
  ];

  // Currently it is only possible to set these globally
  const {
    applyDecorators = defaultDecorateStory,
    argTypesEnhancers = [],
    argsEnhancers = [],
  } = globalAnnotations;

  const loaders = [
    ...(globalAnnotations.loaders || []),
    ...(componentAnnotations.loaders || []),
    ...(storyAnnotations.loaders || []),
  ];

  const render = storyAnnotations.render || componentAnnotations.render || globalAnnotations.render;

  const passedArgTypes: ArgTypes = combineParameters(
    globalAnnotations.argTypes,
    componentAnnotations.argTypes,
    storyAnnotations.argTypes
  ) as ArgTypes;

  const { passArgsFirst = true } = parameters;
  // eslint-disable-next-line no-underscore-dangle
  parameters.__isArgsStory = passArgsFirst && render.length > 0;

  // Pull out args[X] || argTypes[X].defaultValue into initialArgs
  const passedArgs: Args = combineParameters(
    globalAnnotations.args,
    componentAnnotations.args,
    storyAnnotations.args
  ) as Args;

  const defaultArgs: Args = Object.entries(
    passedArgTypes as Record<string, { defaultValue: any }>
  ).reduce((acc, [arg, { defaultValue }]) => {
    if (typeof defaultValue !== 'undefined') {
      acc[arg] = defaultValue;
    }
    return acc;
  }, {} as Args);
  if (Object.keys(defaultArgs).length > 0) {
    argTypeDefaultValueWarning();
  }

  const initialArgsBeforeEnhancers = { ...defaultArgs, ...passedArgs };
  const contextForEnhancers: StoryContextForEnhancers<TFramework> = {
    componentId: componentAnnotations.id,
    title,
    kind: title, // Back compat
    id,
    name,
    story: name, // Back compat
    component: componentAnnotations.component,
    subcomponents: componentAnnotations.subcomponents,
    parameters,
    initialArgs: initialArgsBeforeEnhancers,
    argTypes: passedArgTypes,
  };

  contextForEnhancers.initialArgs = argsEnhancers.reduce(
    (accumulatedArgs: Args, enhancer) => ({
      ...accumulatedArgs,
      ...enhancer({
        ...contextForEnhancers,
        initialArgs: initialArgsBeforeEnhancers,
      }),
    }),
    initialArgsBeforeEnhancers
  );

  contextForEnhancers.argTypes = argTypesEnhancers.reduce(
    (accumulatedArgTypes, enhancer) =>
      enhancer({ ...contextForEnhancers, argTypes: accumulatedArgTypes }),
    contextForEnhancers.argTypes
  );

  const applyLoaders = async (context: StoryContext<TFramework>) => {
    const loadResults = await Promise.all(loaders.map((loader) => loader(context)));
    const loaded = Object.assign({}, ...loadResults);
    return { ...context, loaded };
  };

  const undecoratedStoryFn: LegacyStoryFn<TFramework> = (context: StoryContext<TFramework>) => {
    const mappedArgs = Object.entries(context.args).reduce((acc, [key, val]) => {
      const { mapping } = context.argTypes[key] || {};
      acc[key] = mapping && val in mapping ? mapping[val] : val;
      return acc;
    }, {} as Args);

    const mappedContext = { ...context, args: mappedArgs };
    const { passArgsFirst: renderTimePassArgsFirst = true } = context.parameters;
    return renderTimePassArgsFirst
      ? (render as ArgsStoryFn<TFramework>)(mappedArgs, mappedContext)
      : (render as LegacyStoryFn<TFramework>)(mappedContext);
  };
  const unboundStoryFn = applyHooks<TFramework>(applyDecorators)(
    undecoratedStoryFn,
    decorators as any
  );

  const { play } = storyAnnotations;
  const runPlayFunction = async () => {
    if (play) {
      return play();
    }
    return undefined;
  };

  return {
    ...contextForEnhancers,
    originalStoryFn: render,
    undecoratedStoryFn,
    unboundStoryFn,
    applyLoaders,
    runPlayFunction,
  };
}

// function preparedStoryToFunction(preparedStory) {
//   return () => {
//     const result = preparedStory.unboundStoryFn(preparedStory.initialContext)
//     preparedStory.cleanup();

//     return result;
//   }