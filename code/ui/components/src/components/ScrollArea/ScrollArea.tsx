import type { FC } from 'react';
import React from 'react';
import { styled } from '@storybook/theming';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

export interface ScrollAreaProps {
  children?: React.ReactNode;
  horizontal?: boolean;
  vertical?: boolean;
  className?: string;
  offset?: number;
  scrollbarSize?: number;
}

const ScrollAreaRoot = styled(ScrollAreaPrimitive.Root)<{ scrollbarsize: number; offset: number }>(
  ({ scrollbarsize, offset }) => ({
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    '--scrollbar-size': `${scrollbarsize + offset}px`,
    '--radix-scroll-area-thumb-width': `${scrollbarsize}px`,
  })
);

const ScrollAreaViewport = styled(ScrollAreaPrimitive.Viewport)({
  width: '100%',
  height: '100%',
});

const ScrollAreaScrollbar = styled(ScrollAreaPrimitive.Scrollbar)<{
  offset: number;
  horizontal: boolean;
  vertical: boolean;
}>(({ offset, horizontal, vertical }) => ({
  display: 'flex',
  userSelect: 'none', // ensures no selection
  touchAction: 'none', // disable browser handling of all panning and zooming gestures on touch devices
  background: 'transparent',
  transition: 'all 0.2s ease-out',
  borderRadius: 'var(--scrollbar-size)',

  '&[data-orientation="vertical"]': {
    width: 'var(--scrollbar-size)',
    paddingRight: offset,
    marginTop: offset,
    marginBottom: horizontal && vertical ? 0 : offset,
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: 'column',
    height: 'var(--scrollbar-size)',
    paddingBottom: offset,
    marginLeft: offset,
    marginRight: horizontal && vertical ? 0 : offset,
  },
}));

const ScrollAreaThumb = styled(ScrollAreaPrimitive.Thumb)(({ theme }) => ({
  flex: 1,
  background: theme.textMutedColor,
  opacity: 0.5,
  borderRadius: `var(--scrollbar-size)`,
  position: 'relative',
  transition: 'opacity 0.2s ease-out',

  '&:hover': { opacity: 0.8 },

  /* increase target size for touch devices https://www.w3.org/WAI/WCAG21/Understanding/target-size.html */
  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: '100%',
    height: '100%',
    minWidth: 44,
    minHeight: 44,
  },
}));

export const ScrollArea: FC<ScrollAreaProps> = ({
  children,
  horizontal = false,
  vertical = false,
  offset = 2,
  scrollbarSize = 6,
}) => (
  <ScrollAreaRoot scrollbarsize={scrollbarSize} offset={offset}>
    <ScrollAreaViewport>{children}</ScrollAreaViewport>
    {horizontal && (
      <ScrollAreaScrollbar
        orientation="horizontal"
        offset={offset}
        horizontal={horizontal}
        vertical={vertical}
      >
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    )}
    {vertical && (
      <ScrollAreaScrollbar
        orientation="vertical"
        offset={offset}
        horizontal={horizontal}
        vertical={vertical}
      >
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    )}
    {horizontal && vertical && <ScrollAreaPrimitive.Corner />}
  </ScrollAreaRoot>
);
