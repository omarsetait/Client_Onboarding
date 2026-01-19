import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    LinearProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Chip,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    Email as EmailIcon,
    CalendarMonth as CalendarIcon,
    Leaderboard as LeaderboardIcon,
    Speed as SpeedIcon,
    PieChart as PieChartIcon,
    ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import { api } from '../api/client';

interface AnalyticsData {
    totalLeads: number;
    leadsThisMonth: number;
    leadGrowth: number;
    conversionRate: number;
    avgDealSize: number;
    totalPipelineValue: number;
    emailsSent: number;
    emailOpenRate: number;
    meetingsScheduled: number;
    meetingShowRate: number;
    leadsByStage: { stage: string; count: number }[];
    leadsBySource: { source: string; count: number }[];
    topPerformers: { name: string; leads: number; conversions: number }[];
}

export function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('30d');
    const [data, setData] = useState<AnalyticsData>({
        totalLeads: 0,
        leadsThisMonth: 0,
        leadGrowth: 0,
        conversionRate: 0,
        avgDealSize: 0,
        totalPipelineValue: 0,
        emailsSent: 0,
        emailOpenRate: 0,
        meetingsScheduled: 0,
        meetingShowRate: 0,
        leadsByStage: [],
        leadsBySource: [],
        topPerformers: [],
    });

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            // This would call a real analytics endpoint
            const response = await api.get('/analytics', { params: { range: timeRange } });
            setData(response.data);
        } catch (err: any) {
            console.error('Failed to fetch analytics:', err);
            setError('Unable to load analytics data');
            // Set mock data for demo
            setData({
                totalLeads: 247,
                leadsThisMonth: 42,
                leadGrowth: 15.3,
                conversionRate: 23.5,
                avgDealSize: 45000,
                totalPipelineValue: 2340000,
                emailsSent: 1256,
                emailOpenRate: 42.3,
                meetingsScheduled: 89,
                meetingShowRate: 85.2,
                leadsByStage: [
                    { stage: 'New', count: 45 },
                    { stage: 'Qualifying', count: 67 },
                    { stage: 'Nurturing', count: 52 },
                    { stage: 'Engaged', count: 38 },
                    { stage: 'Demo', count: 25 },
                    { stage: 'Proposal', count: 15 },
                    { stage: 'Closed', count: 5 },
                ],
                leadsBySource: [
                    { source: 'Website', count: 89 },
                    { source: 'LinkedIn', count: 56 },
                    { source: 'Referral', count: 42 },
                    { source: 'Events', count: 35 },
                    { source: 'Other', count: 25 },
                ],
                topPerformers: [
                    { name: 'Sarah Sales', leads: 42, conversions: 12 },
                    { name: 'Mike Manager', leads: 38, conversions: 9 },
                    { name: 'Alex Associate', leads: 31, conversions: 7 },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

    const getTrendIcon = (value: number) => {
        if (value > 0) return <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />;
        if (value < 0) return <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />;
        return null;
    };

    const getTrendColor = (value: number) => {
        if (value > 0) return 'success.main';
        if (value < 0) return 'error.main';
        return 'text.secondary';
    };

    const maxStageCount = Math.max(...data.leadsByStage.map(s => s.count), 1);
    const maxSourceCount = Math.max(...data.leadsBySource.map(s => s.count), 1);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track your sales performance and lead metrics
                    </Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Time Range</InputLabel>
                    <Select
                        value={timeRange}
                        label="Time Range"
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                        <MenuItem value="90d">Last 90 Days</MenuItem>
                        <MenuItem value="1y">Last Year</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Error (shows mock data notice) */}
            {error && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Showing demo analytics data. Connect your backend to see real metrics.
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Key Metrics */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Leads
                                            </Typography>
                                            <Typography variant="h4" fontWeight={600}>
                                                {data.totalLeads}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                                {getTrendIcon(data.leadGrowth)}
                                                <Typography variant="caption" color={getTrendColor(data.leadGrowth)}>
                                                    {formatPercent(Math.abs(data.leadGrowth))} vs last period
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                                            <PeopleIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Conversion Rate
                                            </Typography>
                                            <Typography variant="h4" fontWeight={600}>
                                                {formatPercent(data.conversionRate)}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                                <Typography variant="caption" color="success.main">
                                                    +2.3% vs last period
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Avatar sx={{ bgcolor: 'success.light' }}>
                                            <SpeedIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Avg Deal Size
                                            </Typography>
                                            <Typography variant="h4" fontWeight={600}>
                                                {formatCurrency(data.avgDealSize)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Based on closed deals
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: 'warning.light' }}>
                                            <MoneyIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Pipeline Value
                                            </Typography>
                                            <Typography variant="h4" fontWeight={600}>
                                                {formatCurrency(data.totalPipelineValue)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Active opportunities
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: 'info.light' }}>
                                            <ShowChartIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Activity Metrics */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <EmailIcon color="primary" />
                                    <Box>
                                        <Typography variant="h6">{data.emailsSent}</Typography>
                                        <Typography variant="caption" color="text.secondary">Emails Sent</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <EmailIcon color="success" />
                                    <Box>
                                        <Typography variant="h6">{formatPercent(data.emailOpenRate)}</Typography>
                                        <Typography variant="caption" color="text.secondary">Open Rate</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <CalendarIcon color="primary" />
                                    <Box>
                                        <Typography variant="h6">{data.meetingsScheduled}</Typography>
                                        <Typography variant="caption" color="text.secondary">Meetings</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <CalendarIcon color="success" />
                                    <Box>
                                        <Typography variant="h6">{formatPercent(data.meetingShowRate)}</Typography>
                                        <Typography variant="caption" color="text.secondary">Show Rate</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Charts Row */}
                    <Grid container spacing={3}>
                        {/* Lead Funnel */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardHeader
                                    avatar={<PieChartIcon />}
                                    title="Lead Funnel"
                                    subheader="Leads by pipeline stage"
                                />
                                <Divider />
                                <CardContent>
                                    {data.leadsByStage.map((stage, index) => (
                                        <Box key={stage.stage} sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">{stage.stage}</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {stage.count}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(stage.count / maxStageCount) * 100}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        bgcolor: `hsl(${220 - index * 25}, 70%, 50%)`,
                                                    },
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Lead Sources */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardHeader
                                    avatar={<LeaderboardIcon />}
                                    title="Lead Sources"
                                    subheader="Where your leads come from"
                                />
                                <Divider />
                                <CardContent>
                                    {data.leadsBySource.map((source, index) => (
                                        <Box key={source.source} sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">{source.source}</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {source.count} ({((source.count / data.totalLeads) * 100).toFixed(0)}%)
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(source.count / maxSourceCount) * 100}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        bgcolor: [
                                                            'primary.main',
                                                            'secondary.main',
                                                            'success.main',
                                                            'warning.main',
                                                            'info.main',
                                                        ][index % 5],
                                                    },
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Top Performers */}
                        <Grid item xs={12}>
                            <Card>
                                <CardHeader
                                    avatar={<LeaderboardIcon color="primary" />}
                                    title="Top Performers"
                                    subheader="Sales rep leaderboard this month"
                                />
                                <Divider />
                                <CardContent>
                                    <List disablePadding>
                                        {data.topPerformers.map((performer, index) => (
                                            <ListItem key={performer.name} divider={index < data.topPerformers.length - 1}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{
                                                        bgcolor: index === 0 ? 'warning.main' : index === 1 ? 'grey.400' : 'warning.light',
                                                        color: index < 2 ? 'white' : 'text.primary',
                                                    }}>
                                                        {index + 1}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={performer.name}
                                                    secondary={`${performer.leads} leads assigned`}
                                                />
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Chip
                                                        label={`${performer.conversions} closed`}
                                                        color="success"
                                                        size="small"
                                                    />
                                                    <Chip
                                                        label={`${((performer.conversions / performer.leads) * 100).toFixed(0)}% rate`}
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}
        </Box>
    );
}
