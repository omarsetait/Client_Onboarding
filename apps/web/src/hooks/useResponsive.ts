import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Breakpoint constants (in pixels)
export const BREAKPOINTS = {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
} as const;

interface ResponsiveState {
    isMobile: boolean;      // < 600px
    isTablet: boolean;      // 600px - 899px
    isDesktop: boolean;     // >= 900px
    isSmallMobile: boolean; // < 375px (iPhone SE)
    isLandscape: boolean;
    screenWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Hook for responsive design utilities
 * Provides consistent breakpoint detection across the app
 */
export function useResponsive(): ResponsiveState {
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
    const isSmallMobile = useMediaQuery('(max-width: 374px)');
    const isLandscape = useMediaQuery('(orientation: landscape)');

    // Determine current screen width category
    const isXs = useMediaQuery(theme.breakpoints.only('xs'));
    const isSm = useMediaQuery(theme.breakpoints.only('sm'));
    const isMd = useMediaQuery(theme.breakpoints.only('md'));
    const isLg = useMediaQuery(theme.breakpoints.only('lg'));

    let screenWidth: ResponsiveState['screenWidth'] = 'xl';
    if (isXs) screenWidth = 'xs';
    else if (isSm) screenWidth = 'sm';
    else if (isMd) screenWidth = 'md';
    else if (isLg) screenWidth = 'lg';

    return {
        isMobile,
        isTablet,
        isDesktop,
        isSmallMobile,
        isLandscape,
        screenWidth,
    };
}

// Utility for conditional styles based on breakpoint
export const mobileStyles = (styles: Record<string, unknown>) => ({
    '@media (max-width: 599px)': styles,
});

export const tabletStyles = (styles: Record<string, unknown>) => ({
    '@media (min-width: 600px) and (max-width: 899px)': styles,
});

export const desktopStyles = (styles: Record<string, unknown>) => ({
    '@media (min-width: 900px)': styles,
});
