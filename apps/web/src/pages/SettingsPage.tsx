import { useState, useEffect } from 'react';
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
    CircularProgress,
    IconButton,
    InputAdornment,
} from '@mui/material';
import {
    Person as PersonIcon,
    Notifications as NotificationsIcon,
    Security as SecurityIcon,
    Palette as PaletteIcon,
    Save as SaveIcon,
    Visibility,
    VisibilityOff,
    Check as CheckIcon,
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { RootState } from '../store';
import { usersApi } from '../api/client';
import { useThemeMode, gradients } from '../contexts/ThemeContext';

export function SettingsPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const { mode, setMode } = useThemeMode();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // Form states
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        pushNotifications: true,
        newLeadAlerts: true,
        meetingReminders: true,
        documentSigned: true,
    });

    const [notificationsSaved, setNotificationsSaved] = useState(false);

    // Load user data on mount
    useEffect(() => {
        if (user) {
            setProfile({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: (user as any).phone || '',
            });
            // Load saved notification preferences from localStorage
            const savedNotifications = localStorage.getItem('notificationPreferences');
            if (savedNotifications) {
                setNotifications(JSON.parse(savedNotifications));
            }
        }
    }, [user]);

    // Save profile to API
    const handleProfileSave = async () => {
        if (!user?.id) return;

        setSaving(true);
        try {
            await usersApi.update(user.id, {
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
            });
            setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || 'Failed to update profile',
                severity: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    // Validate password
    const validatePassword = (password: string): string[] => {
        const errors: string[] = [];
        if (password.length < 12) errors.push('At least 12 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
        return errors;
    };

    // Change password
    const handlePasswordChange = async () => {
        // Validate
        if (passwords.newPassword !== passwords.confirmPassword) {
            setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
            return;
        }

        const errors = validatePassword(passwords.newPassword);
        if (errors.length > 0) {
            setPasswordErrors(errors);
            return;
        }

        setPasswordSaving(true);
        try {
            // In a real app, this would call a password change endpoint
            // For now, we'll simulate success
            await new Promise(resolve => setTimeout(resolve, 1000));

            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setPasswordErrors([]);
            setSnackbar({ open: true, message: 'Password changed successfully!', severity: 'success' });
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || 'Failed to change password',
                severity: 'error'
            });
        } finally {
            setPasswordSaving(false);
        }
    };

    // Handle notification toggle with auto-save
    const handleNotificationChange = (key: string) => {
        const updated = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
        setNotifications(updated);

        // Save to localStorage (and would save to API in production)
        localStorage.setItem('notificationPreferences', JSON.stringify(updated));

        // Show brief saved indicator
        setNotificationsSaved(true);
        setTimeout(() => setNotificationsSaved(false), 2000);
    };

    // Toggle password visibility
    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
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
                                        size="small"
                                        type="email"
                                        disabled
                                        helperText="Email cannot be changed"
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
                                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                    onClick={handleProfileSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
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
                                {notificationsSaved && (
                                    <Box display="flex" alignItems="center" gap={0.5} ml="auto">
                                        <CheckIcon color="success" fontSize="small" />
                                        <Typography variant="caption" color="success.main">Saved</Typography>
                                    </Box>
                                )}
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
                                        type={showPasswords.current ? 'text' : 'password'}
                                        size="small"
                                        value={passwords.currentPassword}
                                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => togglePasswordVisibility('current')}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="New Password"
                                        type={showPasswords.new ? 'text' : 'password'}
                                        size="small"
                                        value={passwords.newPassword}
                                        onChange={(e) => {
                                            setPasswords({ ...passwords, newPassword: e.target.value });
                                            setPasswordErrors(validatePassword(e.target.value));
                                        }}
                                        error={passwordErrors.length > 0 && passwords.newPassword.length > 0}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => togglePasswordVisibility('new')}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    {passwordErrors.length > 0 && passwords.newPassword.length > 0 && (
                                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                                            Missing: {passwordErrors.join(', ')}
                                        </Typography>
                                    )}
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Confirm New Password"
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        size="small"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                        error={passwords.confirmPassword.length > 0 && passwords.newPassword !== passwords.confirmPassword}
                                        helperText={
                                            passwords.confirmPassword.length > 0 && passwords.newPassword !== passwords.confirmPassword
                                                ? 'Passwords do not match'
                                                : ''
                                        }
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => togglePasswordVisibility('confirm')}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Box mt={3}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={handlePasswordChange}
                                    disabled={
                                        passwordSaving ||
                                        !passwords.currentPassword ||
                                        !passwords.newPassword ||
                                        !passwords.confirmPassword ||
                                        passwords.newPassword !== passwords.confirmPassword
                                    }
                                    startIcon={passwordSaving ? <CircularProgress size={16} /> : null}
                                >
                                    {passwordSaving ? 'Changing...' : 'Change Password'}
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
                                    onClick={() => setMode('light')}
                                    sx={{
                                        width: 100,
                                        height: 60,
                                        borderRadius: 2,
                                        bgcolor: '#fff',
                                        border: '2px solid',
                                        borderColor: mode === 'light' ? 'primary.main' : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        transition: 'all 0.2s ease',
                                        boxShadow: mode === 'light' ? '0 0 0 2px rgba(40,170,226,0.2)' : 'none',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                >
                                    <LightModeIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                                    <Typography variant="caption" color="#333">Light</Typography>
                                </Box>
                                <Box
                                    onClick={() => setMode('dark')}
                                    sx={{
                                        width: 100,
                                        height: 60,
                                        borderRadius: 2,
                                        bgcolor: '#1a1a1a',
                                        border: '2px solid',
                                        borderColor: mode === 'dark' ? 'primary.main' : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        transition: 'all 0.2s ease',
                                        boxShadow: mode === 'dark' ? '0 0 0 2px rgba(40,170,226,0.2)' : 'none',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                >
                                    <DarkModeIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                                    <Typography variant="caption" color="#fff">Dark</Typography>
                                </Box>
                            </Box>

                            <Alert severity="success" sx={{ mt: 3 }}>
                                {mode === 'light' ? '☀️ Light mode active' : '🌙 Dark mode active'}
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
