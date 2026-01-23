import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { brandColors, gradients } from '../theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeMode() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within ThemeProvider');
    }
    return context;
}

// Common component overrides
const getComponentOverrides = (mode: ThemeMode) => ({
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 500,
                minHeight: 44,
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
                    padding: 12,
                },
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                boxShadow: mode === 'dark'
                    ? '0px 1px 3px rgba(0, 0, 0, 0.3)'
                    : '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
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
                        minHeight: 48,
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
                borderBottom: mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.1)'
                    : '1px solid #e7e7e7',
                '@media (max-width: 599px)': {
                    padding: '12px 8px',
                    fontSize: '0.8rem',
                },
            },
            head: {
                fontWeight: 600,
                backgroundColor: mode === 'dark' ? '#1e1e1e' : '#f6f6f6',
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
});

// Light theme
const createLightTheme = () => createTheme({
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
        success: { main: '#2AC769', light: '#4ADE80', dark: '#16A34A' },
        warning: { main: '#FFC107', light: '#FBBF24', dark: '#D97706' },
        error: { main: '#DC3545', light: '#F87171', dark: '#DC2626' },
        info: { main: brandColors.teal, light: '#86d7da', dark: '#2c838e' },
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
    },
    shape: { borderRadius: 8 },
    components: getComponentOverrides('light') as any,
});

// Dark theme
const createDarkTheme = () => createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: brandColors.cyan,
            light: '#5bc4f0',
            dark: '#1a8cc2',
            contrastText: '#ffffff',
        },
        secondary: {
            main: brandColors.magenta,
            light: '#d15ba8',
            dark: '#9a2a70',
            contrastText: '#ffffff',
        },
        success: { main: '#4ADE80', light: '#86efac', dark: '#22c55e' },
        warning: { main: '#FBBF24', light: '#fcd34d', dark: '#f59e0b' },
        error: { main: '#F87171', light: '#fca5a5', dark: '#ef4444' },
        info: { main: brandColors.teal, light: '#7dd3fc', dark: '#0ea5e9' },
        background: {
            default: '#0a0a0a',
            paper: '#141414',
        },
        text: {
            primary: '#f5f5f5',
            secondary: '#a3a3a3',
        },
        divider: 'rgba(255,255,255,0.1)',
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    shape: { borderRadius: 8 },
    components: getComponentOverrides('dark') as any,
});

interface Props {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: Props) {
    const [mode, setMode] = useState<ThemeMode>(() => {
        // Load from localStorage or default to light
        const saved = localStorage.getItem('themeMode');
        return (saved as ThemeMode) || 'light';
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('themeMode', mode);
        // Update body background for seamless transitions
        document.body.style.backgroundColor = mode === 'dark' ? '#0a0a0a' : '#f6f6f6';
    }, [mode]);

    const toggleTheme = () => {
        setMode(prev => prev === 'light' ? 'dark' : 'light');
    };

    const theme = useMemo(
        () => mode === 'light' ? createLightTheme() : createDarkTheme(),
        [mode]
    );

    const value = useMemo(
        () => ({ mode, toggleTheme, setMode }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
}

export { brandColors, gradients };
