// MQTT Chat Service - Real-time messaging via MQTT protocol (TCP)
import { Platform } from 'react-native';
import { ChatMessage } from '../types/chat';
import { storage } from '../utils/storage';

// Use mqtt.js for all platforms (Web, Android, iOS)
// mqtt.js supports TCP connections on all platforms
let mqtt: any = null;
let mqttLoadPromise: Promise<any> | null = null;

// Dynamically load mqtt
const loadMqtt = async (): Promise<any> => {
  if (mqtt) {
    return mqtt;
  }
  
  if (mqttLoadPromise) {
    return mqttLoadPromise;
  }
  
  mqttLoadPromise = (async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Import mqtt - try different import paths
        // mqtt.js v5 uses different export structure
        let mqttModule: any;
        
        // Import mqtt - try regular mqtt first (works better with bundlers)
        // mqtt/dist/mqtt can have export issues, so use regular mqtt import
        try {
          mqttModule = await import('mqtt');
          console.log('📦 [MQTT] Imported mqtt module');
        } catch (e: any) {
          // Fallback to mqtt/dist/mqtt if regular import fails
          console.warn('⚠️ [MQTT] mqtt failed, trying mqtt/dist/mqtt...');
          try {
            // @ts-ignore - mqtt/dist/mqtt works at runtime even if TypeScript complains
            mqttModule = await import('mqtt/dist/mqtt');
            console.log('📦 [MQTT] Imported mqtt/dist/mqtt module (fallback)');
          } catch (e2: any) {
            console.error('❌ [MQTT] Failed to import mqtt:', e2?.message);
            throw e2 || e;
          }
        }
        
        // mqtt/dist/mqtt exports the mqtt module as default
        // The structure is: { default: { connect: function, ... }, ... }
        // We need to extract the actual mqtt module from default
        
        // mqtt/dist/mqtt.js exports: exports8.default = mqtt (where mqtt is the full module)
        // So mqttModule.default should be the mqtt module object with connect method
        if (mqttModule.default) {
          // Default is the mqtt module object
          if (typeof mqttModule.default === 'object' && typeof mqttModule.default.connect === 'function') {
            // Perfect! default is the mqtt module with connect
            mqtt = mqttModule.default;
          } else if (typeof mqttModule.default === 'function') {
            // Default is the connect function itself
            mqtt = {
              connect: mqttModule.default,
            };
          } else {
            // Default is an object, use it
            mqtt = mqttModule.default;
          }
        } else if (mqttModule.connect && typeof mqttModule.connect === 'function') {
          // Named export connect
          mqtt = mqttModule;
        } else {
          // Use module as-is
          mqtt = mqttModule;
        }
        
        // Final verification
        if (mqtt && typeof mqtt.connect === 'function') {
          console.log('✅ [MQTT] Library loaded successfully (web)');
          return mqtt;
        } else {
          // Debug: Log the actual structure
          console.error('❌ [MQTT] connect function not found');
          console.error('❌ [MQTT] Full module:', mqttModule);
          console.error('❌ [MQTT] Default value:', mqttModule.default);
          if (mqttModule.default && typeof mqttModule.default === 'object') {
            console.error('❌ [MQTT] Default object keys:', Object.keys(mqttModule.default));
            console.error('❌ [MQTT] Default object sample:', Object.keys(mqttModule.default).slice(0, 20).reduce((acc: any, key) => {
              acc[key] = typeof mqttModule.default[key];
              return acc;
            }, {}));
          }
          console.error('❌ [MQTT] Module keys:', Object.keys(mqttModule));
          console.error('❌ [MQTT] mqtt object:', mqtt);
          console.error('❌ [MQTT] mqtt keys:', mqtt ? Object.keys(mqtt) : 'null');
          
          // Try one more fallback: use the module directly if it has connect
          if (mqttModule && typeof (mqttModule as any).connect === 'function') {
            console.log('✅ [MQTT] Found connect on module directly');
            mqtt = mqttModule as any;
            return mqtt;
          }
          
          throw new Error('mqtt.connect is not a function after import');
        }
      } else {
        // Native: Use require
        mqtt = require('mqtt');
        if (mqtt && typeof mqtt.connect === 'function') {
          console.log('✅ [MQTT] Library loaded successfully (native)');
          return mqtt;
        } else {
          throw new Error('mqtt.connect is not a function after require');
        }
      }
    } catch (e: any) {
      console.error('❌ [MQTT] Failed to load mqtt library:', e?.message || e);
      console.error('❌ [MQTT] Error stack:', e?.stack);
      console.error('❌ [MQTT] Please ensure mqtt is installed: npm install mqtt');
      mqtt = null;
      mqttLoadPromise = null;
      return null;
    }
  })();
  
  return mqttLoadPromise;
};

