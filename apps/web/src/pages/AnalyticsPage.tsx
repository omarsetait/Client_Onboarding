import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    // Paper, // Unused
    Grid,
    Card,
    CardContent,
    CardHeader,
    // Avatar, // Unused
    // Select, // Unused
    // MenuItem, // Unused
    // FormControl, // Unused
    // InputLabel, // Unused
    CircularProgress,
    Alert,
    LinearProgress,
    Divider,
    // List, // Unused
    // ListItem, // Unused
    // ListItemText, // Unused
    // ListItemAvatar, // Unused
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    People as PeopleIcon,
    AccessTime as AccessTimeIcon,
    Event as EventIcon,
    EmojiEvents as TrophyIcon,
    // Speed as SpeedIcon, // Unused
    PieChart as PieChartIcon,
    Leaderboard as LeaderboardIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { analyticsApi } from '../api/client';

interface FunnelStage {
    stage: string;
    count: number;
    conversionRate: number;
}

interface WeeklyTrend {
    week: string;
    count: number;
}

interface RepPerformance {
    id: string;
    name: string;
    leads: number;
    meetings: number;
    wins: number;
    conversionRate: number;
}

interface AnalyticsData {
    funnel: {
        funnel: FunnelStage[];
        totalLeads: number;
        wonLeads: number;
        lostLeads: number;
        overallConversion: number;
    };
    meetings: {
        total: number;
        completed: number;
        noShow: number;
        cancelled: number;
        scheduled: number;
        completionRate: number;
        noShowRate: number;
        weeklyTrend: WeeklyTrend[];
    };
    performance: {
        performance: RepPerformance[];
    };
    timeline: {
        avgFirstContactHours: number;
        avgTimeToMeetingDays: number;
        avgDealCycleDays: number;
    };
}

const stageLabels: Record<string, string> = {
    NEW: 'New',
    QUALIFYING: 'Qualifying',
    HOT_ENGAGED: 'Hot/Engaged',
    WARM_NURTURING: 'Nurturing',
    MEETING_SCHEDULED: 'Meeting',
    DISCOVERY_COMPLETE: 'Discovery',
    PROPOSAL_SENT: 'Proposal',
    NEGOTIATION: 'Negotiation',
    CONTRACT_STAGE: 'Contract',
    CLOSED_WON: 'Won',
    CLOSED_LOST: 'Lost',
};

