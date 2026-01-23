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
                    padding: '10px 20px',
                    fontWeight: 500,
                    minHeight: 44, // Touch-friendly
                    '@media (max-width: 599px)': {
                        padding: '12px 16px',
                        fontSize: '0.9rem',
                    },
                },
                contained: {
                    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                    },
                },
                sizeSmall: {
                    minHeight: 36,
                    padding: '6px 12px',
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '@media (max-width: 599px)': {
                        padding: 12, // Larger touch target
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
                    '@media (max-width: 599px)': {
                        borderRadius: 8,
                    },
                },
            },
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: 24,
                    '&:last-child': {
                        paddingBottom: 24,
                    },
                    '@media (max-width: 599px)': {
                        padding: 16,
                        '&:last-child': {
                            paddingBottom: 16,
                        },
                    },
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
        MuiTextField: {
            styleOverrides: {
                root: {
                    '@media (max-width: 599px)': {
                        '& .MuiInputBase-root': {
                            minHeight: 48, // Touch-friendly input
                        },
                    },
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
                    '@media (max-width: 599px)': {
                        padding: '12px 8px',
                        fontSize: '0.8rem',
                    },
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#f6f6f6',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    '@media (max-width: 599px)': {
                        margin: 16,
                        width: 'calc(100% - 32px)',
                        maxHeight: 'calc(100% - 32px)',
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    '@media (max-width: 599px)': {
                        width: '85vw',
                        maxWidth: 320,
                    },
                },
            },
        },
    },
});
