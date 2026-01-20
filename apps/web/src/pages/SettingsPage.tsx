import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Divider,
    Switch,
    FormControlLabel,
    Avatar,
    Grid,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    Person as PersonIcon,
    Notifications as NotificationsIcon,
    Security as SecurityIcon,
    Palette as PaletteIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { RootState } from '../store';
import { gradients } from '../theme';

export function SettingsPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    // Form states
    const [profile, setProfile] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: '',
    });

    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        pushNotifications: true,
        newLeadAlerts: true,
        meetingReminders: true,
        documentSigned: true,
    });

    const handleProfileSave = () => {
        setSnackbar({ open: true, message: 'Profile updated successfully!' });
    };

    const handleNotificationChange = (key: string) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Settings
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Manage your account settings and preferences
            </Typography>

            <Grid container spacing={3}>
                {/* Profile Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={3}>
                                <PersonIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Profile Information
                                </Typography>
                            </Box>

                            <Box display="flex" alignItems="center" gap={3} mb={3}>
                                <Avatar
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        background: gradients.accent,
                                        fontSize: '1.5rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">
                                        {profile.firstName} {profile.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {user?.role || 'Sales Representative'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="First Name"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        size="small"
                                        type="email"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Phone"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        size="small"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </Grid>
                            </Grid>

                            <Box mt={3}>
                                <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    onClick={handleProfileSave}
                                >
                                    Save Changes
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Notifications Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={3}>
                                <NotificationsIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Notification Preferences
                                </Typography>
                            </Box>

                            <Box display="flex" flexDirection="column" gap={1}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.emailNotifications}
                                            onChange={() => handleNotificationChange('emailNotifications')}
                                            color="primary"
                                        />
                                    }
                                    label="Email Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.pushNotifications}
                                            onChange={() => handleNotificationChange('pushNotifications')}
                                            color="primary"
                                        />
                                    }
                                    label="Push Notifications"
                                />

                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                                    Alert Types
                                </Typography>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.newLeadAlerts}
                                            onChange={() => handleNotificationChange('newLeadAlerts')}
                                            color="primary"
                                        />
                                    }
                                    label="New Lead Alerts"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.meetingReminders}
                                            onChange={() => handleNotificationChange('meetingReminders')}
                                            color="primary"
                                        />
                                    }
                                    label="Meeting Reminders"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.documentSigned}
                                            onChange={() => handleNotificationChange('documentSigned')}
                                            color="primary"
                                        />
                                    }
                                    label="Document Signed Alerts"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Security Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={3}>
                                <SecurityIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Security
                                </Typography>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Current Password"
                                        type="password"
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="New Password"
                                        type="password"
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Confirm New Password"
                                        type="password"
                                        size="small"
                                    />
                                </Grid>
                            </Grid>

                            <Box mt={3}>
                                <Button variant="outlined" color="primary">
                                    Change Password
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Theme Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={3}>
                                <PaletteIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Appearance
                                </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Customize the look and feel of your dashboard
                            </Typography>

                            <Box display="flex" gap={2}>
                                <Box
                                    sx={{
                                        width: 60,
                                        height: 40,
                                        borderRadius: 2,
                                        bgcolor: '#fff',
                                        border: '2px solid',
                                        borderColor: 'primary.main',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography variant="caption">Light</Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 60,
                                        height: 40,
                                        borderRadius: 2,
                                        bgcolor: '#1a1a1a',
                                        border: '2px solid transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.5,
                                    }}
                                >
                                    <Typography variant="caption" color="#fff">Dark</Typography>
                                </Box>
                            </Box>

                            <Alert severity="info" sx={{ mt: 3 }}>
                                Dark mode coming soon!
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ open: false, message: '' })}
                message={snackbar.message}
            />
        </Box>
    );
}
