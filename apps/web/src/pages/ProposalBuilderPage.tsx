import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Grid,
    Autocomplete,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    InputAdornment,
} from '@mui/material';
import {
    Save as SaveIcon,
    Send as SendIcon,
    BackHand as ManualIcon,
    ArrowBack as BackIcon,
    AttachFile as AttachIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { proposalApi, leadsApi } from '../api/client';
import { brandColors } from '../theme';

interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
}

export default function ProposalBuilderPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const queryParams = new URLSearchParams(location.search);
    const preSelectedLeadId = queryParams.get('leadId');

    // Form state
    const [title, setTitle] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [totalAmount, setTotalAmount] = useState<string>(''); // String for easy input handling
    const [proposalType, setProposalType] = useState<'COMMERCIAL' | 'TECHNICAL'>('COMMERCIAL');
    const [uploadMode, setUploadMode] = useState<'URL' | 'FILE'>('URL');
    const [uploading, setUploading] = useState(false);

    // UI state
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load leads for autocomplete
    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const response = await leadsApi.getAll();
                setLeads(response.data.data);
            } catch (err) {
                console.error('Failed to fetch leads:', err);
            }
        };
        fetchLeads();
    }, []);

    // Handle pre-selected lead from URL
    useEffect(() => {
        if (preSelectedLeadId && !selectedLead) {
            const fetchPreSelectedLead = async () => {
                setLoading(true);
                try {
                    const existing = leads.find(l => l.id === preSelectedLeadId);
                    if (existing) {
                        setSelectedLead(existing);
                    } else {
                        const response = await leadsApi.getById(preSelectedLeadId);
                        if (response.data) {
                            setSelectedLead(response.data);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load pre-selected lead', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchPreSelectedLead();
        }
    }, [preSelectedLeadId, leads]);

    // Load existing proposal if editing
    useEffect(() => {
        if (isEditMode && id) {
            const fetchProposal = async () => {
                setLoading(true);
                try {
                    const response = await proposalApi.getById(id);
                    const proposal = response.data;
                    setTitle(proposal.title);
                    setSelectedLead(proposal.lead);
                    setValidUntil(proposal.validUntil ? proposal.validUntil.split('T')[0] : '');
                    setNotes(proposal.notes || '');
                    setAttachmentUrl(proposal.attachmentUrl || '');
                    setTotalAmount(proposal.totalAmount ? String(proposal.totalAmount) : '');
                    setProposalType((proposal as any).type || 'COMMERCIAL');
                } catch (err) {
                    setError('Failed to load proposal');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProposal();
        }
    }, [id, isEditMode]);

    const handleSave = async (markAsSent = false) => {
        if (!selectedLead) {
            setError('Please select a lead');
            return;
        }
        if (!title.trim()) {
            setError('Please enter a proposal title');
            return;
        }
        if (!attachmentUrl.trim()) {
            setError('Please provide a document link/URL');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const proposalData = {
                leadId: selectedLead.id,
                title: title.trim(),
                validUntil: validUntil || undefined,
                notes: notes || undefined,
                attachmentUrl: attachmentUrl.trim(),
                totalAmount: proposalType === 'TECHNICAL' ? 0 : (Number(totalAmount) || 0),
                type: proposalType,
                items: [],
            };

            let proposalId = id;

            if (isEditMode && id) {
                await proposalApi.update(id, {
                    title: proposalData.title,
                    validUntil: proposalData.validUntil,
                    notes: proposalData.notes,
                    attachmentUrl: proposalData.attachmentUrl,
                    totalAmount: proposalData.totalAmount,
                } as any);
            } else {
                const response = await proposalApi.create(proposalData);
                proposalId = response.data.id;
            }

            if (markAsSent && proposalId) {
                await proposalApi.send(proposalId);
            }

            navigate('/proposals');
        } catch (err) {
            setError('Failed to save proposal');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress sx={{ color: brandColors.cyan }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Header */}
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <IconButton onClick={() => navigate('/proposals')}>
                        <BackIcon />
                    </IconButton>
                    <Typography variant="h4" fontWeight={700}>
                        {isEditMode ? 'Edit Manual Proposal' : 'Log Manual Proposal'}
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* Left Column - Form */}
                    <Grid item xs={12} md={8}>
                        <Paper
                            sx={{
                                p: 3,
                                background: 'white',
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            }}
                        >
                            <Typography variant="h6" fontWeight={700} mb={3} color="primary">
                                Proposal Details
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Box display="flex" gap={2} mb={2}>
                                        <Button
                                            variant={proposalType === 'COMMERCIAL' ? 'contained' : 'outlined'}
                                            onClick={() => setProposalType('COMMERCIAL')}
                                            sx={{ flex: 1 }}
                                        >
                                            Commercial Offer
                                        </Button>
                                        <Button
                                            variant={proposalType === 'TECHNICAL' ? 'contained' : 'outlined'}
                                            onClick={() => setProposalType('TECHNICAL')}
                                            sx={{ flex: 1 }}
                                        >
                                            Technical Proposal
                                        </Button>
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        label="Proposal Title"
                                        fullWidth
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Enterprise Licensing Agreement"
                                        required
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        options={leads}
                                        getOptionLabel={(lead) => {
                                            if (!lead) return '';
                                            return `${lead.firstName || ''} ${lead.lastName || ''} - ${lead.companyName || ''}`;
                                        }}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        value={selectedLead}
                                        onChange={(_, newValue) => setSelectedLead(newValue)}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Select Lead" required />
                                        )}
                                        disabled={isEditMode}
                                    />
                                </Grid>

                                {/* Empty grid item to balance if needed, or just let Commercial take next line */}
                                {proposalType === 'TECHNICAL' && (
                                    <Grid item xs={12} md={6} />
                                )}

                                {proposalType === 'COMMERCIAL' && (
                                    <>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Total Deal Value"
                                                fullWidth
                                                type="number"
                                                value={totalAmount}
                                                onChange={(e) => setTotalAmount(e.target.value)}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                }}
                                                placeholder="0.00"
                                                required
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Valid Until"
                                                type="date"
                                                fullWidth
                                                value={validUntil}
                                                onChange={(e) => setValidUntil(e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                required
                                            />
                                        </Grid>
                                    </>
                                )}
                            </Grid>

                            <Divider sx={{ my: 4 }} />

                            <Typography variant="h6" fontWeight={700} mb={1} color="primary" display="flex" alignItems="center" gap={1}>
                                <AttachIcon /> Document
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mb={2}>
                                Upload a file or provide a link to the proposal document.
                            </Typography>

                            <Box mb={2}>
                                <Button
                                    size="small"
                                    onClick={() => setUploadMode('URL')}
                                    sx={{ mr: 1, fontWeight: uploadMode === 'URL' ? 700 : 400 }}
                                >
                                    Enter URL
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => setUploadMode('FILE')}
                                    sx={{ fontWeight: uploadMode === 'FILE' ? 700 : 400 }}
                                >
                                    Upload File
                                </Button>
                            </Box>

                            {uploadMode === 'URL' ? (
                                <TextField
                                    label="Proposal Document URL"
                                    fullWidth
                                    value={attachmentUrl}
                                    onChange={(e) => setAttachmentUrl(e.target.value)}
                                    placeholder="https://..."
                                    required
                                    helperText="This link will be saved with the proposal for reference."
                                />
                            ) : (
                                <Box
                                    sx={{
                                        border: '2px dashed #e2e8f0',
                                        borderRadius: 2,
                                        p: 4,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: '#f8fafc' }
                                    }}
                                    component="label"
                                >
                                    <input
                                        type="file"
                                        hidden
                                        accept=".pdf,.doc,.docx"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setUploading(true);
                                            try {
                                                const res = await proposalApi.uploadFile(file);
                                                setAttachmentUrl(res.data.url);
                                            } catch (err) {
                                                console.error(err);
                                                setError('File upload failed');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                    />
                                    {uploading ? (
                                        <CircularProgress size={24} />
                                    ) : attachmentUrl && attachmentUrl.includes('/uploads/') ? (
                                        <Typography color="success.main">
                                            File Uploaded: {attachmentUrl.split('/').pop()}
                                        </Typography>
                                    ) : (
                                        <Box>
                                            <AttachIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                            <Typography>Click to Upload PDF/Word</Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            <Box mt={4}>
                                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                                    Internal Notes
                                </Typography>
                                <TextField
                                    multiline
                                    rows={3}
                                    fullWidth
                                    placeholder="Any private notes about this deal..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Column - Actions */}
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                position: 'sticky',
                                top: 20,
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            }}
                        >
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} mb={3}>
                                    Status & Actions
                                </Typography>

                                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3 }}>
                                    <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
                                        PROPOSAL TYPE
                                    </Typography>
                                    <Typography fontWeight={600} display="flex" alignItems="center" gap={1}>
                                        <ManualIcon fontSize="small" color="action" /> {proposalType}
                                    </Typography>
                                </Box>

                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<SaveIcon />}
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                    sx={{ mb: 2, py: 1.5 }}
                                >
                                    {saving ? 'Saving...' : 'Save as Draft'}
                                </Button>

                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<SendIcon />}
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                    sx={{
                                        py: 1.5,
                                        bgcolor: brandColors.cyan,
                                        '&:hover': { bgcolor: brandColors.teal },
                                    }}
                                >
                                    {saving ? 'Processing...' : 'Save & Send'}
                                </Button>

                                <Typography variant="caption" color="textSecondary" display="block" textAlign="center" mt={2}>
                                    "Save & Send" will trigger automated sequences.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </motion.div>
        </Box>
    );
}
