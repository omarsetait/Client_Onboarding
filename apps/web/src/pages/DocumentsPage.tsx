import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    IconButton,
    TextField,
    InputAdornment,
    Chip,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    CircularProgress,
    Alert,
    Menu,
    MenuItem,
    Divider,
} from '@mui/material';
import {
    Description as DocIcon,
    PictureAsPdf as PdfIcon,
    Article as ArticleIcon,
    Upload as UploadIcon,
    Download as DownloadIcon,
    Search as SearchIcon,
    MoreVert as MoreIcon,
    Add as AddIcon,
    Folder as FolderIcon,
    InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { api } from '../api/client';

interface Document {
    id: string;
    name: string;
    type: string;
    category: string;
    status: string;
    fileSize?: number;
    createdAt: string;
    updatedAt: string;
    lead?: {
        id: string;
        firstName: string;
        lastName: string;
        companyName: string;
    };
}

export function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/documents');
            setDocuments(response.data.documents || response.data || []);
        } catch (err: any) {
            console.error('Failed to fetch documents:', err);
            setError(err.response?.data?.message || 'Failed to load documents');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getDocIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'pdf': return <PdfIcon sx={{ color: '#dc3545' }} />;
            case 'proposal': return <ArticleIcon sx={{ color: '#007bff' }} />;
            case 'contract': return <DocIcon sx={{ color: '#28a745' }} />;
            default: return <FileIcon sx={{ color: '#6c757d' }} />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'PROPOSAL': return 'primary';
            case 'CONTRACT': return 'success';
            case 'INVOICE': return 'warning';
            case 'NDA': return 'info';
            case 'OTHER': return 'default';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'default';
            case 'PENDING': return 'warning';
            case 'SIGNED': return 'success';
            case 'SENT': return 'info';
            case 'EXPIRED': return 'error';
            default: return 'default';
        }
    };

    const filteredDocuments = documents.filter(doc => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            doc.name?.toLowerCase().includes(search) ||
            doc.type?.toLowerCase().includes(search) ||
            doc.category?.toLowerCase().includes(search) ||
            doc.lead?.companyName?.toLowerCase().includes(search)
        );
    });

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, doc: Document) => {
        setAnchorEl(event.currentTarget);
        setSelectedDoc(doc);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedDoc(null);
    };

    // Stats
    const proposalCount = documents.filter(d => d.category === 'PROPOSAL').length;
    const contractCount = documents.filter(d => d.category === 'CONTRACT').length;
    const pendingCount = documents.filter(d => d.status === 'PENDING').length;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        Documents
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage proposals, contracts, and other documents
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" startIcon={<UploadIcon />}>
                        Upload
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />}>
                        Create Document
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                                <ArticleIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={600}>{proposalCount}</Typography>
                                <Typography variant="body2" color="text.secondary">Proposals</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                                <DocIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={600}>{contractCount}</Typography>
                                <Typography variant="body2" color="text.secondary">Contracts</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                                <FolderIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={600}>{pendingCount}</Typography>
                                <Typography variant="body2" color="text.secondary">Pending Signature</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search & Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search documents by name, type, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    {error} - The document library is empty. Documents will appear here when created for leads.
                </Alert>
            )}

            {/* Loading */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : filteredDocuments.length === 0 ? (
                /* Empty State */
                <Paper sx={{ textAlign: 'center', py: 8 }}>
                    <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No documents yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                        Create proposals and contracts for your leads to see them here
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />}>
                        Create Your First Document
                    </Button>
                </Paper>
            ) : (
                /* Document List */
                <Paper>
                    <List disablePadding>
                        {filteredDocuments.map((doc, index) => (
                            <ListItem
                                key={doc.id}
                                divider={index < filteredDocuments.length - 1}
                                secondaryAction={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={doc.category}
                                            size="small"
                                            color={getCategoryColor(doc.category) as any}
                                        />
                                        <Chip
                                            label={doc.status}
                                            size="small"
                                            variant="outlined"
                                            color={getStatusColor(doc.status) as any}
                                        />
                                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}>
                                            <MoreIcon />
                                        </IconButton>
                                    </Box>
                                }
                                sx={{ py: 2 }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'background.default' }}>
                                        {getDocIcon(doc.type)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" fontWeight={500}>
                                            {doc.name}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                            {doc.lead && (
                                                <Typography variant="caption" color="text.secondary">
                                                    📋 {doc.lead.companyName}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                📁 {formatFileSize(doc.fileSize)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                📅 {formatDate(doc.createdAt)}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleMenuClose}>
                    <DownloadIcon sx={{ mr: 1, fontSize: 20 }} /> Download
                </MenuItem>
                <MenuItem onClick={handleMenuClose}>
                    <DocIcon sx={{ mr: 1, fontSize: 20 }} /> View Details
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
                    Delete
                </MenuItem>
            </Menu>
        </Box>
    );
}
