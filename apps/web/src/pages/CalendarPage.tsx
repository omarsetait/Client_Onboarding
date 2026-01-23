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
    Chip,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Button,
    IconButton,
    Divider,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Link,
} from '@mui/material';
import {
    CalendarMonth as CalendarIcon,
    VideoCall as VideoCallIcon,
    AccessTime as TimeIcon,
    Person as PersonIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    Business as CompanyIcon,
    Work as WorkIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    TrendingUp as StageIcon,
} from '@mui/icons-material';
import { calendarApi } from '../api/client';

interface Meeting {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    meetingType: string;
    status: string;
    videoLink?: string;
    description?: string;
    lead?: {
        id: string;
        firstName: string;
        lastName: string;
        companyName: string;
        email?: string;
        phone?: string;
        jobTitle?: string;
        stage?: string;
    };
}

export function CalendarPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    useEffect(() => {
        fetchMeetings();
    }, [currentDate]);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            setError(null);
            const startOfWeek = getStartOfWeek(currentDate);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 7);

            const response = await calendarApi.getMeetings(
                startOfWeek.toISOString(),
                endOfWeek.toISOString()
            );
            setMeetings(response.data.meetings || []);
        } catch (err: any) {
            console.error('Failed to fetch meetings:', err);
            setError(err.response?.data?.message || 'Failed to load meetings');
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SCHEDULED': return 'primary';
            case 'COMPLETED': return 'success';
            case 'CANCELLED': return 'error';
            case 'NO_SHOW': return 'warning';
            default: return 'default';
        }
    };

    const getMeetingTypeLabel = (type: string) => {
        switch (type) {
            case 'DISCOVERY': return '🔍 Discovery';
            case 'DEMO': return '🎬 Demo';
            case 'TECHNICAL': return '⚙️ Technical';
            case 'CLOSING': return '✍️ Closing';
            case 'FOLLOW_UP': return '📞 Follow-up';
            default: return type;
        }
    };

    const prevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const weekStart = getStartOfWeek(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Group meetings by date
    const meetingsByDate = meetings.reduce((acc, meeting) => {
        const date = new Date(meeting.startTime).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(meeting);
        return acc;
    }, {} as Record<string, Meeting[]>);

    // Generate days of the week
    const daysOfWeek = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        daysOfWeek.push(day);
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        Calendar
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your meetings and scheduled calls
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {/* TODO: Open create meeting dialog */ }}
                >
                    Schedule Meeting
                </Button>
            </Box>

            {/* Week Navigation */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton onClick={prevWeek}>
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="h6">
                            {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            {' — '}
                            {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        <IconButton onClick={nextWeek}>
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>
                    <Button variant="outlined" onClick={goToToday}>
                        Today
                    </Button>
                </Box>
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    {error} - Showing empty calendar. Create some meetings to see them here.
                </Alert>
            )}

            {/* Loading */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                /* Calendar Grid */
                <Grid container spacing={2}>
                    {daysOfWeek.map((day) => {
                        const dateKey = day.toDateString();
                        const dayMeetings = meetingsByDate[dateKey] || [];
                        const isToday = day.toDateString() === new Date().toDateString();

                        return (
                            <Grid item xs={12} md={6} lg={12 / 7 * 2} key={dateKey}>
                                <Card
                                    sx={{
                                        minHeight: 250,
                                        borderTop: isToday ? '3px solid' : 'none',
                                        borderTopColor: 'primary.main',
                                    }}
                                >
                                    <CardHeader
                                        title={
                                            <Typography variant="subtitle1" fontWeight={isToday ? 700 : 500}>
                                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </Typography>
                                        }
                                        subheader={
                                            <Typography
                                                variant="h5"
                                                color={isToday ? 'primary.main' : 'text.primary'}
                                                fontWeight={isToday ? 700 : 400}
                                            >
                                                {day.getDate()}
                                            </Typography>
                                        }
                                        sx={{ pb: 1 }}
                                    />
                                    <Divider />
                                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                        {dayMeetings.length === 0 ? (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ textAlign: 'center', py: 3 }}
                                            >
                                                No meetings
                                            </Typography>
                                        ) : (
                                            <List dense disablePadding>
                                                {dayMeetings.map((meeting) => (
                                                    <ListItem
                                                        key={meeting.id}
                                                        sx={{
                                                            bgcolor: 'action.hover',
                                                            borderRadius: 1,
                                                            mb: 0.5,
                                                            cursor: 'pointer',
                                                            '&:hover': { bgcolor: 'action.selected' },
                                                        }}
                                                        onClick={() => setSelectedMeeting(meeting)}
                                                    >
                                                        <ListItemAvatar sx={{ minWidth: 40 }}>
                                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                                                <VideoCallIcon sx={{ fontSize: 16 }} />
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Typography variant="body2" fontWeight={500} noWrap>
                                                                    {meeting.title}
                                                                </Typography>
                                                            }
                                                            secondary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <TimeIcon sx={{ fontSize: 12 }} />
                                                                    <Typography variant="caption">
                                                                        {formatTime(meeting.startTime)}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Upcoming Meetings Sidebar */}
            <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    📅 Upcoming Meetings
                </Typography>
                {meetings.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CalendarIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary">
                            No upcoming meetings scheduled
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Schedule meetings with leads from their detail page
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        {meetings
                            .filter(m => new Date(m.startTime) >= new Date())
                            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                            .slice(0, 5)
                            .map((meeting) => (
                                <ListItem
                                    key={meeting.id}
                                    divider
                                    component="div"
                                    onClick={() => setSelectedMeeting(meeting)}
                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                                            <VideoCallIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={meeting.title}
                                        secondary={
                                            <>
                                                {formatDate(meeting.startTime)} at {formatTime(meeting.startTime)}
                                                {meeting.lead && (
                                                    <> • {meeting.lead.firstName} {meeting.lead.lastName}</>
                                                )}
                                            </>
                                        }
                                    />
                                    <Chip
                                        label={getMeetingTypeLabel(meeting.meetingType)}
                                        size="small"
                                        sx={{ mr: 1 }}
                                    />
                                    <Chip
                                        label={meeting.status}
                                        size="small"
                                        color={getStatusColor(meeting.status) as any}
                                    />
                                </ListItem>
                            ))}
                    </List>
                )}
            </Paper>

            {/* Meeting Details Dialog */}
            <Dialog
                open={!!selectedMeeting}
                onClose={() => setSelectedMeeting(null)}
                maxWidth="sm"
                fullWidth
            >
                {selectedMeeting && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    label={getMeetingTypeLabel(selectedMeeting.meetingType)}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                                <Typography variant="h6" sx={{ flex: 1 }}>
                                    {selectedMeeting.title}
                                </Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={3}>
                                {/* Time & Status */}
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Chip
                                        label={selectedMeeting.status}
                                        color={getStatusColor(selectedMeeting.status) as any}
                                        size="small"
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                        <TimeIcon fontSize="small" />
                                        <Typography variant="body2">
                                            {formatDate(selectedMeeting.startTime)}, {formatTime(selectedMeeting.startTime)} - {formatTime(selectedMeeting.endTime)}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Video Link */}
                                {selectedMeeting.videoLink && (
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" gutterBottom>Video Meeting Link</Typography>
                                        <Link
                                            href={selectedMeeting.videoLink}
                                            target="_blank"
                                            rel="noopener"
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                        >
                                            <VideoCallIcon fontSize="small" />
                                            Join Meeting
                                        </Link>
                                    </Box>
                                )}

                                {/* Client Details */}
                                {selectedMeeting.lead && (
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
                                            Client Details
                                        </Typography>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Stack spacing={2}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                        {selectedMeeting.lead.firstName[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight={600}>
                                                            {selectedMeeting.lead.firstName} {selectedMeeting.lead.lastName}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                                            <WorkIcon sx={{ fontSize: 14 }} />
                                                            <Typography variant="caption">
                                                                {selectedMeeting.lead.jobTitle || 'No Title'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                <Divider />

                                                <Stack spacing={1}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <CompanyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                        <Typography variant="body2">{selectedMeeting.lead.companyName}</Typography>
                                                    </Box>
                                                    {selectedMeeting.lead.email && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                            <Typography variant="body2">{selectedMeeting.lead.email}</Typography>
                                                        </Box>
                                                    )}
                                                    {selectedMeeting.lead.phone && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                            <Typography variant="body2">{selectedMeeting.lead.phone}</Typography>
                                                        </Box>
                                                    )}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <StageIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                        <Typography variant="body2" fontWeight={500} color="primary">
                                                            Stage: {selectedMeeting.lead.stage || 'Unknown'}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelectedMeeting(null)}>Close</Button>
                            {selectedMeeting.videoLink && (
                                <Button
                                    variant="contained"
                                    href={selectedMeeting.videoLink}
                                    target="_blank"
                                    startIcon={<VideoCallIcon />}
                                >
                                    Join Now
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
