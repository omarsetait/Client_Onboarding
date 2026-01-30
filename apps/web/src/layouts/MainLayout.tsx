import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    BottomNavigation,
    BottomNavigationAction,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Email as EmailIcon,
    Description as DocumentIcon,
    Analytics as AnalyticsIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    RequestQuote as ProposalIcon,
} from '@mui/icons-material';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { NotificationBell } from '../components/NotificationProvider';
import { CommandPalette } from '../components/layout/CommandPalette';
import { gradients, brandColors } from '../theme';

const SIDEBAR_WIDTH = 72;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Leads', icon: <PeopleIcon />, path: '/leads' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Communications', icon: <EmailIcon />, path: '/communications' },
    { text: 'Documents', icon: <DocumentIcon />, path: '/documents' },
    { text: 'Proposals', icon: <ProposalIcon />, path: '/proposals' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
];

// Gradient text style
const gradientTextStyle = {
    background: gradients.logo,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
};

export function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [logoHovered, setLogoHovered] = useState(false);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleLogout = () => { dispatch(logout()); navigate('/login'); };

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    // Sidebar - icons only, no logo
    const sidebar = (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
                pt: 10,
                pb: 2,
                overflow: 'visible',
            }}
        >
            {/* Navigation items */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5, px: 1, overflow: 'visible' }}>
                {menuItems.map((item) => {
                    const isHovered = hoveredItem === item.text;
                    const active = isActive(item.path);

                    return (
                        <Box
                            key={item.text}
                            component={motion.div}
                            whileHover={{ scale: 1.05, x: 5 }}
                            whileTap={{ scale: 0.95 }}
                            onMouseEnter={() => setHoveredItem(item.text)}
                            onMouseLeave={() => setHoveredItem(null)}
                            onClick={() => navigate(item.path)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                py: 1.5,
                                px: 1.5,
                                borderRadius: 2,
                                cursor: 'pointer',
                                position: 'relative',
                                bgcolor: active ? 'rgba(0,0,0,0.05)' : 'transparent',
                                transition: 'background-color 0.3s ease',
                                overflow: 'visible',
                                zIndex: isHovered ? 100 : 1,
                            }}
                        >
                            {/* Icon */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: active ? brandColors.cyan : isHovered ? brandColors.magenta : '#666',
                                    transition: 'color 0.3s ease',
                                    '& svg': { fontSize: 24 },
                                }}
                            >
                                {item.icon}
                            </Box>

                            {/* Text - appears on hover with pill background */}
                            <AnimatePresence>
                                {isHovered && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            position: 'absolute',
                                            left: '100%',
                                            marginLeft: '12px',
                                            zIndex: 100,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                whiteSpace: 'nowrap',
                                                color: 'text.primary',
                                                bgcolor: 'background.paper',
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 20,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                            }}
                                        >
                                            {item.text}
                                        </Typography>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Active indicator */}
                            {active && (
                                <Box
                                    component={motion.div}
                                    layoutId="activeIndicator"
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 3,
                                        height: '60%',
                                        background: gradients.accent,
                                        borderRadius: '0 4px 4px 0',
                                    }}
                                />
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* Settings at bottom */}
            <Box sx={{ px: 1, overflow: 'visible' }}>
                <Box
                    component={motion.div}
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setHoveredItem('Settings')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => navigate('/settings')}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1.5,
                        px: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        overflow: 'visible',
                        zIndex: hoveredItem === 'Settings' ? 100 : 1,
                    }}
                >
                    <Box sx={{
                        color: hoveredItem === 'Settings' ? brandColors.magenta : '#666',
                        display: 'flex',
                        transition: 'color 0.3s ease',
                    }}>
                        <SettingsIcon />
                    </Box>

                    <AnimatePresence>
                        {hoveredItem === 'Settings' && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    position: 'absolute',
                                    left: '100%',
                                    marginLeft: '12px',
                                    zIndex: 100,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap',
                                        color: 'text.primary',
                                        bgcolor: 'background.paper',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 20,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    Settings
                                </Typography>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Top Bar - INCLUDES T LOGO */}
            <AppBar
                position="fixed"
                sx={{
                    width: '100%',
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    zIndex: 1201,
                }}
            >
                <Toolbar>
                    {/* Mobile menu button */}
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* T Logo in TOP BAR - expands to TachyHealth on hover */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            mr: 2,
                        }}
                        onMouseEnter={() => setLogoHovered(true)}
                        onMouseLeave={() => setLogoHovered(false)}
                        onClick={() => navigate('/dashboard')}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                ...gradientTextStyle,
                            }}
                        >
                            T
                        </Typography>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                ...gradientTextStyle,
                                overflow: 'hidden',
                                maxWidth: logoHovered ? '200px' : '0px',
                                opacity: logoHovered ? 1 : 0,
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            achyHealth
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    {/* Notification Bell */}
                    <NotificationBell />

                    {/* User Menu */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                        <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {user?.firstName} {user?.lastName}
                        </Typography>
                        <IconButton onClick={handleMenuClick} size="small">
                            <Avatar
                                sx={{
                                    width: 36,
                                    height: 36,
                                    background: gradients.accent,
                                    fontWeight: 600,
                                }}
                            >
                                {user?.firstName?.charAt(0)}
                                {user?.lastName?.charAt(0)}
                            </Avatar>
                        </IconButton>
                    </Box>

                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
                    >
                        <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                            Profile
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
                            Settings
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                            <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                            Logout
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            {/* Sidebar - icons only */}
            <Box
                component="nav"
                sx={{
                    width: { md: SIDEBAR_WIDTH },
                    flexShrink: { md: 0 },
                }}
            >
                {/* Mobile drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { width: 200, bgcolor: 'background.paper' },
                    }}
                >
                    {sidebar}
                </Drawer>

                {/* Desktop sidebar */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            width: SIDEBAR_WIDTH,
                            border: 'none',
                            overflow: 'visible',
                            bgcolor: 'background.paper',
                        },
                    }}
                    open
                >
                    {sidebar}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                    mt: '64px',
                    pb: { xs: '80px', md: 3 }, // Extra padding for bottom nav on mobile
                    overflowX: 'hidden', // Prevent scrollbar during transitions
                }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </Box>

            {/* Mobile Bottom Navigation */}
            <BottomNavigation
                value={menuItems.findIndex(item => isActive(item.path))}
                onChange={(_, newValue) => navigate(menuItems[newValue].path)}
                showLabels
                sx={{
                    display: { xs: 'flex', md: 'none' },
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1200,
                    borderTop: '1px solid rgba(0,0,0,0.08)',
                    bgcolor: 'background.paper',
                    height: 64,
                    '& .MuiBottomNavigationAction-root': {
                        minWidth: 'auto',
                        py: 1,
                        '&.Mui-selected': {
                            color: brandColors.cyan,
                        },
                    },
                    '& .MuiBottomNavigationAction-label': {
                        fontSize: '0.65rem',
                        '&.Mui-selected': {
                            fontSize: '0.7rem',
                        },
                    },
                }}
            >
                {menuItems.slice(0, 5).map((item) => (
                    <BottomNavigationAction
                        key={item.text}
                        label={item.text}
                        icon={item.icon}
                    />
                ))}
            </BottomNavigation>

            {/* Command Palette (Cmd+K) */}
            <CommandPalette />
        </Box>
    );
}

