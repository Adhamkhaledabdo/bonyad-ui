// WebSocket Service for Online Status Tracking
// Based on socket_API.md specifications
// OPTION 2: Manual STOMP frames (like iOS Swift implementation)

import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';

let ws: WebSocket | null = null;
let isConnected = false;
let reconnectAttempts = 0;
let authToken: string | null = null; // Store token for reconnection
let isConnecting = false; // Track if we're in the process of connecting
let isDisconnecting = false; // Track if we're in the process of disconnecting
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

export const OnlineStatusService = {
  /**
   * Send STOMP DISCONNECT frame
   */
  sendStompDisconnect() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    const disconnectFrame = 'DISCONNECT\n\n\0';
    ws.send(disconnectFrame);
    console.log('📤 [WebSocket] Sent STOMP DISCONNECT');
  },

  /**
   * Send STOMP CONNECT frame (MANUAL - like iOS)
   */
  sendStompConnect(token: string, attempt: number = 1) {
    if (!ws) {
      console.error('❌ [WebSocket] Cannot send CONNECT - WebSocket is null');
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error('❌ [WebSocket] Cannot send CONNECT - readyState:', ws.readyState);
      return;
    }

    // CRITICAL: Clean token
    const cleanToken = token.trim();
    
    if (!cleanToken || cleanToken.length === 0) {
      console.error('❌ [WebSocket] Invalid token (empty after trim)');
      return;
    }

    console.log('📤 [WebSocket] Token length:', cleanToken.length);
    console.log('📤 [WebSocket] Token starts with:', cleanToken.substring(0, 20) + '...');

    // iOS-style STOMP CONNECT with strict framing
    // Use \r\n for line breaks and \x00 for null terminator
    const connectFrame =
      `CONNECT\r\n` +
      `accept-version:1.2\r\n` +
      `Authorization:Bearer ${cleanToken}\r\n` +
      `\r\n\x00`; // CRLF + real null byte

    console.log('📤 [WebSocket] Strict iOS-style STOMP CONNECT frame:');
    console.log('--- START FRAME ---');
    console.log(connectFrame.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\x00/g, '<NULL>'));
    console.log('--- END FRAME ---');

    // Verify null byte
    const nullIndex = connectFrame.indexOf('\x00');
    console.log('📤 [WebSocket] Null byte at position:', nullIndex);
    console.log('📤 [WebSocket] Frame length:', connectFrame.length);
    
    try {
      console.log('📤 [WebSocket] Calling ws.send() with binary encoding...');
      console.log('📤 [WebSocket] ws.readyState before send:', ws.readyState);
      
      // CRITICAL: Send as binary (ArrayBuffer) to preserve null byte
      const encoder = new TextEncoder();
      const encoded = encoder.encode(connectFrame);
      
      console.log('📤 [WebSocket] Encoded length:', encoded.length);
      console.log('📤 [WebSocket] Last byte (should be 0x00):', '0x' + encoded[encoded.length - 1].toString(16));
      
      ws.send(encoded);
      
      console.log('✅ [WebSocket] STOMP CONNECT sent (binary mode)');
      console.log('✅ [WebSocket] ws.readyState after send:', ws.readyState);
      
      // Wait for CONNECTED response
      setTimeout(() => {
        if (!isConnected) {
          console.warn('⚠️ [WebSocket] No CONNECTED response after 3 seconds');
          console.warn('⚠️ [WebSocket] Check backend console for "STOMP CONNECT intercepted"');
        }
      }, 3000);
    } catch (error) {
      console.error('❌ [WebSocket] Error sending CONNECT:', error);
      console.error('❌ [WebSocket] Error details:', JSON.stringify(error));
    }
  },

  /**
   * Handle incoming STOMP messages
   */
  handleStompFrame(frame: string) {
    // Remove carriage returns
    const cleanFrame = frame.replace(/\r/g, '');
    
    console.log('📨 [WebSocket] Received STOMP frame');
    console.log('   Raw length:', frame.length);
    console.log('   Clean length:', cleanFrame.length);
    
    const lines = cleanFrame.split('\n');
    const command = lines[0].trim();

    console.log('📨 [WebSocket] STOMP command:', command);
    console.log('📨 [WebSocket] Total lines:', lines.length);

    if (command === 'CONNECTED') {
      console.log('✅ [WebSocket] CONNECTED frame received!');
      
      // Parse headers
      const headers: { [key: string]: string } = {};
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') break;
        
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
      
      console.log('✅ [WebSocket] CONNECTED headers:', JSON.stringify(headers, null, 2));
      console.log('✅ [WebSocket] User is now ONLINE');
      
      isConnected = true;
      isConnecting = false;
      reconnectAttempts = 0;
      this.startHeartbeat();
      
    } else if (command === 'ERROR') {
      console.error('❌ [WebSocket] STOMP ERROR received!');
      
      // Parse error details
      const errorInfo: { [key: string]: string } = {};
      let messageContent = '';
      let inContent = false;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('message:')) {
          errorInfo.message = line.substring(8).trim();
          inContent = true;
        } else if (line === '' && inContent) {
          // Empty line means content follows
          messageContent = lines.slice(i + 1).join('\n').trim();
          break;
        } else {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            errorInfo[key] = value;
          }
        }
      }
      
      console.error('❌ [WebSocket] Error info:', JSON.stringify(errorInfo, null, 2));
      console.error('❌ [WebSocket] Error content:', messageContent);
      
      isConnected = false;
      isConnecting = false;
      
    } else if (command === 'MESSAGE') {
      console.log('📨 [WebSocket] Received MESSAGE frame');
    } else {
      console.log('ℹ️ [WebSocket] Unknown STOMP frame type:', command);
      console.log('ℹ️ [WebSocket] Full frame:', cleanFrame.substring(0, 200));
    }
  },

  /**
   * Start ping to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
        // Send WebSocket ping (not STOMP)
        console.log('💓 Heartbeat - Connection alive');
        // React Native WebSocket doesn't support ping, but we can send heartbeat
      } else {
        this.stopHeartbeat();
      }
    }, 30000); // Every 30 seconds
  },

  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  },

  /**
   * Connect to WebSocket server with JWT token
   * DISABLED: Temporarily disabled to prevent connection errors
   */
  async connect(token: string): Promise<ConnectionStatus> {
    // DISABLED: Online status WebSocket connection is temporarily disabled
    console.log('⚠️ [OnlineStatus] Connection disabled - returning without connecting');
    return { connected: false };
    
    /* DISABLED CODE - Uncomment to re-enable
    try {
      // Reset flags if stale (happens after background/foreground transition)
      if (isConnecting && !ws) {
        isConnecting = false;
      }

      if (isDisconnecting) {
        // Wait a bit for disconnect to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Store the auth token for reconnection
      authToken = token;
      
      // If already connected and active, don't reconnect
      if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
        console.log('✅ WebSocket already connected');
        return { connected: true };
      }

      isConnecting = true;

      // Get WebSocket URL (ws:// for development, wss:// for production)
      const wsUrl = this.getWebSocketUrl();
      
      console.log('🔌 [WebSocket] Connecting for online status...');
      console.log('   URL:', wsUrl);
      console.log('   Token:', token.substring(0, 20) + '...');

      // Close previous WebSocket if exists
      if (ws) {
        try {
          ws.close();
        } catch (error) {
          console.error('Error closing previous WebSocket:', error);
        }
        ws = null;
      }

      // OPTION 2: Create native WebSocket and send manual STOMP frames (like iOS)
      ws = new WebSocket(wsUrl);

      // WebSocket opened
      ws.onopen = () => {
        console.log('✅ [WebSocket] Connection opened successfully!');
        
      // Wait 500ms for handshake, then send STOMP CONNECT frame manually (matches iOS)
      setTimeout(() => {
        this.sendStompConnect(token);
      }, 500); // Half-second delay like iOS implementation
      };

      // WebSocket message received
      ws.onmessage = (event) => {
        console.log('📨 [WebSocket] Raw message received from server');
        console.log('   Event type:', typeof event);
        console.log('   Data type:', typeof event.data);
        console.log('   Data constructor:', (event.data as any)?.constructor?.name);
        
        let data: string;
        
        if (typeof event.data === 'string') {
          data = event.data;
          console.log('   Decoded from string, length:', data.length);
        } else if (event.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8');
          data = decoder.decode(event.data);
          console.log('   Decoded from ArrayBuffer, length:', data.length);
        } else if (event.data instanceof Blob) {
          // For Blob, we need to read it asynchronously
          console.log('   Received Blob, reading as text...');
          const reader = new FileReader();
          reader.onloadend = () => {
            const text = reader.result as string;
            console.log('   Blob decoded, length:', text.length);
            console.log('   Blob content:', text.substring(0, 100));
            this.handleStompFrame(text);
          };
          reader.readAsText(event.data);
          return;
        } else {
          // Try to convert
          try {
            data = String(event.data);
            console.log('   Converted to string, length:', data.length);
          } catch (e) {
            console.error('❌ Cannot decode message:', e);
            return;
          }
        }
        
        console.log('📨 [WebSocket] Decoded message:');
        console.log('   Length:', data.length);
        console.log('   First 100 chars:', data.substring(0, 100));
        
        this.handleStompFrame(data);
      };

      // WebSocket error
      ws.onerror = (error: any) => {
        isConnected = false;
        isConnecting = false;
      };

      // WebSocket closed
      ws.onclose = (event) => {
        console.log('❌ [WebSocket] Connection closed');
        console.log('   Close code:', event.code);
        console.log('   Close reason:', event.reason);
        console.log('   Was clean:', event.wasClean);
        console.log('   Close code meanings:');
        console.log('     1000 = Normal closure');
        console.log('     1001 = Going away');
        console.log('     1006 = Abnormal closure (no close frame)');
        console.log('     1002 = Protocol error');
        console.log('     1003 = Unsupported data');
        
        isConnected = false;
        this.stopHeartbeat();
        
        // If disconnected unexpectedly and we have a token, try to reconnect
        if (authToken && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
          console.log('🔄 [WebSocket] Attempting reconnection...');
          this.scheduleReconnect(authToken);
        } else {
          isConnecting = false;
        }
      };

      // Set a timeout to clear isConnecting flag if no response
      setTimeout(() => {
        if (!isConnected) {
          console.error('❌ [WebSocket] No CONNECTED response after 10 seconds');
          console.error('❌ [WebSocket] Check backend console for STOMP CONNECT logs');
          isConnecting = false;
        }
      }, 10000);

      return { connected: true };
    } catch (error) {
      console.error('❌ [WebSocket] Connection Error:', error);
      isConnecting = false;
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
    */ // END DISABLED CODE
  },

  /**
   * Disconnect from WebSocket server
   */
  async disconnect() {
    try {
      // Prevent concurrent disconnect operations
      if (isDisconnecting) {
        console.log('⚠️ [WebSocket] Already disconnecting...');
        return;
      }

      isDisconnecting = true;
      console.log('🔌 [WebSocket] Disconnecting...');
      
      // Stop any reconnection attempts
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Send STOMP DISCONNECT frame if connected
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          this.sendStompDisconnect();
          // Wait a moment for disconnect frame to be sent
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error sending DISCONNECT:', error);
        }
      }
      
      // Close WebSocket
      if (ws) {
        try {
          // Remove all event listeners to prevent errors
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          
          // Close the connection
          ws.close(1000); // Normal closure
        } catch (error) {
          // Ignore errors when closing
        } finally {
          ws = null; // Clear reference
        }
      }
      isConnected = false;
      isConnecting = false;
      authToken = null; // Clear token
      reconnectAttempts = 0; // Reset reconnection attempts
      this.stopHeartbeat();
      
      isDisconnecting = false;
    } catch (error) {
      isDisconnecting = false;
    }
  },

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return isConnected && ws !== null && ws.readyState === WebSocket.OPEN;
  },

  /**
   * Get WebSocket URL based on platform
   */
  getWebSocketUrl(): string {
    // Get base URL from API config
    let baseUrl = API_BASE_URL.replace('/api', '');
    
    console.log('🔍 [WebSocket] Original API_BASE_URL:', API_BASE_URL);
    console.log('🔍 [WebSocket] Base URL after /api removal:', baseUrl);
    console.log('🔍 [WebSocket] Platform:', Platform.OS);
    
    // Convert HTTP/HTTPS to WebSocket
    let wsUrl = baseUrl.replace('https://', 'wss://');
    wsUrl = wsUrl.replace('http://', 'ws://');
    
    // Use native WebSocket endpoint (not SockJS path)
    wsUrl = `${wsUrl}/ws`;
    
    console.log('🔍 [WebSocket] Final WebSocket URL:', wsUrl);
    
    return wsUrl;
  },


  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect(token: string) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    reconnectTimer = setTimeout(() => {
      this.connect(token);
    }, delay);
  },

  /**
   * Reconnect to WebSocket
   */
  async reconnect(token: string): Promise<ConnectionStatus> {
    await this.disconnect();
    return await this.connect(token);
  },
};

export default OnlineStatusService;

