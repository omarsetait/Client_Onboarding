import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from '@hello-pangea/dnd';
import {
    Box,
    Typography,
    Avatar,
    Chip,
    IconButton,
    CircularProgress,
} from '@mui/material';
import {
    Email as EmailIcon,
} from '@mui/icons-material';
import { GlassCard } from '../common/GlassCard';
import { brandColors, gradients } from '../../theme';

// Pipeline stages - must match Prisma LeadStage enum
const STAGES = [
    { id: 'NEW', label: 'New', color: brandColors.cyan },
    { id: 'QUALIFYING', label: 'Qualifying', color: brandColors.teal },
    { id: 'HOT_ENGAGED', label: 'Hot', color: brandColors.magenta },
    { id: 'MEETING_SCHEDULED', label: 'Meeting', color: brandColors.purple },
    { id: 'PROPOSAL_SENT', label: 'Proposal', color: '#f59e0b' },
    { id: 'NEGOTIATION', label: 'Negotiation', color: '#8b5cf6' },
    { id: 'CLOSED_WON', label: 'Won', color: '#22c55e' },
    { id: 'CLOSED_LOST', label: 'Lost', color: '#ef4444' },
];

interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
    stage: string;
    aiScore?: number;
}

interface LeadsKanbanProps {
    leads: Lead[];
    onStageChange: (leadId: string, newStage: string) => Promise<void>;
    loading?: boolean;
}

export function LeadsKanban({ leads, onStageChange, loading }: LeadsKanbanProps) {
    const navigate = useNavigate();
    const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        setLocalLeads(leads);
    }, [leads]);

    // Group leads by stage
    const leadsByStage = STAGES.reduce((acc, stage) => {
        acc[stage.id] = localLeads.filter(lead => lead.stage === stage.id);
        return acc;
    }, {} as Record<string, Lead[]>);

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // Dropped outside or same position
        if (!destination ||
            (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        const newStage = destination.droppableId;
        const leadId = draggableId;

        // Optimistic update
        setLocalLeads(prev => prev.map(lead =>
            lead.id === leadId ? { ...lead, stage: newStage } : lead
        ));

        setUpdating(leadId);

        try {
            await onStageChange(leadId, newStage);
        } catch (error) {
            // Revert on error
            setLocalLeads(leads);
        } finally {
            setUpdating(null);
        }
    };

    const getScoreColor = (score?: number) => {
        if (!score) return 'default';
        if (score >= 80) return 'success';
        if (score >= 50) return 'warning';
        return 'error';
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Box
                sx={{
                    display: 'flex',
                    gap: { xs: 1.5, sm: 2 },
                    overflowX: 'auto',
                    pb: 2,
                    minHeight: { xs: 'auto', md: 'calc(100vh - 200px)' },
                    // Mobile horizontal scroll with snap
                    scrollSnapType: { xs: 'x mandatory', md: 'none' },
                    WebkitOverflowScrolling: 'touch',
                    px: { xs: 0.5, sm: 0 },
                    mx: { xs: -2, sm: 0 }, // Negative margin to utilize full width on mobile
                    // Hide scrollbar on mobile for cleaner look
                    '&::-webkit-scrollbar': {
                        height: { xs: 4, md: 8 },
                    },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(0,0,0,0.2)',
                        borderRadius: 4,
                    },
                }}
            >
                {STAGES.map((stage) => (
                    <Droppable key={stage.id} droppableId={stage.id}>
                        {(provided, snapshot) => (
                            <Box
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                    minWidth: { xs: 260, sm: 280 },
                                    maxWidth: { xs: 260, sm: 280 },
                                    flexShrink: 0,
                                    bgcolor: snapshot.isDraggingOver
                                        ? 'action.selected'
                                        : 'action.hover',
                                    borderRadius: { xs: 2, sm: 3 },
                                    p: { xs: 1, sm: 1.5 },
                                    transition: 'background 0.2s ease',
                                    // Snap to this column on mobile
                                    scrollSnapAlign: 'start',
                                }}
                            >
                                {/* Column Header */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 2,
                                        px: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            bgcolor: stage.color,
                                        }}
                                    />
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {stage.label}
                                    </Typography>
                                    <Chip
                                        label={leadsByStage[stage.id]?.length || 0}
                                        size="small"
                                        sx={{
                                            ml: 'auto',
                                            height: 22,
                                            fontSize: '0.75rem',
                                        }}
                                    />
                                </Box>

                                {/* Lead Cards */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {leadsByStage[stage.id]?.map((lead, index) => (
                                        <Draggable
                                            key={lead.id}
                                            draggableId={lead.id}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <GlassCard
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    blur={8}
                                                    opacity={0.95}
                                                    onClick={() => navigate(`/leads/${lead.id}`)}
                                                    sx={{
                                                        p: 2,
                                                        cursor: 'grab',
                                                        transform: snapshot.isDragging
                                                            ? 'rotate(3deg)'
                                                            : 'none',
                                                        boxShadow: snapshot.isDragging
                                                            ? '0 20px 40px rgba(0,0,0,0.2)'
                                                            : '0 4px 12px rgba(0,0,0,0.08)',
                                                        opacity: updating === lead.id ? 0.7 : 1,
                                                        '&:hover': {
                                                            transform: snapshot.isDragging
                                                                ? 'rotate(3deg)'
                                                                : 'translateY(-2px)',
                                                        },
                                                    }}
                                                >
                                                    {/* Header */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                                        <Avatar
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                fontSize: '0.85rem',
                                                                background: gradients.accent,
                                                            }}
                                                        >
                                                            {lead.firstName?.[0]}{lead.lastName?.[0]}
                                                        </Avatar>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="subtitle2"
                                                                fontWeight={600}
                                                                noWrap
                                                            >
                                                                {lead.firstName} {lead.lastName}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                noWrap
                                                                sx={{ display: 'block' }}
                                                            >
                                                                {lead.companyName || lead.email}
                                                            </Typography>
                                                        </Box>
                                                        {updating === lead.id && (
                                                            <CircularProgress size={16} />
                                                        )}
                                                    </Box>

                                                    {/* Footer */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {lead.aiScore && (
                                                            <Chip
                                                                label={`${lead.aiScore}%`}
                                                                size="small"
                                                                color={getScoreColor(lead.aiScore)}
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                }}
                                                            />
                                                        )}
                                                        <Box sx={{ flex: 1 }} />
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.location.href = `mailto:${lead.email}`;
                                                            }}
                                                        >
                                                            <EmailIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Box>
                                                </GlassCard>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </Box>

                                {/* Empty State */}
                                {leadsByStage[stage.id]?.length === 0 && (
                                    <Box
                                        sx={{
                                            py: 4,
                                            textAlign: 'center',
                                            color: 'text.secondary',
                                            border: '2px dashed rgba(0,0,0,0.1)',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="caption">
                                            Drop leads here
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Droppable>
                ))}
            </Box>
        </DragDropContext>
    );
}
