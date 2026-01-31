import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Container,
    Button,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Check as CheckIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { proposalApi } from '../api/client';
import { ProposalTemplate, ProposalSection, getDefaultTemplate } from '../config/proposalTemplates';
import { brandColors } from '../theme';

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
    items: {
        id: string;
        productName: string;
        description: string | null;
        quantity: number;
        unitPrice: string;
        amount: string;
    }[];
    attachmentUrl?: string; // Added field
    content: any; // Used to store templateId/customizations if implemented
}

export default function ProposalViewPage() {
    const { id } = useParams<{ id: string }>();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [template, setTemplate] = useState<ProposalTemplate>(getDefaultTemplate());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (id) {
            const fetchProposal = async () => {
                try {
                    // Use public endpoint if user is not logged in (would need separate logic),
                    // but here we use the authenticated endpoint for simplicity or assume internal view.
                    // For public view, we would typically use a unique hash token.
                    const response = await proposalApi.getById(id);
                    setProposal(response.data);

                    // Always use the default (Technical) template as requested
                    setTemplate(getDefaultTemplate());

                } catch (err) {
                    setError('Failed to load proposal');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProposal();
        }
    }, [id]);

    const handleAccept = async () => {
        if (!id) return;
        setActionLoading(true);
        try {
            await proposalApi.accept(id);
            setProposal(prev => prev ? { ...prev, status: 'ACCEPTED' } : null);
        } catch (err) {
            console.error('Failed to accept:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!id) return;
        setActionLoading(true);
        try {
            await proposalApi.decline(id);
            setProposal(prev => prev ? { ...prev, status: 'DECLINED' } : null);
        } catch (err) {
            console.error('Failed to decline:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (amount: string | number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(Number(amount));
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress sx={{ color: brandColors.cyan }} />
            </Box>
        );
    }

    if (error || !proposal) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error">{error || 'Proposal not found'}</Alert>
            </Container>
        );
    }



    // --- Standard Template View (Legacy / Automated) ---
    const { styling } = template;

    // ... (Keep existing template render functions, they are used by renderSignature call above or if no attachmentUrl)
    // Wait, I need to make sure renderSignature is available in scope or moved up.
    // The previous implementation defined renderSignature inside the component body, which is fine.
    // But since I return early above, I need to define the render functions BEFORE the early return or duplicate logic.
    // Actually, I can just use the same `renderSignature` function if I define it before the return.
    // So I will move the render functions UP, before the manual check.

    // ... (rest of the file content handling is tricky with replace_file_content if I want to reorder)
    // Actually, simpler: Since I am editing the END of the file mostly, I will check where the render functions are.
    // They are defined AFTER the error check.
    // I will replace `const { styling } = template;` downwards with the new logic that includes the manual check BUT I need the render functions available.
    // It's cleaner to just replace the whole component body or the main return.

    // Let's rewrite the component body to be safe.
    // Or, realizing `renderSignature` depends on `styling` which comes from `template`.
    // Manual view doesn't use `template`.
    // So `renderSignature` inside manual view might break if it tries to access `styling`.
    // I'll inline a simple signature section for manual view.


    const renderCover = (_section: ProposalSection) => (
        <Box
            sx={{
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                background: `linear-gradient(135deg, ${styling.accentColor} 0%, ${styling.primaryColor} 100%)`,
                color: 'white',
                borderRadius: 4,
                mb: 8,
                p: 4,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'url(/grid-pattern.svg)', // Assumption
                    opacity: 0.1,
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <img src="/logo-white.svg" alt="TachyHealth" style={{ height: 60, marginBottom: 40 }} />
                <Typography variant="h2" fontWeight={800} gutterBottom>
                    {proposal.title}
                </Typography>
                <Typography variant="h5" sx={{ opacity: 0.9, mb: 4 }}>
                    Prepared for {proposal.lead.companyName}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.7 }}>
                    {new Date().toLocaleDateString()}
                </Typography>
            </motion.div>
        </Box>
    );

    const renderIntroduction = (section: ProposalSection) => (
        <Box mb={8}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: styling.primaryColor }}>
                {section.title}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'text.secondary' }}>
                {section.content}
            </Typography>
        </Box>
    );

    const renderCustomSection = (section: ProposalSection) => (
        <Box mb={8}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: styling.primaryColor }}>
                {section.title}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'text.secondary', mb: 4 }}>
                {section.content}
            </Typography>

            {section.metadata?.subsections && (
                <Grid container spacing={4}>
                    {section.metadata.subsections.map((sub: any, idx: number) => (
                        <Grid item xs={12} md={4} key={idx}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    bgcolor: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: styling.primaryColor }}>
                                    {sub.title}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {sub.text}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );

    const renderTimeline = (section: ProposalSection) => (
        <Box mb={8}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: styling.primaryColor }}>
                {section.title}
            </Typography>
            {section.content && (
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>{section.content}</Typography>
            )}

            {section.metadata?.phases && (
                <Box sx={{ position: 'relative', my: 4 }}>
                    {/* Vertical line connector */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 20,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            bgcolor: styling.primaryColor,
                            opacity: 0.3,
                        }}
                    />

                    {section.metadata.phases.map((phase: any, idx: number) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', mb: 4, ml: 6, position: 'relative' }}>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: -33,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: styling.primaryColor,
                                    mt: 1,
                                }}
                            />
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    {phase.name}
                                </Typography>
                                <Chip
                                    label={phase.duration}
                                    size="small"
                                    sx={{
                                        mt: 1,
                                        bgcolor: `${styling.primaryColor}20`,
                                        color: styling.primaryColor,
                                        fontWeight: 600,
                                    }}
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );

    const renderPricing = (section: ProposalSection) => (
        <Box mb={8}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: styling.primaryColor }}>
                {section.title}
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'transparent' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'text.secondary' }}>Item</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>Description</TableCell>
                            <TableCell align="center" sx={{ color: 'text.secondary' }}>Qty</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>Price</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {proposal.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell sx={{ fontWeight: 500 }}>{item.productName}</TableCell>
                                <TableCell sx={{ color: 'text.secondary' }}>{item.description}</TableCell>
                                <TableCell align="center">{item.quantity}</TableCell>
                                <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <TableCell colSpan={3} />
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Investment</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.2rem', color: styling.primaryColor }}>
                                {formatCurrency(proposal.totalAmount, proposal.currency)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    const renderSignature = (section: ProposalSection) => (
        <Box mb={8}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: styling.primaryColor }}>
                {section.title}
            </Typography>

            {proposal.status === 'ACCEPTED' ? (
                <Alert severity="success" icon={<CheckIcon />} sx={{ mt: 2 }}>
                    This proposal was accepted on {new Date().toLocaleDateString()}
                </Alert>
            ) : proposal.status === 'DECLINED' ? (
                <Alert severity="error" icon={<CloseIcon />} sx={{ mt: 2 }}>
                    This proposal was declined.
                </Alert>
            ) : (
                <Box sx={{ mt: 4, p: 4, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 2, textAlign: 'center' }}>
                    <Typography gutterBottom>
                        By clicking "Accept Proposal", you agree to the terms and typically entered contract phase.
                    </Typography>
                    <Box mt={3} display="flex" gap={2} justifyContent="center">
                        <Button
                            variant="outlined"
                            color="error"
                            size="large"
                            onClick={handleDecline}
                            disabled={actionLoading}
                            startIcon={<CloseIcon />}
                        >
                            Decline
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleAccept}
                            disabled={actionLoading}
                            startIcon={<CheckIcon />}
                            sx={{
                                bgcolor: styling.primaryColor,
                                '&:hover': { bgcolor: styling.primaryColor }, // Darken slightly in real app
                            }}
                        >
                            Accept Proposal
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );

    // --- Manual Proposal View ---
    if (proposal.attachmentUrl) {
        return (
            <Box sx={{ bgcolor: '#0f1115', minHeight: '100vh', color: 'white', pb: 10 }}>
                <Container maxWidth="md" sx={{ pt: 8 }}>
                    {/* Header */}
                    <Box textAlign="center" mb={6}>
                        <img src="/logo-white.svg" alt="TachyHealth" style={{ height: 50, marginBottom: 30 }} />
                        <Typography variant="h3" fontWeight={800} gutterBottom>
                            {proposal.title}
                        </Typography>
                        <Typography variant="h6" color="textSecondary">
                            Prepared for {proposal.lead.companyName}
                        </Typography>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1, opacity: 0.6 }}>
                            Valid until: {proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : 'N/A'}
                        </Typography>
                    </Box>

                    {/* Document Link Card */}
                    <Paper
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 4,
                            mb: 6
                        }}
                    >
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            Proposal Document
                        </Typography>
                        <Typography color="textSecondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                            Please review the detailed proposal document below.
                        </Typography>

                        <Button
                            variant="outlined"
                            size="large"
                            href={proposal.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                borderColor: brandColors.cyan,
                                color: brandColors.cyan,
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                '&:hover': {
                                    borderColor: brandColors.teal,
                                    bgcolor: 'rgba(6, 182, 212, 0.05)'
                                }
                            }}
                        >
                            View Proposal Document
                        </Button>

                        <Box mt={4} pt={4} borderTop="1px solid rgba(255,255,255,0.1)">
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                Total Investment
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="white">
                                {formatCurrency(proposal.totalAmount, proposal.currency)}
                            </Typography>
                        </Box>
                    </Paper>

                    {/* Signature / Actions */}
                    <Box maxWidth={600} mx="auto" textAlign="center">
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Acceptance
                        </Typography>

                        {proposal.status === 'ACCEPTED' ? (
                            <Alert severity="success" icon={<CheckIcon />} sx={{ mt: 2 }}>
                                This proposal was accepted.
                            </Alert>
                        ) : proposal.status === 'DECLINED' ? (
                            <Alert severity="error" icon={<CloseIcon />} sx={{ mt: 2 }}>
                                This proposal was declined.
                            </Alert>
                        ) : (
                            <Box sx={{ mt: 2, p: 3, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 2 }}>
                                <Typography gutterBottom color="textSecondary">
                                    By clicking "Accept Proposal", you agree to the terms.
                                </Typography>
                                <Box mt={3} display="flex" gap={2} justifyContent="center">
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="large"
                                        onClick={handleDecline}
                                        disabled={actionLoading}
                                        startIcon={<CloseIcon />}
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={handleAccept}
                                        disabled={actionLoading}
                                        startIcon={<CheckIcon />}
                                        sx={{
                                            bgcolor: brandColors.cyan,
                                            '&:hover': { bgcolor: brandColors.teal },
                                        }}
                                    >
                                        Accept Proposal
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Container>
            </Box>
        );
    }

    // --- Manual Proposal View (if attachmentUrl exists) ---
    if (proposal.attachmentUrl) {
        return (
            <Box sx={{ bgcolor: '#0f1115', minHeight: '100vh', color: 'white', pb: 10 }}>
                <Container maxWidth="md" sx={{ pt: 8 }}>
                    {/* Header */}
                    <Box textAlign="center" mb={6}>
                        <img src="/logo-white.svg" alt="TachyHealth" style={{ height: 50, marginBottom: 30 }} />
                        <Typography variant="h3" fontWeight={800} gutterBottom>
                            {proposal.title}
                        </Typography>
                        <Typography variant="h6" color="textSecondary">
                            Prepared for {proposal.lead.companyName}
                        </Typography>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1, opacity: 0.6 }}>
                            Valid until: {proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : 'N/A'}
                        </Typography>
                    </Box>

                    {/* Document Link Card */}
                    <Paper
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 4,
                            mb: 6
                        }}
                    >
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            Proposal Document
                        </Typography>
                        <Typography color="textSecondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                            Please review the detailed proposal document below.
                        </Typography>

                        <Button
                            variant="outlined"
                            size="large"
                            href={proposal.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                borderColor: brandColors.cyan,
                                color: brandColors.cyan,
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                '&:hover': {
                                    borderColor: brandColors.teal,
                                    bgcolor: 'rgba(6, 182, 212, 0.05)'
                                }
                            }}
                        >
                            View Proposal Document
                        </Button>

                        {(proposal.totalAmount && Number(proposal.totalAmount) > 0) && (
                            <Box mt={4} pt={4} borderTop="1px solid rgba(255,255,255,0.1)">
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Total Investment
                                </Typography>
                                <Typography variant="h4" fontWeight={700} color="white">
                                    {formatCurrency(proposal.totalAmount, proposal.currency)}
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Actions */}
                    <Box maxWidth={600} mx="auto">
                        {renderSignature({ title: 'Acceptance', type: 'signature', content: '' } as any)}
                    </Box>
                </Container>
            </Box>
        );
    }

    // Main Render Logic (Standard)
    return (
        <Box sx={{ bgcolor: '#0f1115', minHeight: '100vh', color: 'white', pb: 10 }}>
            <Container maxWidth="lg" sx={{ pt: 4 }}>
                {template.sections.filter(s => s.visible).map((section, idx) => {
                    switch (section.type) {
                        case 'cover': return <Box key={idx}>{renderCover(section)}</Box>;
                        case 'introduction': return <Box key={idx}>{renderIntroduction(section)}</Box>;
                        case 'custom_section': return <Box key={idx}>{renderCustomSection(section)}</Box>;
                        case 'services': return <Box key={idx}>{renderIntroduction(section)}</Box>; // Reuse intro style
                        case 'timeline': return <Box key={idx}>{renderTimeline(section)}</Box>;
                        case 'pricing': return <Box key={idx}>{renderPricing(section)}</Box>;
                        case 'terms': return <Box key={idx}>{renderIntroduction(section)}</Box>;
                        case 'signature': return <Box key={idx}>{renderSignature(section)}</Box>;
                        default: return null;
                    }
                })}
            </Container>
        </Box>
    );
}
