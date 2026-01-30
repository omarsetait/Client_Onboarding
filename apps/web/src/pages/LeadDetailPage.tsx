import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Grid,
    Divider,
    Skeleton,
    IconButton,
    Avatar,
    Tabs,
    Tab,
    Menu,
    MenuItem,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Business as BusinessIcon,
    Schedule as ScheduleIcon,
    AutoAwesome as AiIcon,
    MoreVert as MoreIcon,
    Description as ProposalIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { leadsApi } from '../api/client';
import { AiRecommendationPanel } from '../components/AiRecommendationPanel';
import { AiEmailGenerator } from '../components/AiEmailGenerator';
import { AiLeadScorer } from '../components/AiLeadScorer';
import { brandColors } from '../theme';

export function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['lead', id],
        queryFn: () => leadsApi.getById(id!),
        enabled: !!id,
    });

    const lead = data?.data;

    if (isLoading) {
        return (
            <Box>
                <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Box>
        );
    }

    if (error || !lead) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="error">Lead not found</Typography>
                <Button onClick={() => navigate('/leads')} sx={{ mt: 2 }}>
                    Back to Leads
                </Button>
            </Box>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'error';
        if (score >= 50) return 'warning';
        return 'default';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/leads')}>
                    <BackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={600}>
                        {lead.firstName} {lead.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {lead.companyName}
                    </Typography>
                </Box>
                <Chip
                    label={`Score: ${lead.score}`}
                    color={getScoreColor(lead.score)}
                    sx={{ fontWeight: 600 }}
                />
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <MoreIcon />
                </IconButton>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                >
                    <MenuItem onClick={() => { navigate(`/proposals/new?leadId=${id}`); setAnchorEl(null); }}>
                        Create Proposal
                    </MenuItem>
                    <MenuItem onClick={() => setAnchorEl(null)}>Edit Lead</MenuItem>
                    <MenuItem onClick={() => setAnchorEl(null)}>Assign Lead</MenuItem>
                    <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: 'error.main' }}>
                        Delete Lead
                    </MenuItem>
                </Menu>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                    <Tab label="Overview" />
                    <Tab label="Proposals" icon={<ProposalIcon />} iconPosition="start" />
                    <Tab label="AI Assistant" icon={<AiIcon />} iconPosition="start" />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {/* Left Column - Lead Info */}
                    <Grid item xs={12} md={8}>
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Contact Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <EmailIcon color="action" fontSize="small" />
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    Email
                                                </Typography>
                                                <Typography>{lead.email}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <PhoneIcon color="action" fontSize="small" />
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    Phone
                                                </Typography>
                                                <Typography>{lead.phone || 'Not provided'}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <BusinessIcon color="action" fontSize="small" />
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    Job Title
                                                </Typography>
                                                <Typography>{lead.jobTitle || 'Not provided'}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <BusinessIcon color="action" fontSize="small" />
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    Industry
                                                </Typography>
                                                <Typography>{lead.industry || 'Not provided'}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                </Grid>

                                {lead.originalMessage && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Original Message
                                        </Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {lead.originalMessage}
                                        </Typography>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Activity Timeline */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Activity Timeline
                                </Typography>
                                {lead.activities?.length > 0 ? (
                                    <Box>
                                        {lead.activities.slice(0, 10).map((activity: any) => (
                                            <Box
                                                key={activity.id}
                                                sx={{
                                                    display: 'flex',
                                                    gap: 2,
                                                    py: 2,
                                                    borderBottom: '1px solid',
                                                    borderColor: 'divider',
                                                    '&:last-child': { borderBottom: 0 },
                                                }}
                                            >
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: activity.automated ? 'secondary.light' : 'primary.light' }}>
                                                    {activity.automated ? <AiIcon fontSize="small" /> : <ScheduleIcon fontSize="small" />}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {activity.type.replace(/_/g, ' ')}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(activity.createdAt).toLocaleString()}
                                                        {activity.automated && ' • AI Automated'}
                                                    </Typography>
                                                    {activity.content && (
                                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                            {activity.content}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography color="text.secondary">No activities yet</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Right Column - Actions */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Quick Actions
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AiIcon />}
                                        fullWidth
                                        onClick={() => setActiveTab(2)}
                                    >
                                        AI Assistant
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ProposalIcon />}
                                        fullWidth
                                        onClick={() => navigate(`/proposals/new?leadId=${id}`)}
                                    >
                                        Create Proposal
                                    </Button>
                                    <Button variant="outlined" startIcon={<EmailIcon />} fullWidth>
                                        Send Email
                                    </Button>
                                    <Button variant="outlined" startIcon={<ScheduleIcon />} fullWidth>
                                        Schedule Meeting
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Lead Status
                                </Typography>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Stage
                                    </Typography>
                                    <Chip
                                        label={lead.stage.replace(/_/g, ' ')}
                                        variant="outlined"
                                        sx={{ mt: 0.5 }}
                                    />
                                </Box>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Source
                                    </Typography>
                                    <Typography>{lead.source}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Created
                                    </Typography>
                                    <Typography>
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                            <Typography variant="h6" fontWeight={600}>
                                Proposals
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<ProposalIcon />}
                                onClick={() => navigate(`/proposals/new?leadId=${id}`)}
                                sx={{
                                    background: `linear-gradient(135deg, ${brandColors.cyan} 0%, ${brandColors.teal} 100%)`,
                                }}
                            >
                                New Proposal
                            </Button>
                        </Box>

                        {lead.proposals && lead.proposals.length > 0 ? (
                            <Box>
                                {lead.proposals.map((proposal: any) => (
                                    <Box
                                        key={proposal.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: 2,
                                            mb: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {proposal.title}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                <Chip
                                                    label={proposal.status}
                                                    size="small"
                                                    color={
                                                        proposal.status === 'ACCEPTED' ? 'success' :
                                                            proposal.status === 'SENT' ? 'info' :
                                                                proposal.status === 'DRAFT' ? 'default' : 'warning'
                                                    }
                                                    variant="outlined"
                                                />
                                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                                    Created {new Date(proposal.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography fontWeight={600}>
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: proposal.currency || 'USD' }).format(proposal.totalAmount)}
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => navigate(`/proposals/${proposal.id}`)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                                            >
                                                Edit
                                            </Button>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                <ProposalIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                <Typography>No proposals created yet</Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 2 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <AiRecommendationPanel leadId={id!} />
                        <AiEmailGenerator leadId={id!} leadName={`${lead.firstName} ${lead.lastName}`} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <AiLeadScorer leadId={id!} currentScore={lead.score} />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
