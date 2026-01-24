import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    Container,
    IconButton,
    Grid,
    LinearProgress,
    TextField,
} from '@mui/material';
import {
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    Event as EventIcon,
    CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import axios from 'axios';
import {
    format,
    startOfWeek,
    addWeeks,
    subWeeks,
    isSameDay,
    parseISO,
    eachDayOfInterval,
    endOfWeek,
} from 'date-fns';
import { GlassCard } from '../components/common/GlassCard';

const API_BASE = (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_API_URL) || 'http://localhost:3001/api/v1';

interface TimeSlot {
    start: string; // ISO string
    end: string;
}

export function BookingPage() {
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get('leadId');

    const [currentDate, setCurrentDate] = useState(new Date()); // Controls week view
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (leadId) {
            fetchAvailability();
        }
    }, [leadId]);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            // Fetch more days to allow week navigation
            const response = await axios.get(`${API_BASE}/public/calendar/availability?days=30`);
            if (response.data.availableSlots) {
                setSlots(response.data.availableSlots);
            }
        } catch (err) {
            console.error('Failed to fetch availability:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSlotClick = (slot: TimeSlot) => {
        setSelectedSlot(slot);
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !leadId) return;

        setSubmitting(true);
        try {
            const response = await axios.post(`${API_BASE}/public/calendar/book`, {
                leadId,
                startTime: selectedSlot.start,
                notes,
            });

            if (response.data.success) {
                setBookingSuccess(true);
            }
        } catch (err) {
            console.error('Booking failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Calendar Grid Logic
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Business Hours: 9 AM to 5 PM
    const hours = Array.from({ length: 9 }, (_, i) => i + 9);

    const getSlotForDayAndHour = (day: Date, hour: number) => {
        // Find slots that match this day and hour
        return slots.filter(slot => {
            const slotDate = parseISO(slot.start);
            return isSameDay(slotDate, day) && slotDate.getHours() === hour;
        });
    };

    if (bookingSuccess) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 50%, #1e40af 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                }}
            >
                <GlassCard sx={{ p: 6, textAlign: 'center', maxWidth: 600 }}>
                    <SuccessIcon sx={{ fontSize: 80, color: '#4ade80', mb: 3 }} />
                    <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'white' }}>
                        You're Booked!
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, fontSize: '1.2rem' }}>
                        Your discovery call has been confirmed for<br />
                        <strong>{selectedSlot && format(parseISO(selectedSlot.start), 'EEEE, MMMM do')}</strong> at
                        <strong> {selectedSlot && format(parseISO(selectedSlot.start), 'h:mm a')}</strong>.
                    </Typography>
                    <Button
                        variant="outlined"
                        sx={{ color: 'white', borderColor: 'white' }}
                        onClick={() => window.location.href = 'https://tachyhealth.com'}
                    >
                        Back to Website
                    </Button>
                </GlassCard>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', overflowX: 'hidden', paddingBottom: '100px' }}>
            {/* Header Navigation */}
            <Paper elevation={0} sx={{
                p: 2,
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#1a365d' }}>
                        Schedule a Discussion
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                        (60 min)
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f1f5f9', borderRadius: 2, p: 0.5 }}>
                        <IconButton size="small" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                            <PrevIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mx: 2, minWidth: 140, textAlign: 'center' }}>
                            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                        </Typography>
                        <IconButton size="small" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                            <NextIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => setCurrentDate(new Date())}
                        startIcon={<EventIcon />}
                    >
                        Today
                    </Button>
                </Box>
            </Paper>

            {loading && <LinearProgress />}

            {/* Weekly Calendar Grid */}
            <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
                <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>

                    {/* Days Header */}
                    <Grid container sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                        <Grid item xs={1} sx={{ p: 2, borderRight: '1px solid #e2e8f0' }}></Grid> {/* Time Column Spacer */}
                        {weekDays.map(day => (
                            <Grid item xs key={day.toISOString()} sx={{
                                p: 1.5,
                                textAlign: 'center',
                                borderRight: '1px solid #e2e8f0',
                                bgcolor: isSameDay(day, new Date()) ? '#eff6ff' : 'transparent'
                            }}>
                                <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                    {format(day, 'EEE')}
                                </Typography>
                                <Typography variant="h6" sx={{
                                    fontWeight: 700,
                                    color: isSameDay(day, new Date()) ? '#2563eb' : '#1e293b',
                                    width: 32,
                                    height: 32,
                                    lineHeight: '32px',
                                    borderRadius: '50%',
                                    bgcolor: isSameDay(day, new Date()) ? '#bfdbfe' : 'transparent',
                                    mx: 'auto'
                                }}>
                                    {format(day, 'd')}
                                </Typography>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Time Slots Rows */}
                    <Box sx={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                        {hours.map(hour => (
                            <Grid container key={hour} sx={{ borderBottom: '1px solid #f1f5f9', minHeight: 70 }}>
                                {/* Time Label Column */}
                                <Grid item xs={1} sx={{
                                    p: 1.5,
                                    borderRight: '1px solid #f1f5f9',
                                    textAlign: 'right',
                                    color: '#64748b',
                                    fontSize: '0.8rem',
                                    transform: 'translateY(-50%)',
                                    mt: '35px'
                                }}>
                                    {format(new Date().setHours(hour), 'h a')}
                                </Grid>

                                {/* Day Cells for this Hour */}
                                {weekDays.map(day => {
                                    const availableSlots = getSlotForDayAndHour(day, hour);
                                    const isPast = day < new Date() && !isSameDay(day, new Date());
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                    return (
                                        <Grid item xs key={`${day}-${hour}`} sx={{
                                            borderRight: '1px solid #f1f5f9',
                                            p: 0.5,
                                            bgcolor: isWeekend || isPast ? '#f8fafc' : 'white',
                                            position: 'relative'
                                        }}>
                                            {availableSlots.map(slot => (
                                                <Button
                                                    key={slot.start}
                                                    fullWidth
                                                    variant={selectedSlot === slot ? "contained" : "outlined"}
                                                    size="small"
                                                    onClick={() => handleSlotClick(slot)}
                                                    sx={{
                                                        mb: 0.5,
                                                        justifyContent: 'flex-start',
                                                        bgcolor: selectedSlot === slot ? '#2563eb' : '#eff6ff',
                                                        color: selectedSlot === slot ? 'white' : '#1e40af',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        padding: '4px 8px',
                                                        boxShadow: 'none',
                                                        border: '1px solid',
                                                        borderColor: selectedSlot === slot ? '#2563eb' : '#bfdbfe',
                                                        textTransform: 'none',
                                                        borderRadius: 1,
                                                        '&:hover': {
                                                            bgcolor: '#2563eb',
                                                            color: 'white',
                                                        }
                                                    }}
                                                >
                                                    {format(parseISO(slot.start), 'h:mm a')}
                                                </Button>
                                            ))}
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        ))}
                    </Box>
                </Paper>
            </Container>

            {/* Bottom Confirmation Footer */}
            {selectedSlot && (
                <Paper
                    elevation={10}
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 3,
                        zIndex: 100,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                    }}
                >
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Selected Time
                        </Typography>
                        <Typography variant="h6" color="primary" fontWeight={600}>
                            {format(parseISO(selectedSlot.start), 'EEEE, MMMM do')} • {format(parseISO(selectedSlot.start), 'h:mm a')}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1, maxWidth: 400 }}>
                        <TextField
                            label="Additional Notes (Optional)"
                            placeholder="Any specific questions or context?"
                            variant="outlined"
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        />
                    </Box>

                    <Button
                        onClick={handleConfirmBooking}
                        variant="contained"
                        size="large"
                        disabled={submitting}
                        sx={{ px: 6, py: 1.5, fontSize: '1.1rem', borderRadius: 2, height: 'fit-content' }}
                    >
                        {submitting ? 'Confirming...' : 'Confirm Discussion'}
                    </Button>
                </Paper>
            )}
        </Box>
    );
}
