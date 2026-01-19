import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Divider,
    Alert,
} from '@mui/material';
import {
    AutoAwesome as AiIcon,
    Refresh as RefreshIcon,
    LightbulbOutlined as LightbulbIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api/client';

interface AiRecommendationPanelProps {
    leadId: string;
}

interface RecommendationData {
    action: string;
    reasoning: string;
    data?: {
        priority: 'high' | 'medium' | 'low';
        suggestedActions: string[];
    };
    nextAgent?: string;
}

export function AiRecommendationPanel({ leadId }: AiRecommendationPanelProps) {
    const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);

    const { mutate: getRecommendation, isPending } = useMutation({
        mutationFn: () => aiApi.getRecommendation(leadId),
        onSuccess: (response) => {
            setRecommendation(response.data);
        },
    });

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AiIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            AI Recommendation
                        </Typography>
                    </Box>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={isPending ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={() => getRecommendation()}
                        disabled={isPending}
                    >
                        {recommendation ? 'Refresh' : 'Get Recommendation'}
                    </Button>
                </Box>

                {!recommendation && !isPending && (
                    <Alert severity="info" icon={<LightbulbIcon />}>
                        Click the button to get AI-powered recommendations for this lead.
                    </Alert>
                )}

                {recommendation && (
                    <Box>
                        {recommendation.data?.priority && (
                            <Chip
                                label={`Priority: ${recommendation.data.priority.toUpperCase()}`}
                                color={getPriorityColor(recommendation.data.priority)}
                                size="small"
                                sx={{ mb: 2 }}
                            />
                        )}

                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Recommended Action
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {recommendation.action}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Reasoning
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {recommendation.reasoning}
                        </Typography>

                        {recommendation.data?.suggestedActions && recommendation.data.suggestedActions.length > 0 && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Suggested Actions
                                </Typography>
                                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                                    {recommendation.data.suggestedActions.map((action, index) => (
                                        <Typography component="li" variant="body2" key={index}>
                                            {action}
                                        </Typography>
                                    ))}
                                </Box>
                            </>
                        )}

                        {recommendation.nextAgent && (
                            <Box sx={{ mt: 2 }}>
                                <Chip
                                    label={`Next Agent: ${recommendation.nextAgent}`}
                                    variant="outlined"
                                    size="small"
                                />
                            </Box>
                        )}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
