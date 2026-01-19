import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Chip,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Alert,
} from '@mui/material';
import {
    Email as EmailIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api/client';

interface AiEmailGeneratorProps {
    leadId: string;
    leadName: string;
}

const emailTypes = [
    { id: 'acknowledgment', label: 'Acknowledgment', color: 'info' as const },
    { id: 'follow_up', label: 'Follow Up', color: 'warning' as const },
    { id: 'demo_offer', label: 'Demo Invite', color: 'success' as const },
    { id: 'case_study', label: 'Case Study', color: 'primary' as const },
    { id: 'break_up', label: 'Break Up', color: 'error' as const },
];

interface EmailData {
    subject: string;
    body: string;
    callToAction: string;
    personalization: string[];
}

export function AiEmailGenerator({ leadId, leadName }: AiEmailGeneratorProps) {
    const [selectedType, setSelectedType] = useState<string>('');
    const [generatedEmail, setGeneratedEmail] = useState<EmailData | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const { mutate: generateEmail, isPending } = useMutation({
        mutationFn: (type: string) => aiApi.generateEmail(leadId, type),
        onSuccess: (response) => {
            setGeneratedEmail(response.data.data);
            setDialogOpen(true);
        },
    });

    const handleGenerate = (type: string) => {
        setSelectedType(type);
        generateEmail(type);
    };

    const handleCopy = async () => {
        if (!generatedEmail) return;

        const text = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body.replace(/<[^>]+>/g, '')}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setDialogOpen(false);
        setGeneratedEmail(null);
    };

    return (
        <>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <EmailIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            AI Email Generator
                        </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Generate a personalized email for {leadName}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {emailTypes.map((type) => (
                            <Button
                                key={type.id}
                                variant="outlined"
                                size="small"
                                color={type.color}
                                onClick={() => handleGenerate(type.id)}
                                disabled={isPending}
                                startIcon={isPending && selectedType === type.id ? <CircularProgress size={14} /> : null}
                            >
                                {type.label}
                            </Button>
                        ))}
                    </Box>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon color="primary" />
                            Generated Email
                        </Box>
                        <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                            <IconButton onClick={handleCopy}>
                                {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {generatedEmail && (
                        <Box>
                            <TextField
                                fullWidth
                                label="Subject"
                                value={generatedEmail.subject}
                                InputProps={{ readOnly: true }}
                                sx={{ mb: 2 }}
                            />

                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Body
                            </Typography>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 1,
                                    mb: 2,
                                    '& p': { mb: 1 },
                                    '& ul': { pl: 2 },
                                }}
                                dangerouslySetInnerHTML={{ __html: generatedEmail.body }}
                            />

                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Call to Action:</strong> {generatedEmail.callToAction}
                                </Typography>
                            </Alert>

                            {generatedEmail.personalization.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Personalization Used
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {generatedEmail.personalization.map((item, index) => (
                                            <Chip key={index} label={item} size="small" variant="outlined" />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Close</Button>
                    <Button
                        variant="contained"
                        startIcon={<SendIcon />}
                        onClick={() => {
                            // Would integrate with email sending
                            handleClose();
                        }}
                    >
                        Send Email
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
