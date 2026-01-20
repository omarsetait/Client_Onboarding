import { createTheme } from '@mui/material/styles';

// Brand Gradient Colors
export const brandColors = {
    cyan: '#28aae2',
    magenta: '#b83389',
    teal: '#41b9bf',
    purple: '#5d2983',
    navy: '#29235c',
};

// Gradient definitions
export const gradients = {
    primary: `linear-gradient(135deg, ${brandColors.cyan} 0%, ${brandColors.teal} 50%, ${brandColors.magenta} 100%)`,
    sidebar: `linear-gradient(180deg, ${brandColors.navy} 0%, ${brandColors.purple} 50%, ${brandColors.magenta} 100%)`,
    accent: `linear-gradient(90deg, ${brandColors.cyan} 0%, ${brandColors.magenta} 100%)`,
    logo: `linear-gradient(135deg, ${brandColors.cyan} 0%, ${brandColors.teal} 25%, ${brandColors.magenta} 50%, ${brandColors.purple} 75%, ${brandColors.navy} 100%)`,
};

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: brandColors.cyan,
            light: '#86d1f3',
            dark: '#0e6796',
            contrastText: '#ffffff',
        },
        secondary: {
            main: brandColors.magenta,
            light: '#e284cb',
            dark: '#9a2a70',
            contrastText: '#ffffff',
        },
        success: {
            main: '#2AC769',
            light: '#4ADE80',
            dark: '#16A34A',
        },
        warning: {
            main: '#FFC107',
            light: '#FBBF24',
            dark: '#D97706',
        },
        error: {
            main: '#DC3545',
            light: '#F87171',
            dark: '#DC2626',
        },
        info: {
            main: brandColors.teal,
            light: '#86d7da',
            dark: '#2c838e',
        },
        background: {
            default: '#f6f6f6',
            paper: '#FFFFFF',
        },
        text: {
            primary: brandColors.navy,
            secondary: '#6d6d6d',
        },
        divider: '#e7e7e7',
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: '#080808',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: '#080808',
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: '#080808',
        },
        h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.2,
            color: '#080808',
        },
        h5: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.2,
            color: '#080808',
        },
        h6: {
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1.2,
            color: '#080808',
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
                    borderBottom: '1px solid #e7e7e7',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#f6f6f6',
                },
            },
        },
    },
});
