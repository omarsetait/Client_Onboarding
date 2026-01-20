import { Box, BoxProps } from '@mui/material';
import { forwardRef } from 'react';

interface GlassCardProps extends BoxProps {
    blur?: number;
    opacity?: number;
}

/**
 * GlassCard - A reusable component with glassmorphism effect
 * Features backdrop blur, semi-transparent background, and subtle border
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ blur = 12, opacity = 0.85, children, sx, ...props }, ref) => {
        return (
            <Box
                ref={ref}
                sx={{
                    background: `rgba(255, 255, 255, ${opacity})`,
                    backdropFilter: `blur(${blur}px)`,
                    WebkitBackdropFilter: `blur(${blur}px)`,
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                    p: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                        transform: 'translateY(-2px)',
                    },
                    ...sx,
                }}
                {...props}
            >
                {children}
            </Box>
        );
    }
);

GlassCard.displayName = 'GlassCard';
