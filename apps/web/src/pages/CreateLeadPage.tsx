import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    MenuItem,
    IconButton,
    Alert,
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/client';

const sources = [
    'WEBSITE_FORM',
    'LINKEDIN',
    'REFERRAL',
    'COLD_EMAIL',
    'CONFERENCE',
    'PARTNER',
    'OTHER',
];

const industries = [
    'Healthcare',
    'Insurance',
    'Life Sciences',
    'Pharma',
    'Hospital',
    'Clinic',
    'Other',
];

export function CreateLeadPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        jobTitle: '',
        industry: '',
        source: 'WEBSITE_FORM',
        originalMessage: '',
    });

    const { mutate: createLead, isPending } = useMutation({
        mutationFn: (data: typeof formData) => leadsApi.create(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            navigate(`/leads/${response.data.id}`);
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create lead');
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.companyName) {
            setError('Please fill in all required fields');
            return;
        }

        createLead(formData);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/leads')}>
                    <BackIcon />
                </IconButton>
                <Typography variant="h5" fontWeight={600}>
                    Add New Lead
                </Typography>
            </Box>

            <Card>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <Typography variant="h6" gutterBottom>
                            Contact Information
                        </Typography>

                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="First Name *"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Last Name *"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email *"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </Grid>

                        <Typography variant="h6" gutterBottom>
                            Company Information
                        </Typography>

                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Company Name *"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Job Title"
                                    name="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Industry"
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleChange}
                                >
                                    {industries.map((industry) => (
                                        <MenuItem key={industry} value={industry}>
                                            {industry}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Source"
                                    name="source"
                                    value={formData.source}
                                    onChange={handleChange}
                                >
                                    {sources.map((source) => (
                                        <MenuItem key={source} value={source}>
                                            {source.replace(/_/g, ' ')}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>

                        <Typography variant="h6" gutterBottom>
                            Additional Information
                        </Typography>

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Original Message / Notes"
                            name="originalMessage"
                            value={formData.originalMessage}
                            onChange={handleChange}
                            placeholder="Enter any initial notes or the original inquiry message..."
                            sx={{ mb: 3 }}
                        />

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={() => navigate('/leads')}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                disabled={isPending}
                            >
                                {isPending ? 'Creating...' : 'Create Lead'}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}
