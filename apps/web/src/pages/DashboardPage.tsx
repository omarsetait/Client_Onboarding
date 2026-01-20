import { Box, Grid, Typography, Skeleton } from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Description as DocumentIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../api/client';
import { GlassCard } from '../components/common/GlassCard';
import { gradients, brandColors } from '../theme';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
    loading?: boolean;
}

function MetricCard({ title, value, change, icon, color, loading }: MetricCardProps) {
    const isPositive = change && change > 0;

    return (
        <GlassCard>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    {loading ? (
                        <Skeleton width={80} height={40} />
                    ) : (
                        <Typography variant="h4" fontWeight={700} sx={{ color }}>
                            {value}
                        </Typography>
                    )}
                    {change !== undefined && !loading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            {isPositive ? (
                                <TrendingUpIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                            ) : (
                                <TrendingDownIcon color="error" sx={{ fontSize: 16, mr: 0.5 }} />
                            )}
                            <Typography
                                variant="body2"
                                color={isPositive ? 'success.main' : 'error.main'}
                            >
                                {isPositive ? '+' : ''}{change}% vs last week
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box
                    sx={{
                        background: gradients.accent,
                        borderRadius: 2,
                        p: 1.5,
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                >
                    {icon}
                </Box>
            </Box>
        </GlassCard>
    );
}

export function DashboardPage() {
    const { data: leadsData, isLoading } = useQuery({
        queryKey: ['leads', 'dashboard'],
        queryFn: () => leadsApi.getAll({ limit: 10 }),
    });

    const totalLeads = leadsData?.data?.meta?.total || 0;
    const recentLeads = leadsData?.data?.data || [];

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700}>
                    Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Welcome to TachyHealth Onboarding System
                </Typography>
            </Box>

            {/* Tip for Command K */}
            <GlassCard sx={{ mb: 3, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                    }}
                >
                    ⌘K
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Press <strong>Cmd+K</strong> (or Ctrl+K) to quickly search leads, navigate pages, or perform actions.
                </Typography>
            </GlassCard>

            {/* Metrics Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Total Leads"
                        value={totalLeads}
                        change={12}
                        icon={<PeopleIcon />}
                        color={brandColors.cyan}
                        loading={isLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Meetings Scheduled"
                        value={8}
                        change={25}
                        icon={<CalendarIcon />}
                        color={brandColors.teal}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Proposals Sent"
                        value={5}
                        change={-3}
                        icon={<DocumentIcon />}
                        color={brandColors.purple}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Deals Won"
                        value={3}
                        change={50}
                        icon={<CheckIcon />}
                        color={brandColors.magenta}
                    />
                </Grid>
            </Grid>

            {/* Recent Leads */}
            <GlassCard>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Recent Leads
                </Typography>
                {isLoading ? (
                    <Box>
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                        ))}
                    </Box>
                ) : recentLeads.length > 0 ? (
                    <Box>
                        {recentLeads.slice(0, 5).map((lead: any) => (
                            <Box
                                key={lead.id}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 2,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:last-child': { borderBottom: 0 },
                                }}
                            >
                                <Box>
                                    <Typography fontWeight={500}>
                                        {lead.firstName} {lead.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {lead.companyName} • {lead.email}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: 20,
                                        bgcolor: lead.score >= 80 ? 'error.light' : lead.score >= 50 ? 'warning.light' : 'grey.200',
                                        color: lead.score >= 80 ? 'error.dark' : lead.score >= 50 ? 'warning.dark' : 'grey.700',
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={600}>
                                        {lead.score}%
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography color="text.secondary">No leads yet</Typography>
                )}
            </GlassCard>
        </Box>
    );
}
