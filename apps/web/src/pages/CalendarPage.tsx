import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    CircularProgress,
    Alert,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Divider,
    List,
    ListItem,
    ListItemText,
    Chip,
} from '@mui/material';
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameDay,
    addMonths,
    addWeeks,
    addDays,
    subMonths,
    subWeeks,
    subDays,
    isToday,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

import { calendarApi } from '../api/client';
import { CleanCalendarToolbar, CalendarView } from '../components/calendar/CleanCalendarToolbar';

export function CalendarPage() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<CalendarView>('week');
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        fetchMeetings();
    }, [date, view]);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const { start, end } = getViewRange(date, view);
            console.log(`Fetching from ${start.toISOString()} to ${end.toISOString()}`);

            const response = await calendarApi.getMeetings(start.toISOString(), end.toISOString());
            setMeetings(response.data.meetings || []);
        } catch (err: any) {
            console.error('Failed to fetch meetings', err);
            setError('Failed to load meetings');
        } finally {
            setLoading(false);
        }
    };

    const getViewRange = (currentDate: Date, currentView: CalendarView) => {
        let start = new Date();
        let end = new Date();

        if (currentView === 'month') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            start = startOfWeek(monthStart, { weekStartsOn: 0 });
            end = endOfWeek(monthEnd, { weekStartsOn: 0 });
        } else if (currentView === 'week') {
            start = startOfWeek(currentDate, { weekStartsOn: 0 });
            end = endOfWeek(currentDate, { weekStartsOn: 0 });
        } else {
            start = new Date(currentDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(currentDate);
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    };

    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'TODAY') {
            setDate(new Date());
            return;
        }

        const direction = action === 'NEXT' ? 1 : -1;

        switch (view) {
            case 'month':
                setDate(d => action === 'NEXT' ? addMonths(d, 1) : subMonths(d, 1));
                break;
            case 'week':
                setDate(d => action === 'NEXT' ? addWeeks(d, 1) : subWeeks(d, 1));
                break;
            case 'day':
                setDate(d => action === 'NEXT' ? addDays(d, 1) : subDays(d, 1));
                break;
        }
    };

    const generateGridDays = () => {
        const { start, end } = getViewRange(date, view);
        return eachDayOfInterval({ start, end });
    };

    const days = generateGridDays();

    // Responsive Grid Props
    const getGridProps = () => {
        switch (view) {
            case 'month': return { xs: 12, sm: 6, md: 4, lg: 2 }; // 6 cols on lg
            case 'week': return { xs: 12, sm: 6, md: 4, lg: 1.7 }; // ~7 cols
            case 'day': return { xs: 12 };
            default: return { xs: 12 };
        }
    };

    const getMeetingColor = (type: string) => {
        switch (type) {
            case 'DISCOVERY': return 'primary';
            case 'DEMO': return 'secondary';
            case 'NEGOTIATION': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', p: 2, overflow: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={600}>
                    Calendar
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your schedule
                </Typography>
            </Box>

            <CleanCalendarToolbar
                view={view}
                onViewChange={setView}
                onNavigate={handleNavigate}
                label={format(date, view === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {days.map((dayItem) => {
                        const dayMeetings = meetings.filter(m => isSameDay(new Date(m.startTime), dayItem));
                        const isCurrentDay = isToday(dayItem);
                        const isSelectedMonth = dayItem.getMonth() === date.getMonth();

                        // Opacity for days outside of current month (in month view)
                        const opacity = view === 'month' && !isSelectedMonth ? 0.5 : 1;

                        return (
                            <Grid item key={dayItem.toISOString()} {...getGridProps()}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        height: '100%',
                                        minHeight: view === 'month' ? 150 : 250,
                                        borderColor: isCurrentDay ? 'primary.main' : 'divider',
                                        borderWidth: isCurrentDay ? 2 : 1,
                                        opacity,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <CardHeader
                                        title={format(dayItem, 'EEEE')}
                                        subheader={format(dayItem, 'd MMM')}
                                        titleTypographyProps={{ variant: 'caption', fontWeight: 600, textTransform: 'uppercase' }}
                                        subheaderTypographyProps={{ variant: 'h6', fontWeight: 700, color: isCurrentDay ? 'primary.main' : 'text.primary' }}
                                        sx={{ p: 1.5, pb: 0 }}
                                    />
                                    <CardContent sx={{ p: 1, flexGrow: 1 }}>
                                        {dayMeetings.length > 0 ? (
                                            <List dense disablePadding>
                                                {dayMeetings.map(meeting => (
                                                    <ListItem
                                                        key={meeting.id}
                                                        sx={{
                                                            bgcolor: 'action.hover',
                                                            borderRadius: 1,
                                                            mb: 0.5,
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-start'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Typography variant="caption" fontWeight={600}>
                                                                {format(new Date(meeting.startTime), 'h:mm a')}
                                                            </Typography>
                                                            <Chip
                                                                label={meeting.meetingType}
                                                                size="small"
                                                                color={getMeetingColor(meeting.meetingType) as any}
                                                                sx={{ height: 16, fontSize: '0.65rem' }}
                                                            />
                                                        </Box>
                                                        <Typography variant="body2" noWrap sx={{ width: '100%', fontWeight: 500 }}>
                                                            {meeting.title}
                                                        </Typography>
                                                        {meeting.lead && (
                                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ width: '100%' }}>
                                                                with {meeting.lead.firstName}
                                                            </Typography>
                                                        )}
                                                    </ListItem>
                                                ))}
                                            </List>
                                        ) : (
                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                                <Typography variant="caption">No events</Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
}
