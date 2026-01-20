import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Skeleton,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    FilterList as FilterIcon,
    MoreVert as MoreIcon,
    ViewList as ListIcon,
    ViewKanban as KanbanIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/client';
import { LeadsKanban } from '../components/leads/LeadsKanban';
import { GlassCard } from '../components/common/GlassCard';
import { io } from 'socket.io-client';

const getScoreColor = (score: number) => {
    if (score >= 80) return 'error';
    if (score >= 50) return 'warning';
    return 'default';
};

const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
        NEW: 'New',
        QUALIFYING: 'Qualifying',
        HOT_ENGAGED: 'Hot',
        WARM_NURTURING: 'Warm',
        COLD_ARCHIVED: 'Archived',
        MEETING_SCHEDULED: 'Meeting',
        DISCOVERY_COMPLETE: 'Discovery',
        PROPOSAL_SENT: 'Proposal',
        NEGOTIATION: 'Negotiation',
        CONTRACT_STAGE: 'Contract',
        CLOSED_WON: 'Won',
        CLOSED_LOST: 'Lost',
        DISQUALIFIED: 'Disqualified',
        UNSUBSCRIBED: 'Unsubscribed',
    };
    return labels[stage] || stage;
};

export function LeadsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedLead, setSelectedLead] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['leads', { page: page + 1, limit: viewMode === 'board' ? 100 : pageSize, search }],
        queryFn: () => leadsApi.getAll({ page: page + 1, limit: viewMode === 'board' ? 100 : pageSize, search }),
    });

    const updateStageMutation = useMutation({
        mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
            leadsApi.updateStage(leadId, stage),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
    });

    // Real-time updates via WebSocket
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const apiUrl = 'http://localhost:3001';
        const socket = io(`${apiUrl}/notifications`, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.on('notification', (data: any) => {
            // Refresh leads on stage change or new lead notifications
            if (['LEAD_STAGE_CHANGED', 'NEW_LEAD', 'LEAD_UPDATED'].includes(data.type)) {
                queryClient.invalidateQueries({ queryKey: ['leads'] });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [queryClient]);

    const leads = data?.data?.data || [];
    const total = data?.data?.meta?.total || 0;

    const handleStageChange = async (leadId: string, newStage: string) => {
        await updateStageMutation.mutateAsync({ leadId, stage: newStage });
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, leadId: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedLead(leadId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedLead(null);
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 180,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Typography fontWeight={500}>
                        {params.row.firstName} {params.row.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {params.row.email}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'companyName',
            headerName: 'Company',
            flex: 1,
            minWidth: 150,
        },
        {
            field: 'score',
            headerName: 'Score',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value}
                    size="small"
                    color={getScoreColor(params.value)}
                    sx={{ fontWeight: 600 }}
                />
            ),
        },
        {
            field: 'stage',
            headerName: 'Stage',
            width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={getStageLabel(params.value)}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: 'source',
            headerName: 'Source',
            width: 120,
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 120,
            valueFormatter: (params) => {
                return new Date(params.value).toLocaleDateString();
            },
        },
        {
            field: 'actions',
            headerName: '',
            width: 50,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, params.row.id)}
                >
                    <MoreIcon />
                </IconButton>
            ),
        },
    ];

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        Leads
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your sales pipeline
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* View Toggle */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, value) => value && setViewMode(value)}
                        size="small"
                    >
                        <ToggleButton value="list" aria-label="list view">
                            <ListIcon />
                        </ToggleButton>
                        <ToggleButton value="board" aria-label="board view">
                            <KanbanIcon />
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/leads/new')}
                    >
                        Add Lead
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <GlassCard sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        placeholder="Search leads..."
                        size="small"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ width: 300 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button variant="outlined" startIcon={<FilterIcon />}>
                        Filters
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {total} leads total
                    </Typography>
                </Box>
            </GlassCard>

            {/* Content based on view mode */}
            {viewMode === 'board' ? (
                <LeadsKanban
                    leads={leads.map((lead: any) => ({
                        id: lead.id,
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        email: lead.email,
                        companyName: lead.companyName,
                        stage: lead.stage,
                        aiScore: lead.score,
                    }))}
                    onStageChange={handleStageChange}
                    loading={isLoading}
                />
            ) : (
                <GlassCard sx={{ p: 0 }}>
                    {isLoading ? (
                        <Box sx={{ p: 3 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                            ))}
                        </Box>
                    ) : (
                        <DataGrid
                            rows={leads}
                            columns={columns}
                            rowCount={total}
                            paginationMode="server"
                            paginationModel={{ page, pageSize }}
                            onPaginationModelChange={(model) => {
                                setPage(model.page);
                                setPageSize(model.pageSize);
                            }}
                            pageSizeOptions={[25, 50, 100]}
                            onRowClick={(params) => navigate(`/leads/${params.id}`)}
                            sx={{
                                border: 0,
                                '& .MuiDataGrid-row': { cursor: 'pointer' },
                                '& .MuiDataGrid-cell:focus': { outline: 'none' },
                            }}
                            autoHeight
                            disableRowSelectionOnClick
                        />
                    )}
                </GlassCard>
            )}

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => { navigate(`/leads/${selectedLead}`); handleMenuClose(); }}>
                    View Details
                </MenuItem>
                <MenuItem onClick={handleMenuClose}>Edit</MenuItem>
                <MenuItem onClick={handleMenuClose}>Assign</MenuItem>
                <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
                    Delete
                </MenuItem>
            </Menu>
        </Box>
    );
}