// Animation variants
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await analyticsApi.getSummary();
            setData(response.data);
        } catch (err: any) {
            console.error('Failed to fetch analytics:', err);
            setError('Unable to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error || 'No data available'}</Alert>
            </Box>
        );
    }

    const maxFunnelCount = Math.max(...data.funnel.funnel.map(s => s.count), 1);

    return (
        <Box
            component={motion.div}
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        📊 Analytics Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Real-time sales performance and lead metrics
                    </Typography>
                </Box>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }} component={motion.div} variants={container}>
                <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                    <Card
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            transition: 'transform 0.3s',
                            '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700}>
                                        <CountUp end={data.funnel.totalLeads} duration={2} />
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Leads</Typography>
                                </Box>
                                <PeopleIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                    <Card
                        sx={{
                            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                            color: 'white',
                            transition: 'transform 0.3s',
                            '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700}>
                                        <CountUp end={data.funnel.wonLeads} duration={2} />
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Won Deals</Typography>
                                </Box>
                                <TrophyIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                    <Card
                        sx={{
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            transition: 'transform 0.3s',
                            '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700}>
                                        <CountUp end={data.funnel.overallConversion} duration={2.5} decimals={1} />%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Conversion Rate</Typography>
                                </Box>
                                <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                    <Card
                        sx={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white',
                            transition: 'transform 0.3s',
                            '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700}>
                                        <CountUp end={data.meetings.total} duration={2} />
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Meetings</Typography>
                                </Box>
                                <EventIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3} component={motion.div} variants={container}>
                {/* Conversion Funnel */}
                <Grid item xs={12} lg={8} component={motion.div} variants={item}>
                    <Card>
                        <CardHeader
                            avatar={<PieChartIcon />}
                            title="Conversion Funnel"
                            subheader="Leads by pipeline stage with conversion rates"
                        />
                        <Divider />
                        <CardContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {data.funnel.funnel.map((stage, index) => (
                                    <Box key={stage.stage} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="body2" sx={{ width: 100, fontWeight: 500 }}>
                                            {stageLabels[stage.stage] || stage.stage}
                                        </Typography>
                                        <Box sx={{ flex: 1 }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(stage.count / maxFunnelCount) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                                                style={{ height: '100%' }}
                                            >
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={100} // Set to 100 because width is controlled by motion.div
                                                    sx={{
                                                        height: 24,
                                                        borderRadius: 2,
                                                        backgroundColor: 'transparent',
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: `hsl(${240 - (index * 25)}, 70%, 60%)`,
                                                            borderRadius: 2,
                                                        }
                                                    }}
                                                />
                                            </motion.div>
                                        </Box>
                                        <Typography variant="body2" sx={{ width: 50, textAlign: 'right', fontWeight: 600 }}>
                                            <CountUp end={stage.count} duration={1} />
                                        </Typography>
                                        {index > 0 && (
                                            <Chip
                                                label={`${stage.conversionRate}%`}
                                                size="small"
                                                color={stage.conversionRate >= 50 ? 'success' : stage.conversionRate >= 25 ? 'warning' : 'error'}
                                                sx={{ width: 60 }}
                                            />
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Meeting Stats */}
                <Grid item xs={12} lg={4} component={motion.div} variants={item}>
                    <Card sx={{ height: '100%' }}>
                        <CardHeader
                            avatar={<EventIcon />}
                            title="Meeting Outcomes"
                            subheader="Status breakdown"
                        />
                        <Divider />
                        <CardContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography>Completed</Typography>
                                    <Chip label={`${data.meetings.completed} (${data.meetings.completionRate}%)`} color="success" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography>No-Show</Typography>
                                    <Chip label={`${data.meetings.noShow} (${data.meetings.noShowRate}%)`} color="error" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography>Cancelled</Typography>
                                    <Chip label={`${data.meetings.cancelled}`} color="warning" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography>Scheduled</Typography>
                                    <Chip label={`${data.meetings.scheduled}`} color="info" />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Response Time Metrics */}
                <Grid item xs={12} md={6} component={motion.div} variants={item}>
                    <Card>
                        <CardHeader
                            avatar={<AccessTimeIcon />}
                            title="Response Time Metrics"
                            subheader="Average time across sales process"
                        />
                        <Divider />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                                        <Typography variant="h4" color="primary" fontWeight={700}>
                                            <CountUp end={data.timeline.avgFirstContactHours} decimals={1} duration={2} />h
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            First Contact
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.50', borderRadius: 2 }}>
                                        <Typography variant="h4" color="secondary" fontWeight={700}>
                                            <CountUp end={data.timeline.avgTimeToMeetingDays} decimals={1} duration={2} />d
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            To Meeting
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                                        <Typography variant="h4" color="success.main" fontWeight={700}>
                                            <CountUp end={data.timeline.avgDealCycleDays} decimals={1} duration={2} />d
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Deal Cycle
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Team Leaderboard */}
                <Grid item xs={12} md={6} component={motion.div} variants={item}>
                    <Card>
                        <CardHeader
                            avatar={<LeaderboardIcon color="warning" />}
                            title="Team Leaderboard"
                            subheader="Sales rep performance"
                        />
                        <Divider />
                        <CardContent sx={{ p: 0 }}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Rep</TableCell>
                                            <TableCell align="right">Leads</TableCell>
                                            <TableCell align="right">Meetings</TableCell>
                                            <TableCell align="right">Wins</TableCell>
                                            <TableCell align="right">Conv %</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.performance.performance.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    <Typography color="text.secondary" sx={{ py: 2 }}>No sales reps found</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.performance.performance.map((rep, index) => (
                                                <TableRow key={rep.id} sx={{ bgcolor: index === 0 ? 'rgba(255, 193, 7, 0.08)' : 'inherit' }}>
                                                    <TableCell>
                                                        {index === 0 && '🥇 '}
                                                        {index === 1 && '🥈 '}
                                                        {index === 2 && '🥉 '}
                                                        {rep.name}
                                                    </TableCell>
                                                    <TableCell align="right">{rep.leads}</TableCell>
                                                    <TableCell align="right">{rep.meetings}</TableCell>
                                                    <TableCell align="right">{rep.wins}</TableCell>
                                                    <TableCell align="right">
                                                        <Chip
                                                            label={`${rep.conversionRate}%`}
                                                            size="small"
                                                            color={rep.conversionRate >= 30 ? 'success' : rep.conversionRate >= 15 ? 'warning' : 'default'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Weekly Trend */}
                <Grid item xs={12} component={motion.div} variants={item}>
                    <Card>
                        <CardHeader
                            avatar={<LeaderboardIcon />}
                            title="Weekly Meeting Trend"
                            subheader="Meetings over the past 8 weeks"
                        />
                        <Divider />
                        <CardContent>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 150 }}>
                                {data.meetings.weeklyTrend.map((week, index) => {
                                    const maxCount = Math.max(...data.meetings.weeklyTrend.map(w => w.count), 1);
                                    const height = (week.count / maxCount) * 100;
                                    return (
                                        <Box key={index} sx={{ flex: 1, textAlign: 'center' }}>
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${Math.max(height, 5)}%` }}
                                                transition={{ duration: 1, delay: index * 0.1 }}
                                                style={{
                                                    borderRadius: '4px 4px 0 0',
                                                    marginBottom: '8px',
                                                    minHeight: '8px',
                                                    width: '100%'
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        bgcolor: index === data.meetings.weeklyTrend.length - 1 ? 'primary.main' : 'primary.light',
                                                        borderRadius: '4px 4px 0 0',
                                                    }}
                                                />
                                            </motion.div>
                                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>{week.count}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                {week.week}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

