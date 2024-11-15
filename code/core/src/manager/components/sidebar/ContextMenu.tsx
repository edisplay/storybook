import type { ComponentProps, FC, SyntheticEvent } from 'react';
import React, { useMemo, useState } from 'react';

import { TooltipLinkList, WithTooltip } from '@storybook/core/components';
import { type API_HashEntry, Addon_TypesEnum } from '@storybook/core/types';
import { EllipsisIcon } from '@storybook/icons';

import { type TestProviders } from '@storybook/core/core-events';
import { useStorybookState } from '@storybook/core/manager-api';
import type { API } from '@storybook/core/manager-api';

import type { Link } from '../../../components/components/tooltip/TooltipLinkList';
import { StatusButton } from './StatusButton';
import type { ExcludesNull } from './Tree';
import { ContextMenu } from './Tree';

export const useContextMenu = (context: API_HashEntry, links: Link[], api: API) => {
  const [hoverCount, setHoverCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handlers = useMemo(() => {
    return {
      onMouseEnter: () => {
        setHoverCount((c) => c + 1);
      },
      onOpen: (event: SyntheticEvent) => {
        event.stopPropagation();
        setIsOpen(true);
      },
      onClose: () => {
        setIsOpen(false);
      },
    };
  }, []);

  const providerLinks = useMemo(() => {
    const testProviders = api.getElements(
      Addon_TypesEnum.experimental_TEST_PROVIDER
    ) as any as TestProviders;

    if (hoverCount) {
      return generateTestProviderLinks(testProviders, context);
    }
    return [];
  }, [api, context, hoverCount]);

  return useMemo(() => {
    const rendered = providerLinks.length > 0 || links.length > 0;
    const forceDisplay = isOpen;
    return {
      onMouseEnter: handlers.onMouseEnter,
      node: rendered ? (
        <WithTooltip
          closeOnOutsideClick
          onClick={handlers.onOpen}
          placement="bottom-end"
          onVisibleChange={(visible) => {
            if (!visible) {
              handlers.onClose();
            } else {
              setIsOpen(true);
            }
          }}
          tooltip={({ onHide }) => (
            <LiveContextMenu context={context} links={links} onClick={onHide} />
          )}
        >
          <StatusButton
            type="button"
            status={'pending'}
            data-displayed={forceDisplay ? 'on' : 'off'}
          >
            <EllipsisIcon />
          </StatusButton>
        </WithTooltip>
      ) : null,
    };
  }, [context, handlers, isOpen, links, providerLinks.length]);
};

/**
 * This component re-subscribes to storybook's core state, hence the Live prefix. It is used to
 * render the context menu for the sidebar. it self is a tooltip link list that renders the links
 * provided to it. In addition to the links, it also renders the test providers.
 */
const LiveContextMenu: FC<{ context: API_HashEntry } & ComponentProps<typeof TooltipLinkList>> = ({
  context,
  links,
  ...rest
}) => {
  const { testProviders } = useStorybookState();
  const providerLinks: Link[] = generateTestProviderLinks(testProviders, context);
  const groups = Array.isArray(links[0]) ? (links as Link[][]) : [links as Link[]];
  const all = groups.concat([providerLinks]);

  return <TooltipLinkList {...rest} links={all} />;
};

export function generateTestProviderLinks(
  testProviders: TestProviders,
  context: API_HashEntry
): Link[] {
  return Object.entries(testProviders)
    .map(([testProviderId, state]) => {
      if (!state) {
        return null;
      }

      const content = state.contextMenu?.({ context, state }, ContextMenu);

      if (!content) {
        return null;
      }

      return {
        id: testProviderId,
        content,
      };
    })
    .filter(Boolean as any as ExcludesNull);
}
