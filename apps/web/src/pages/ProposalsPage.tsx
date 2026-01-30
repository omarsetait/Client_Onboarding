import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Button,
    CircularProgress,
    Alert,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { proposalApi } from '../api/client';
import { brandColors } from '../theme';
import { motion } from 'framer-motion';

interface Proposal {
    id: string;
    title: string;
    status: string;
    totalAmount: string;
    currency: string;
    validUntil: string | null;
    createdAt: string;
    lead: {
        id: string;
        firstName: string;
        lastName: string;
        companyName: string;
    };
    createdBy: {
        firstName: string;
        lastName: string;
    };
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
    DRAFT: 'default',
    SENT: 'info',
    VIEWED: 'primary',
    ACCEPTED: 'success',
    DECLINED: 'error',
    EXPIRED: 'warning',
};

export default function ProposalsPage() {
    const navigate = useNavigate();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProposals = async () => {
        try {
            setLoading(true);
            const response = await proposalApi.getAll();
            setProposals(response.data);
        } catch (err) {
            setError('Failed to load proposals');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const handleSend = async (id: string) => {
        try {
            await proposalApi.send(id);
            fetchProposals();
        } catch (err) {
            console.error('Failed to send proposal:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this proposal?')) return;
        try {
            await proposalApi.delete(id);
            fetchProposals();
        } catch (err) {
            console.error('Failed to delete proposal:', err);
        }
    };

    const formatCurrency = (amount: string, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(parseFloat(amount));
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress sx={{ color: brandColors.cyan }} />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" fontWeight={700}>
                        Proposals
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/proposals/new')}
                        sx={{
                            background: `linear-gradient(135deg, ${brandColors.cyan} 0%, ${brandColors.teal} 100%)`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${brandColors.teal} 0%, ${brandColors.cyan} 100%)`,
                            },
                        }}
                    >
                        Create Proposal
                    </Button>
                </Box>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <TableContainer
                    component={Paper}
                    sx={{
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>Title</TableCell>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>Client</TableCell>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>Amount</TableCell>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>Status</TableCell>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>Valid Until</TableCell>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>Created</TableCell>
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {proposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="textSecondary">
                                            No proposals yet. Create your first proposal!
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                proposals.map((proposal) => (
                                    <TableRow
                                        key={proposal.id}
                                        hover
                                        sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}
                                    >
                                        <TableCell>
                                            <Typography fontWeight={500}>{proposal.title}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {proposal.lead.firstName} {proposal.lead.lastName}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {proposal.lead.companyName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight={600} sx={{ color: brandColors.cyan }}>
                                                {formatCurrency(proposal.totalAmount, proposal.currency)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={proposal.status}
                                                color={statusColors[proposal.status] || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{formatDate(proposal.validUntil)}</TableCell>
                                        <TableCell>{formatDate(proposal.createdAt)}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => navigate(`/proposals/${proposal.id}`)}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {proposal.status === 'DRAFT' && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Send">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleSend(proposal.id)}
                                                            sx={{ color: brandColors.cyan }}
                                                        >
                                                            <SendIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDelete(proposal.id)}
                                                            color="error"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </motion.div>
        </Box>
    );
}
