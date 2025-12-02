import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

// Import SockJS and STOMP only on web
let SockJS: any = null;
let Client: any = null;

if (Platform.OS === 'web') {
  try {
    SockJS = require('sockjs-client');
    Client = require('@stomp/stompjs').Client;
  } catch (error) {
    console.warn('⚠️ WebSocket libraries not available:', error);
  }
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  fromUser?: {
    id: number;
    name: string;
    phoneNumber: string;
  };
  relatedProjectId?: number;
  relatedBidId?: number;
  relatedPhaseId?: number;
  relatedAppointmentId?: number;
  relatedTimeRequestId?: number;
  relatedReviewId?: number;
}

class WebSocketNotificationService {
  private client: any = null;
  private isConnected: boolean = false;
  private token: string | null = null;
  private userId: number | null = null;
  private onNotificationCallback: ((notification: Notification) => void) | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Connect to WebSocket server (Web only)
   */
  connect(token: string, userId: number, onNotification: (notification: Notification) => void): void {
    // Only work on web platform
    if (Platform.OS !== 'web') {
      console.log('⚠️ WebSocket notifications only supported on web platform');
      return;
    }

    if (!SockJS || !Client) {
      console.error('❌ WebSocket libraries not loaded');
      return;
    }

    if (this.isConnected) {
      console.log('⚠️ WebSocket notification service already connected');
      return;
    }

    this.token = token;
    this.userId = userId;
    this.onNotificationCallback = onNotification;

    // Determine WebSocket URL based on environment
    // SockJS requires HTTP/HTTPS URLs, not ws:/wss: schemes
    let wsUrl: string;
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'https:') {
        // Production: Use relative URL (Nginx will proxy to backend)
        wsUrl = '/ws';
      } else {
        // Development: Use production HTTPS URL
        wsUrl = 'https://www.bonyad-hub.com/ws';
      }
    } else {
      // Fallback for non-web environments
      wsUrl = 'https://www.bonyad-hub.com/ws';
    }

    console.log('🔌 [Notifications] Connecting to WebSocket:', wsUrl);

    try {
      // Create SockJS connection
      // SockJS automatically handles WebSocket upgrade from HTTP/HTTPS
      const socket = new SockJS(wsUrl);

      // Create STOMP client
      this.client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('✅ [Notifications] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.subscribeToNotifications();
        },
        onStompError: (frame: any) => {
          console.error('❌ [Notifications] STOMP error:', frame);
          this.isConnected = false;
        },
        onWebSocketClose: () => {
          console.log('🔌 [Notifications] WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        },
        onDisconnect: () => {
          console.log('🔌 [Notifications] STOMP disconnected');
          this.isConnected = false;
        },
      });

      // Add authentication headers
      this.client.beforeConnect = () => {
        this.client.configure({
          connectHeaders: {
            Authorization: `Bearer ${this.token}`,
          },
        });
      };

      // Activate client
      this.client.activate();
    } catch (error) {
      console.error('❌ [Notifications] Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Subscribe to user-specific notification queue
   */
  private subscribeToNotifications(): void {
    if (!this.client || !this.isConnected || !this.userId) {
      console.error('❌ [Notifications] Cannot subscribe: WebSocket not connected');
      return;
    }

    const destination = `/user/${this.userId}/queue/notifications`;

    console.log('📡 [Notifications] Subscribing to:', destination);

    try {
      this.client.subscribe(destination, (message: any) => {
        try {
          const notification = JSON.parse(message.body);
          console.log('📬 [Notifications] Received notification:', notification);

          if (this.onNotificationCallback) {
            this.onNotificationCallback(notification);
          }
        } catch (error) {
          console.error('❌ [Notifications] Error parsing notification:', error);
        }
      });
    } catch (error) {
      console.error('❌ [Notifications] Error subscribing:', error);
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [Notifications] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = 5000 * this.reconnectAttempts;
    console.log(
      `🔄 [Notifications] Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.token && this.userId && this.onNotificationCallback) {
        this.connect(this.token, this.userId, this.onNotificationCallback);
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('❌ [Notifications] Error disconnecting:', error);
      }
      this.client = null;
    }

    this.isConnected = false;
    this.token = null;
    this.userId = null;
    this.onNotificationCallback = null;
    this.reconnectAttempts = 0;
    console.log('🔌 [Notifications] WebSocket disconnected');
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export default new WebSocketNotificationService();
