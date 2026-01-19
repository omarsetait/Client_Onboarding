import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface NotificationPayload {
    type: 'LEAD_UPDATE' | 'NEW_LEAD' | 'EMAIL_RECEIVED' | 'MEETING_SCHEDULED' |
    'DOCUMENT_SIGNED' | 'STAGE_CHANGE' | 'HOT_LEAD' | 'TASK_REMINDER';
    title: string;
    message: string;
    data?: Record<string, any>;
    leadId?: string;
    userId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: Date;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationsGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);
    private connectedClients: Map<string, { socket: Socket; userId?: string }> = new Map();

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            // Extract token from handshake
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (token) {
                const payload = this.jwtService.verify(token, {
                    secret: this.configService.get('JWT_SECRET'),
                });

                const userId = payload.sub;
                this.connectedClients.set(client.id, { socket: client, userId });

                // Join user-specific room
                client.join(`user:${userId}`);

                this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
            } else {
                // Allow anonymous connections for public notifications
                this.connectedClients.set(client.id, { socket: client });
                this.logger.log(`Anonymous client connected: ${client.id}`);
            }
        } catch (error) {
            this.logger.warn(`Client connection failed: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.connectedClients.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Subscribe to a specific lead's updates
     */
    @SubscribeMessage('subscribe:lead')
    handleSubscribeLead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { leadId: string },
    ) {
        client.join(`lead:${data.leadId}`);
        this.logger.log(`Client ${client.id} subscribed to lead:${data.leadId}`);
        return { event: 'subscribed', data: { room: `lead:${data.leadId}` } };
    }

    /**
     * Unsubscribe from a lead's updates
     */
    @SubscribeMessage('unsubscribe:lead')
    handleUnsubscribeLead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { leadId: string },
    ) {
        client.leave(`lead:${data.leadId}`);
        return { event: 'unsubscribed', data: { room: `lead:${data.leadId}` } };
    }

    /**
     * Broadcast to all connected clients
     */
    broadcastToAll(notification: NotificationPayload) {
        this.server.emit('notification', notification);
        this.logger.debug(`Broadcast to all: ${notification.type}`);
    }

    /**
     * Send notification to a specific user
     */
    sendToUser(userId: string, notification: NotificationPayload) {
        this.server.to(`user:${userId}`).emit('notification', notification);
        this.logger.debug(`Sent to user ${userId}: ${notification.type}`);
    }

    /**
     * Send notification to all subscribers of a lead
     */
    sendToLeadSubscribers(leadId: string, notification: NotificationPayload) {
        this.server.to(`lead:${leadId}`).emit('notification', notification);
        this.logger.debug(`Sent to lead ${leadId} subscribers: ${notification.type}`);
    }

    /**
     * Send notification to multiple users
     */
    sendToUsers(userIds: string[], notification: NotificationPayload) {
        userIds.forEach(userId => {
            this.server.to(`user:${userId}`).emit('notification', notification);
        });
    }

    /**
     * Get count of connected clients
     */
    getConnectedCount(): number {
        return this.connectedClients.size;
    }
}
