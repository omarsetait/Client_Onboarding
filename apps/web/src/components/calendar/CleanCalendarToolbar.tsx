import {
    Box,
    Typography,
    ButtonGroup,
    Button,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

export type CalendarView = 'month' | 'week' | 'day';

interface CleanCalendarToolbarProps {
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
    label: string;
}

export const CleanCalendarToolbar = ({
    view,
    onViewChange,
    onNavigate,
    label,
}: CleanCalendarToolbarProps) => {
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            p: 1
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ButtonGroup variant="outlined" size="small">
                    <Button onClick={() => onNavigate('PREV')}><ChevronLeftIcon /></Button>
                    <Button onClick={() => onNavigate('TODAY')}>Today</Button>
                    <Button onClick={() => onNavigate('NEXT')}><ChevronRightIcon /></Button>
                </ButtonGroup>
                <Typography variant="h5" fontWeight={600}>
                    {label}
                </Typography>
            </Box>

            <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_, newView) => newView && onViewChange(newView)}
                size="small"
                color="primary"
            >
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="day">Day</ToggleButton>
            </ToggleButtonGroup>
        </Box>
    );
};
