import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    Box,
    TextField,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
    InputAdornment,
    Chip,
    Divider,
} from '@mui/material';
import {
    Search as SearchIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Email as EmailIcon,
    Description as DocumentIcon,
    Analytics as AnalyticsIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
    category: 'navigation' | 'action' | 'lead';
    keywords?: string[];
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();

    // Get leads from Redux for searching (safely handle if slice doesn't exist)
    const leads = useSelector((state: RootState) => (state as any).leads?.leads || []);

    const close = useCallback(() => {
        setOpen(false);
        setSearch('');
        setSelectedIndex(0);
    }, []);

    // Build command items
    const commands: CommandItem[] = useMemo(() => {
        const navCommands: CommandItem[] = [
            {
                id: 'nav-dashboard',
                title: 'Go to Dashboard',
                icon: <DashboardIcon />,
                action: () => { navigate('/dashboard'); close(); },
                category: 'navigation',
                keywords: ['home', 'main'],
            },
            {
                id: 'nav-leads',
                title: 'Go to Leads',
                icon: <PeopleIcon />,
                action: () => { navigate('/leads'); close(); },
                category: 'navigation',
                keywords: ['contacts', 'prospects'],
            },
            {
                id: 'nav-calendar',
                title: 'Go to Calendar',
                icon: <CalendarIcon />,
                action: () => { navigate('/calendar'); close(); },
                category: 'navigation',
                keywords: ['schedule', 'meetings'],
            },
            {
                id: 'nav-communications',
                title: 'Go to Communications',
                icon: <EmailIcon />,
                action: () => { navigate('/communications'); close(); },
                category: 'navigation',
                keywords: ['email', 'messages'],
            },
            {
                id: 'nav-documents',
                title: 'Go to Documents',
                icon: <DocumentIcon />,
                action: () => { navigate('/documents'); close(); },
                category: 'navigation',
                keywords: ['files', 'contracts'],
            },
            {
                id: 'nav-analytics',
                title: 'Go to Analytics',
                icon: <AnalyticsIcon />,
                action: () => { navigate('/analytics'); close(); },
                category: 'navigation',
                keywords: ['reports', 'stats'],
            },
            {
                id: 'nav-settings',
                title: 'Go to Settings',
                icon: <SettingsIcon />,
                action: () => { navigate('/settings'); close(); },
                category: 'navigation',
                keywords: ['preferences', 'config'],
            },
        ];

        const actionCommands: CommandItem[] = [
            {
                id: 'action-new-lead',
                title: 'Create New Lead',
                icon: <AddIcon />,
                action: () => { navigate('/leads/new'); close(); },
                category: 'action',
                keywords: ['add', 'create'],
            },
        ];

        // Add leads as searchable items
        const leadCommands: CommandItem[] = leads.slice(0, 10).map((lead: any) => ({
            id: `lead-${lead.id}`,
            title: `${lead.firstName} ${lead.lastName}`,
            subtitle: lead.companyName || lead.email,
            icon: <PersonIcon />,
            action: () => { navigate(`/leads/${lead.id}`); close(); },
            category: 'lead' as const,
            keywords: [lead.email, lead.companyName].filter(Boolean),
        }));

        return [...actionCommands, ...navCommands, ...leadCommands];
    }, [navigate, close, leads]);

    // Filter commands based on search
    const filteredCommands = useMemo(() => {
        if (!search.trim()) return commands.slice(0, 8);

        const query = search.toLowerCase();
        return commands.filter(cmd =>
            cmd.title.toLowerCase().includes(query) ||
            cmd.subtitle?.toLowerCase().includes(query) ||
            cmd.keywords?.some(k => k.toLowerCase().includes(query))
        );
    }, [commands, search]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open with Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }

            // Close with Escape
            if (e.key === 'Escape' && open) {
                close();
            }

            // Navigate with arrows
            if (open) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev < filteredCommands.length - 1 ? prev + 1 : 0
                    );
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev > 0 ? prev - 1 : filteredCommands.length - 1
                    );
                }
                if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
                    e.preventDefault();
                    filteredCommands[selectedIndex].action();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, close, filteredCommands, selectedIndex]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'action': return 'Actions';
            case 'navigation': return 'Navigation';
            case 'lead': return 'Leads';
            default: return '';
        }
    };

    // Group commands by category
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);

    return (
        <Dialog
            open={open}
            onClose={close}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    mt: -10,
                },
            }}
        >
            <Box sx={{ p: 2 }}>
                <TextField
                    fullWidth
                    autoFocus
                    placeholder="Search commands, leads, or pages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    variant="outlined"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <Chip
                                    label="ESC"
                                    size="small"
                                    sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                        bgcolor: 'grey.200',
                                    }}
                                />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                        },
                    }}
                />
            </Box>

            <Divider />

            <List sx={{ maxHeight: 400, overflow: 'auto', py: 1 }}>
                {Object.entries(groupedCommands).map(([category, items]) => (
                    <Box key={category}>
                        <Typography
                            variant="caption"
                            sx={{
                                px: 2,
                                py: 0.5,
                                display: 'block',
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            {getCategoryLabel(category)}
                        </Typography>
                        {items.map((cmd) => {
                            const globalIndex = filteredCommands.indexOf(cmd);
                            return (
                                <ListItem
                                    key={cmd.id}
                                    onClick={cmd.action}
                                    selected={globalIndex === selectedIndex}
                                    sx={{
                                        cursor: 'pointer',
                                        mx: 1,
                                        borderRadius: 2,
                                        '&.Mui-selected': {
                                            bgcolor: 'primary.light',
                                            '&:hover': {
                                                bgcolor: 'primary.light',
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {cmd.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={cmd.title}
                                        secondary={cmd.subtitle}
                                        primaryTypographyProps={{ fontWeight: 500 }}
                                    />
                                </ListItem>
                            );
                        })}
                    </Box>
                ))}

                {filteredCommands.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No results found for "{search}"
                        </Typography>
                    </Box>
                )}
            </List>

            <Divider />
            <Box sx={{ p: 1.5, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                    <Chip label="↑↓" size="small" sx={{ mr: 0.5, height: 18 }} /> Navigate
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    <Chip label="↵" size="small" sx={{ mr: 0.5, height: 18 }} /> Select
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    <Chip label="⌘K" size="small" sx={{ mr: 0.5, height: 18 }} /> Toggle
                </Typography>
            </Box>
        </Dialog>
    );
}