// Try to load mqtt immediately (non-blocking, won't crash if it fails)
// For web, we need to handle it differently
if (Platform.OS === 'web') {
  // Web: Will load on first use via async import
  console.log('ℹ️ [MQTT] Web platform - will load library on first use');
} else {
  // Native: Try to load synchronously
  try {
    mqtt = require('mqtt');
    // Verify it's the correct object
    if (mqtt && typeof mqtt.connect === 'function') {
      console.log('✅ [MQTT] Library pre-loaded successfully (native)');
    } else {
      console.warn('⚠️ [MQTT] Library loaded but connect method not found');
      mqtt = null;
    }
  } catch (e) {
    // Will load async later - this is fine
    console.log('ℹ️ [MQTT] Will load library on first use (native)');
  }
}

interface MessageCallback {
  (message: ChatMessage): void | Promise<void>;
}

interface ReadReceiptCallback {
  (messageId: number, isRead: boolean): void;
}

class MqttChatService {
  private client: any = null;
  private userId: number | null = null;
  private token: string | null = null;
  private messageCallbacks: Map<string, MessageCallback> = new Map();
  private readReceiptCallbacks: Map<string, ReadReceiptCallback> = new Map();
  private typingCallbacks: Map<string, (data: any) => void> = new Map();
  private isConnected: boolean = false;
  private currentRoomId: string | null = null;

  // MQTT Configuration - Matching Swift CocoaMQTT implementation
  // Host: www.bonyad-hub.com
  // Port: 1883 (TCP for native)
  // Port: 8084 (Secure WebSocket WSS for web - browsers can't use raw TCP)
  // Note: Web browsers cannot use raw TCP, so we use Secure WebSocket (WSS) for MQTT on web
  // The MQTT protocol is the same, just transported over Secure WebSocket instead of TCP
  private readonly HOST = 'www.bonyad-hub.com';
  private readonly PORT = 1883; // TCP port (for native, like Swift)
  private readonly WEB_PORT = 8084; // Secure WebSocket port (WSS for web)
  private readonly KEEP_ALIVE = 60; // KeepAlive: 60 (like Swift: keepAlive = 60)
  private readonly QOS_LEVEL = 1; // At least once delivery
  
  // Get broker URL based on platform
  // Web: Use Secure WebSocket on port 8084 (wss://www.bonyad-hub.com:8084)
  // Native: Use TCP on port 1883 (tcp://www.bonyad-hub.com:1883)
  private getBrokerUrl(): string {
    if (Platform.OS === 'web') {
      // Web: Use Secure WebSocket (WSS) on port 8084
      return `wss://${this.HOST}:${this.WEB_PORT}`;
    } else {
      // Native: Use TCP (like Swift CocoaMQTT: port 1883)
      return `tcp://${this.HOST}:${this.PORT}`;
    }
  }

