import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

export interface FreeBusySlot {
    start: Date;
    end: Date;
    status: 'free' | 'busy' | 'tentative';
}

export interface MeetingDetails {
    subject: string;
    startTime: Date;
    endTime: Date;
    attendees: { email: string; name?: string }[];
    isOnlineMeeting: boolean;
    body?: string;
}

export interface CreatedMeeting {
    id: string;
    webLink: string;
    joinUrl?: string;
    subject: string;
    start: Date;
    end: Date;
}

@Injectable()
export class MicrosoftGraphService implements OnModuleInit {
    private readonly logger = new Logger(MicrosoftGraphService.name);
    private msalClient: ConfidentialClientApplication | null = null;
    private graphClient: Client | null = null;
    private isConfigured = false;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        await this.initialize();
    }

    private async initialize() {
        const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
        const clientSecret = this.configService.get<string>('MICROSOFT_CLIENT_SECRET');
        const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID');

        if (!clientId || !clientSecret || !tenantId) {
            this.logger.warn('Microsoft Graph not configured - missing credentials');
            return;
        }

        try {
            this.msalClient = new ConfidentialClientApplication({
                auth: {
                    clientId,
                    clientSecret,
                    authority: `https://login.microsoftonline.com/${tenantId}`,
                },
            });

            this.graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        const result = await this.msalClient!.acquireTokenByClientCredential({
                            scopes: ['https://graph.microsoft.com/.default'],
                        });
                        done(null, result?.accessToken || null);
                    } catch (error) {
                        done(error as Error, null);
                    }
                },
            });

            this.isConfigured = true;
            this.logger.log('Microsoft Graph client initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Microsoft Graph', error);
        }
    }

    isAvailable(): boolean {
        return this.isConfigured && this.graphClient !== null;
    }

    /**
     * Get free/busy schedule for a user
     */
    async getFreeBusySchedule(
        userEmail: string,
        startTime: Date,
        endTime: Date,
    ): Promise<FreeBusySlot[]> {
        if (!this.graphClient) {
            throw new Error('Microsoft Graph not configured');
        }

        try {
            const response = await this.graphClient
                .api('/me/calendar/getSchedule')
                .post({
                    schedules: [userEmail],
                    startTime: {
                        dateTime: startTime.toISOString(),
                        timeZone: 'UTC',
                    },
                    endTime: {
                        dateTime: endTime.toISOString(),
                        timeZone: 'UTC',
                    },
                    availabilityViewInterval: 30, // 30 minute slots
                });

            const schedule = response.value[0];
            const slots: FreeBusySlot[] = [];

            if (schedule?.scheduleItems) {
                for (const item of schedule.scheduleItems) {
                    slots.push({
                        start: new Date(item.start.dateTime),
                        end: new Date(item.end.dateTime),
                        status: item.status.toLowerCase() as 'free' | 'busy' | 'tentative',
                    });
                }
            }

            return slots;
        } catch (error) {
            this.logger.error('Failed to get free/busy schedule', error);
            throw error;
        }
    }

    /**
     * Find available time slots for a meeting
     */
    async findAvailableSlots(
        userEmail: string,
        durationMinutes: number,
        daysAhead: number = 7,
        workingHoursStart: number = 9,
        workingHoursEnd: number = 17,
    ): Promise<{ start: Date; end: Date }[]> {
        const startTime = new Date();
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + daysAhead);

        const busySlots = await this.getFreeBusySchedule(userEmail, startTime, endTime);
        const availableSlots: { start: Date; end: Date }[] = [];

        // Generate potential slots for each working day
        for (let day = 0; day < daysAhead; day++) {
            const date = new Date();
            date.setDate(date.getDate() + day);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Generate 30-minute slots during working hours
            for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const slotStart = new Date(date);
                    slotStart.setHours(hour, minute, 0, 0);

                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

                    // Check if slot is in the past
                    if (slotStart < new Date()) continue;

                    // Check if slot end exceeds working hours
                    if (slotEnd.getHours() > workingHoursEnd) continue;

                    // Check if slot conflicts with any busy time
                    const hasConflict = busySlots.some(
                        (busy) =>
                            busy.status !== 'free' &&
                            slotStart < busy.end &&
                            slotEnd > busy.start,
                    );

                    if (!hasConflict) {
                        availableSlots.push({ start: slotStart, end: slotEnd });
                    }
                }
            }
        }

        // Return top 5 slots
        return availableSlots.slice(0, 5);
    }

    /**
     * Create a Teams meeting
     */
    async createTeamsMeeting(details: MeetingDetails): Promise<CreatedMeeting> {
        if (!this.graphClient) {
            throw new Error('Microsoft Graph not configured');
        }

        try {
            const event = await this.graphClient.api('/me/events').post({
                subject: details.subject,
                body: {
                    contentType: 'HTML',
                    content: details.body || `<p>You are invited to a meeting: ${details.subject}</p>`,
                },
                start: {
                    dateTime: details.startTime.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: details.endTime.toISOString(),
                    timeZone: 'UTC',
                },
                attendees: details.attendees.map((a) => ({
                    emailAddress: {
                        address: a.email,
                        name: a.name || a.email,
                    },
                    type: 'required',
                })),
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
            });

            return {
                id: event.id,
                webLink: event.webLink,
                joinUrl: event.onlineMeeting?.joinUrl,
                subject: event.subject,
                start: new Date(event.start.dateTime),
                end: new Date(event.end.dateTime),
            };
        } catch (error) {
            this.logger.error('Failed to create Teams meeting', error);
            throw error;
        }
    }

    /**
     * Cancel/delete a meeting
     */
    async cancelMeeting(meetingId: string): Promise<void> {
        if (!this.graphClient) {
            throw new Error('Microsoft Graph not configured');
        }

        try {
            await this.graphClient.api(`/me/events/${meetingId}`).delete();
            this.logger.log(`Meeting ${meetingId} cancelled`);
        } catch (error) {
            this.logger.error('Failed to cancel meeting', error);
            throw error;
        }
    }
}
