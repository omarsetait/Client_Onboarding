import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    LinearProgress,
    Chip,
    Divider,
} from '@mui/material';
import {
    Score as ScoreIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api/client';

interface AiLeadScorerProps {
    leadId: string;
    currentScore: number;
}

interface ScoreBreakdown {
    companyFit: number;
    roleLevel: number;
    intent: number;
    engagement: number;
    urgency: number;
}

interface ScoreData {
    totalScore: number;
    category: 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED';
    confidence: number;
    breakdown: ScoreBreakdown;
    reasoning: string;
}

export function AiLeadScorer({ leadId, currentScore }: AiLeadScorerProps) {
    const [scoreData, setScoreData] = useState<ScoreData | null>(null);

    const { mutate: scoreLead, isPending } = useMutation({
        mutationFn: () => aiApi.scoreLead(leadId),
        onSuccess: (response) => {
            setScoreData(response.data.data);
        },
    });

    const getCategoryColor = (category?: string) => {
        switch (category) {
            case 'HOT': return 'error';
            case 'WARM': return 'warning';
            case 'COLD': return 'info';
            case 'UNQUALIFIED': return 'default';
            default: return 'default';
        }
    };

    const breakdownLabels: Record<keyof ScoreBreakdown, { label: string; max: number }> = {
        companyFit: { label: 'Company Fit', max: 25 },
        roleLevel: { label: 'Role Level', max: 20 },
        intent: { label: 'Intent', max: 25 },
        engagement: { label: 'Engagement', max: 15 },
        urgency: { label: 'Urgency', max: 15 },
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScoreIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            AI Lead Scoring
                        </Typography>
                    </Box>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <TrendingUpIcon />}
                        onClick={() => scoreLead()}
                        disabled={isPending}
                    >
                        {scoreData ? 'Re-score' : 'Score Lead'}
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h2" fontWeight={700} color="primary">
                        {scoreData?.totalScore ?? currentScore}
                    </Typography>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            out of 100
                        </Typography>
                        {scoreData && (
                            <Chip
                                label={scoreData.category}
                                color={getCategoryColor(scoreData.category)}
                                size="small"
                            />
                        )}
                    </Box>
                </Box>

                {scoreData && (
                    <>
                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Score Breakdown
                        </Typography>

                        {(Object.keys(breakdownLabels) as Array<keyof ScoreBreakdown>).map((key) => (
                            <Box key={key} sx={{ mb: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2">{breakdownLabels[key].label}</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {scoreData.breakdown[key]}/{breakdownLabels[key].max}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={(scoreData.breakdown[key] / breakdownLabels[key].max) * 100}
                                    sx={{ height: 6, borderRadius: 1 }}
                                />
                            </Box>
                        ))}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            AI Analysis
                        </Typography>
                        <Typography variant="body2">
                            {scoreData.reasoning}
                        </Typography>

                        <Box sx={{ mt: 2 }}>
                            <Chip
                                label={`Confidence: ${scoreData.confidence}%`}
                                variant="outlined"
                                size="small"
                            />
                        </Box>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