  /**
   * Connect to MQTT broker
   */
  async connect(roomId: string): Promise<boolean> {
    // Try to load mqtt if not already loaded
    if (!mqtt) {
      try {
        const loaded = await loadMqtt();
        if (!loaded || !mqtt) {
          console.warn('⚠️ [MQTT] Library not available. MQTT features will be disabled.');
          console.warn('⚠️ [MQTT] Please install: npm install mqtt');
          return false;
        }
      } catch (e: any) {
        console.warn('⚠️ [MQTT] Failed to load library (non-critical):', e?.message || e);
        return false;
      }
    }

    if (this.isConnected && this.currentRoomId === roomId) {
      console.log('✅ MQTT already connected to this room');
      return true;
    }

    try {
      // Get user ID and token
      this.userId = await storage.getUserId();
      this.token = await storage.getAuthToken();

      if (!this.userId || !this.token) {
        console.error('❌ No user ID or token found');
        return false;
      }

      this.currentRoomId = roomId;

      // MQTT Options - Matching the provided example
      const clientID = `react-native-${this.userId}-${Date.now()}`;
      const options: any = {
        username: this.token, // JWT token as username
        reconnectPeriod: 2000, // Auto reconnect after 2 seconds
        keepalive: this.KEEP_ALIVE, // KeepAlive: 60
        clean: true, // Clean session
        connectTimeout: 30000,
        clientId: clientID, // Client ID
      };
      
      // Get connection URL based on platform
      const connectionUrl = this.getBrokerUrl();
      
      // For web, add protocol: "wss" and SSL options - IMPORTANT
      if (Platform.OS === 'web') {
        options.protocol = 'wss'; // Secure WebSocket
        options.rejectUnauthorized = true; // Verifies SSL certificate
      }
      
      console.log('🔌 [MQTT] Connecting to broker:');
      console.log('   Host:', this.HOST);
      console.log('   Port:', Platform.OS === 'web' ? this.WEB_PORT : this.PORT);
      console.log('   Protocol:', Platform.OS === 'web' ? 'Secure WebSocket (wss)' : 'TCP');
      console.log('   URL:', connectionUrl);
      console.log('   ClientID:', clientID);
      console.log('   Username:', this.token ? this.token.substring(0, 20) + '...' : 'none');
      console.log('   KeepAlive:', this.KEEP_ALIVE);
      console.log('   ReconnectPeriod: 2000ms');
      console.log('   Clean: true');
      if (Platform.OS === 'web') {
        console.log('   Protocol option: wss (Secure WebSocket)');
        console.log('   rejectUnauthorized: true (SSL certificate verification)');
      }
      console.log('   Platform:', Platform.OS);
      
      // Check if mqtt.connect exists
      if (!mqtt || typeof mqtt.connect !== 'function') {
        console.error('❌ [MQTT] mqtt.connect is not a function. mqtt object:', mqtt);
        console.error('❌ [MQTT] Available methods:', mqtt ? Object.keys(mqtt) : 'mqtt is null');
        throw new Error('MQTT library not properly loaded');
      }
      
      // Connect to MQTT broker
      // mqtt.js will handle the URL format (with or without trailing slash)
      this.client = mqtt.connect(connectionUrl, options);

      return new Promise((resolve) => {
        // Set up message handler before connecting
        this.client.on('message', (topic: string, message: Buffer) => {
          console.log('📨 [MQTT] Raw message received on topic:', topic);
          this.handleIncomingMessage(topic, message.toString());
        });

        this.client.on('connect', () => {
          console.log('✅ [MQTT] Connected successfully');
          this.isConnected = true;
          this.subscribeToUserTopics(this.userId!);
          // Subscribe to room - callbacks should already be set by subscribeToRoomWithCallbacks
          this.subscribeToRoom(roomId);
          resolve(true);
        });

        this.client.on('error', (error: any) => {
          console.error('❌ [MQTT] Connection error:', error);
          this.isConnected = false;
          resolve(false);
        });

        this.client.on('reconnect', () => {
          console.log('🔄 [MQTT] Reconnecting...');
        });

        this.client.on('close', () => {
          console.log('🔌 [MQTT] Connection closed');
          this.isConnected = false;
        });

        this.client.on('offline', () => {
          console.log('📴 [MQTT] Client offline');
          this.isConnected = false;
        });
      });
    } catch (error: any) {
      console.error('❌ [MQTT] Failed to connect:', error);
      return false;
    }
  }

