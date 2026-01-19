import { createTheme } from '@mui/material/styles';

// TachyHealth brand colors - per BRD Section 7.9
export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1F4E78', // TachyHealth primary blue
            light: '#2E75B6',
            dark: '#163958',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#2E75B6', // Teal accent
            light: '#4A90C4',
            dark: '#1F5A8A',
            contrastText: '#ffffff',
        },
        success: {
            main: '#22C55E',
            light: '#4ADE80',
            dark: '#16A34A',
        },
        warning: {
            main: '#F59E0B',
            light: '#FBBF24',
            dark: '#D97706',
        },
        error: {
            main: '#EF4444',
            light: '#F87171',
            dark: '#DC2626',
        },
        background: {
            default: '#F9FAFB',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#111827',
            secondary: '#6B7280',
        },
        divider: '#E5E7EB',
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.2,
        },
        h5: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.2,
        },
        h6: {
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1.2,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    shadows: [
        'none',
        '0px 1px 2px rgba(0, 0, 0, 0.05)',
        '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        '0px 4px 6px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.06)',
        '0px 10px 15px rgba(0, 0, 0, 0.1), 0px 4px 6px rgba(0, 0, 0, 0.05)',
        '0px 20px 25px rgba(0, 0, 0, 0.1), 0px 10px 10px rgba(0, 0, 0, 0.04)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
        '0px 25px 50px rgba(0, 0, 0, 0.25)',
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontWeight: 500,
                },
                contained: {
                    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #E5E7EB',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#F9FAFB',
                },
            },
        },
    },
});
