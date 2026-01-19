import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Chip,
    IconButton,
    Button,
    TextField,
    InputAdornment,
    Divider,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Email as EmailIcon,
    Send as SendIcon,
    Inbox as InboxIcon,
    Outbox as OutboxIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { api } from '../api/client';

interface Communication {
    id: string;
    channel: string;
    direction: 'INBOUND' | 'OUTBOUND';
    subject: string;
    content: string;
    status: string;
    createdAt: string;
    deliveredAt?: string;
    lead?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        companyName: string;
    };
}

export function CommunicationsPage() {
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

    useEffect(() => {
        fetchCommunications();
    }, []);

    const fetchCommunications = async () => {
        try {
            setLoading(true);
            setError(null);
            // Note: This endpoint might not exist yet - frontend shows empty state
            const response = await api.get('/communications');
            setCommunications(response.data.communications || response.data || []);
        } catch (err: any) {
            console.error('Failed to fetch communications:', err);
            setError(err.response?.data?.message || 'Failed to load communications');
            setCommunications([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DELIVERED': return 'success';
            case 'SENT': return 'info';
            case 'PENDING': return 'warning';
            case 'FAILED': return 'error';
            case 'OPENED': return 'primary';
            default: return 'default';
        }
    };

    const filteredCommunications = communications.filter(comm => {
        // Filter by tab (inbox/outbox)
        if (tabValue === 0 && comm.direction !== 'OUTBOUND') return false;
        if (tabValue === 1 && comm.direction !== 'INBOUND') return false;

        // Filter by search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                comm.subject?.toLowerCase().includes(search) ||
                comm.content?.toLowerCase().includes(search) ||
                comm.lead?.firstName?.toLowerCase().includes(search) ||
                comm.lead?.lastName?.toLowerCase().includes(search) ||
                comm.lead?.companyName?.toLowerCase().includes(search)
            );
        }
        return true;
    });

    const outboundCount = communications.filter(c => c.direction === 'OUTBOUND').length;
    const inboundCount = communications.filter(c => c.direction === 'INBOUND').length;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        Communications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View and manage all lead communications
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={() => {/* TODO: Open compose dialog */ }}
                >
                    Compose Email
                </Button>
            </Box>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Card sx={{ flex: 1 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <OutboxIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={600}>{outboundCount}</Typography>
                            <Typography variant="body2" color="text.secondary">Sent Emails</Typography>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'success.light' }}>
                            <InboxIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={600}>{inboundCount}</Typography>
                            <Typography variant="body2" color="text.secondary">Received</Typography>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'info.light' }}>
                            <ScheduleIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={600}>
                                {communications.filter(c => c.status === 'PENDING').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Scheduled</Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Main Content */}
            <Paper sx={{ borderRadius: 2 }}>
                {/* Toolbar */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tabs
                        value={tabValue}
                        onChange={(_, v) => setTabValue(v)}
                        sx={{ minHeight: 'auto' }}
                    >
                        <Tab
                            icon={<OutboxIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={`Sent (${outboundCount})`}
                            sx={{ minHeight: 40 }}
                        />
                        <Tab
                            icon={<InboxIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={`Received (${inboundCount})`}
                            sx={{ minHeight: 40 }}
                        />
                    </Tabs>
                    <Box sx={{ flex: 1 }} />
                    <TextField
                        size="small"
                        placeholder="Search emails..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 250 }}
                    />
                    <IconButton onClick={fetchCommunications} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
                <Divider />

                {/* Error Alert */}
                {error && (
                    <Alert severity="info" sx={{ m: 2 }}>
                        {error} - The communications inbox is empty. Emails will appear here when sent or received.
                    </Alert>
                )}

                {/* Loading */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredCommunications.length === 0 ? (
                    /* Empty State */
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <EmailIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No {tabValue === 0 ? 'sent' : 'received'} emails
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {tabValue === 0
                                ? 'Emails sent to leads will appear here'
                                : 'Replies from leads will appear here'
                            }
                        </Typography>
                    </Box>
                ) : (
                    /* Email List */
                    <List disablePadding>
                        {filteredCommunications.map((comm, index) => (
                            <ListItem
                                key={comm.id}
                                divider={index < filteredCommunications.length - 1}
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    py: 2,
                                }}
                                onClick={() => setSelectedComm(comm)}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: comm.direction === 'OUTBOUND' ? 'primary.main' : 'success.main' }}>
                                        {comm.lead ? (
                                            `${comm.lead.firstName?.[0] || ''}${comm.lead.lastName?.[0] || ''}`
                                        ) : (
                                            <PersonIcon />
                                        )}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {comm.lead
                                                    ? `${comm.lead.firstName} ${comm.lead.lastName}`
                                                    : 'Unknown'
                                                }
                                            </Typography>
                                            {comm.lead?.companyName && (
                                                <Typography variant="caption" color="text.secondary">
                                                    • {comm.lead.companyName}
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            noWrap
                                            sx={{ maxWidth: 500 }}
                                        >
                                            <strong>{comm.subject}</strong>
                                            {comm.content && ` — ${comm.content.substring(0, 100)}...`}
                                        </Typography>
                                    }
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                                    <Chip
                                        label={comm.status}
                                        size="small"
                                        color={getStatusColor(comm.status) as any}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDate(comm.createdAt)}
                                    </Typography>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            {/* Email Detail Dialog */}
            <Dialog
                open={!!selectedComm}
                onClose={() => setSelectedComm(null)}
                maxWidth="md"
                fullWidth
            >
                {selectedComm && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: selectedComm.direction === 'OUTBOUND' ? 'primary.main' : 'success.main' }}>
                                    <EmailIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">{selectedComm.subject}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedComm.direction === 'OUTBOUND' ? 'To' : 'From'}: {' '}
                                        {selectedComm.lead
                                            ? `${selectedComm.lead.firstName} ${selectedComm.lead.lastName} (${selectedComm.lead.email})`
                                            : 'Unknown'
                                        }
                                    </Typography>
                                </Box>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <Chip label={selectedComm.channel} size="small" />
                                <Chip
                                    label={selectedComm.status}
                                    size="small"
                                    color={getStatusColor(selectedComm.status) as any}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                    {new Date(selectedComm.createdAt).toLocaleString()}
                                </Typography>
                            </Box>
                            <Paper
                                variant="outlined"
                                sx={{ p: 2, bgcolor: 'background.default', minHeight: 200 }}
                            >
                                <div dangerouslySetInnerHTML={{ __html: selectedComm.content }} />
                            </Paper>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelectedComm(null)}>Close</Button>
                            <Button variant="contained" startIcon={<SendIcon />}>
                                Reply
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