  /**
   * Subscribe to user-specific topics
   */
  private subscribeToUserTopics(userId: number) {
    if (!this.client?.connected) return;

    const userTopic = `chat/user/${userId}`;
    this.client.subscribe(userTopic, { qos: this.QOS_LEVEL }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${userTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${userTopic}`);
      }
    });
  }

  /**
   * Subscribe to room-specific topics
   */
  subscribeToRoom(roomId: string, callbacks?: {
    onMessage?: MessageCallback;
    onReadReceipt?: ReadReceiptCallback;
    onTyping?: (data: any) => void;
  }) {
    if (!this.client?.connected) {
      console.warn('⚠️ [MQTT] Client not connected. Cannot subscribe to room.');
      return;
    }

    const roomTopic = `chat/room/${roomId}`;
    const readTopic = `chat/room/${roomId}/read`;
    const typingTopic = `chat/room/${roomId}/typing`;

    // Subscribe to room messages
    this.client.subscribe(roomTopic, { qos: this.QOS_LEVEL }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${roomTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${roomTopic}`);
        // Set callback if provided, otherwise use existing callback if any
        if (callbacks?.onMessage) {
          this.messageCallbacks.set(roomTopic, callbacks.onMessage);
          console.log(`✅ [MQTT] Callback set for ${roomTopic}`);
        } else if (!this.messageCallbacks.has(roomTopic)) {
          console.warn(`⚠️ [MQTT] No callback set for ${roomTopic} - messages may not be handled`);
        }
      }
    });

    // Subscribe to read receipts
    this.client.subscribe(readTopic, { qos: this.QOS_LEVEL }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${readTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${readTopic}`);
        if (callbacks?.onReadReceipt) {
          this.readReceiptCallbacks.set(readTopic, callbacks.onReadReceipt);
          console.log(`✅ [MQTT] Callback set for ${readTopic}`);
        }
      }
    });

    // Subscribe to typing indicators
    this.client.subscribe(typingTopic, { qos: 0 }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${typingTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${typingTopic}`);
        if (callbacks?.onTyping) {
          this.typingCallbacks.set(typingTopic, callbacks.onTyping);
          console.log(`✅ [MQTT] Callback set for ${typingTopic}`);
        }
      }
    });
  }

  /**
   * Subscribe to room with callbacks (convenience method)
   */
  async subscribeToRoomWithCallbacks(roomId: string, callbacks: {
    onMessage?: MessageCallback;
    onReadReceipt?: ReadReceiptCallback;
    onTyping?: (data: any) => void;
  }): Promise<boolean> {
    // Set callbacks FIRST before connecting/subscribing
    // This ensures callbacks are available when messages arrive
    const roomTopic = `chat/room/${roomId}`;
    const readTopic = `chat/room/${roomId}/read`;
    const typingTopic = `chat/room/${roomId}/typing`;

    if (callbacks.onMessage) {
      this.messageCallbacks.set(roomTopic, callbacks.onMessage);
      console.log(`✅ [MQTT] Callback set for ${roomTopic}`);
    }
    if (callbacks.onReadReceipt) {
      this.readReceiptCallbacks.set(readTopic, callbacks.onReadReceipt);
      console.log(`✅ [MQTT] Callback set for ${readTopic}`);
    }
    if (callbacks.onTyping) {
      this.typingCallbacks.set(typingTopic, callbacks.onTyping);
      console.log(`✅ [MQTT] Callback set for ${typingTopic}`);
    }

    // Connect if not connected or different room
    if (!this.isConnected || this.currentRoomId !== roomId) {
      this.currentRoomId = roomId;
      const connected = await this.connect(roomId);
      if (!connected) {
        console.error('❌ [MQTT] Failed to connect');
        return false;
      }
    } else {
      // Already connected to this room, just ensure subscription
      console.log('✅ [MQTT] Already connected, ensuring subscription');
      this.subscribeToRoom(roomId, callbacks);
    }

    return true;
  }

  /**
   * Unsubscribe from room topics
   */
  unsubscribeFromRoom(roomId: string) {
    if (!this.client?.connected) return;

    const roomTopic = `chat/room/${roomId}`;
    const readTopic = `chat/room/${roomId}/read`;
    const typingTopic = `chat/room/${roomId}/typing`;

    this.client.unsubscribe([roomTopic, readTopic, typingTopic], (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to unsubscribe from room ${roomId}:`, err);
      } else {
        console.log(`✅ [MQTT] Unsubscribed from room ${roomId}`);
        this.messageCallbacks.delete(roomTopic);
        this.readReceiptCallbacks.delete(readTopic);
        this.typingCallbacks.delete(typingTopic);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleIncomingMessage(topic: string, payload: string) {
    try {
      console.log('📨 [MQTT] Handling message on topic:', topic);
      const data = JSON.parse(payload);
      console.log('📨 [MQTT] Parsed data:', data);

      // Check if it's a message
      if (topic.startsWith('chat/user/') || topic.startsWith('chat/room/')) {
        if (topic.includes('/read')) {
          // Read receipt
          const callback = this.readReceiptCallbacks.get(topic);
          console.log('✓✓ [MQTT] Read receipt callback:', callback ? 'found' : 'not found');
          if (callback) {
            callback(data.messageId, data.isRead);
          }
        } else if (topic.includes('/typing')) {
          // Typing indicator
          const callback = this.typingCallbacks.get(topic);
          if (callback) {
            callback(data);
          }
        } else {
          // Chat message
          const callback = this.messageCallbacks.get(topic);
          console.log('📨 [MQTT] Message callback for', topic, ':', callback ? 'found' : 'NOT FOUND');
          console.log('📨 [MQTT] Available callbacks:', Array.from(this.messageCallbacks.keys()));
          if (callback) {
            callback(data as ChatMessage);
          } else {
            console.warn('⚠️ [MQTT] No callback registered for topic:', topic);
          }
        }
      }
    } catch (error) {
      console.error('❌ [MQTT] Failed to parse message:', error);
      console.error('❌ [MQTT] Payload:', payload);
    }
  }

  /**
   * Publish typing indicator
   */
  publishTyping(roomId: string, userId: number, userName: string, isTyping: boolean) {
    if (!this.client?.connected) return;

    const topic = `chat/room/${roomId}/typing`;
    const payload = JSON.stringify({
      userId,
      userName,
      isTyping,
    });

    this.client.publish(topic, payload, { qos: 0 }, (err: any) => {
      if (err) {
        console.error('❌ [MQTT] Failed to publish typing indicator:', err);
      }
    });
  }

  /**
   * Set callbacks for room messages
   */
  setCallbacks(callbacks: {
    onMessage?: MessageCallback;
    onReadReceipt?: ReadReceiptCallback;
    onTyping?: (data: any) => void;
  }) {
    if (callbacks.onMessage) {
      // Store callback for current room
      if (this.currentRoomId) {
        const roomTopic = `chat/room/${this.currentRoomId}`;
        this.messageCallbacks.set(roomTopic, callbacks.onMessage);
      }
    }
    if (callbacks.onReadReceipt) {
      if (this.currentRoomId) {
        const readTopic = `chat/room/${this.currentRoomId}/read`;
        this.readReceiptCallbacks.set(readTopic, callbacks.onReadReceipt);
      }
    }
    if (callbacks.onTyping) {
      if (this.currentRoomId) {
        const typingTopic = `chat/room/${this.currentRoomId}/typing`;
        this.typingCallbacks.set(typingTopic, callbacks.onTyping);
      }
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect() {
    if (this.client?.connected) {
      this.client.end();
      console.log('🔌 [MQTT] Disconnected');
    }
    this.client = null;
    this.isConnected = false;
    this.currentRoomId = null;
    this.messageCallbacks.clear();
    this.readReceiptCallbacks.clear();
    this.typingCallbacks.clear();
  }

  /**
   * Check if connected
   */
  isCurrentlyConnected(): boolean {
    return this.isConnected && this.client?.connected;
  }
}

export default new MqttChatService();

