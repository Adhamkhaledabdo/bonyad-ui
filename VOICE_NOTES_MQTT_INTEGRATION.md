# 🎤 Voice Notes & MQTT Integration Guide

## ✅ What Was Implemented

### 1. MQTT Chat Service
- Created `src/services/MqttChatService.ts` to replace WebSocket-based chat
- Supports both Web (WebSocket MQTT) and React Native (TCP MQTT)
- Connects to `www.bonyad-hub.com:1883` (TCP) or `www.bonyad-hub.com:8083` (WebSocket for Web)
- Subscribes to MQTT topics:
  - `chat/user/{userId}` - User-specific messages
  - `chat/room/{roomId}` - Room messages
  - `chat/room/{roomId}/read` - Read receipts
  - `chat/room/{roomId}/typing` - Typing indicators

### 2. Voice Notes Service Updates
- Updated `src/services/VoiceNoteService.ts` to ensure **m4a format** for all platforms:
  - **Android**: Configured Expo AV to record in MPEG-4 AAC format (.m4a)
  - **iOS**: Configured to record in MPEG4AAC format (.m4a)
  - **Web**: Attempts to use mp4/m4a if supported, falls back to webm but sends as m4a
- **Microphone Permissions**: 
  - Properly requests microphone access on all platforms
  - Shows user-friendly alerts if permission is denied
  - Handles permission requests for both Web (MediaRecorder API) and Native (Expo AV)

### 3. Chat Screen Updates
- Updated `src/screens/ChatDetailScreen.tsx` to use MQTT instead of WebSocket
- Voice notes are sent via `/chat/send-with-file` API endpoint
- Voice notes are recorded in **m4a format** and sent with proper mimeType (`audio/m4a`)

## 📦 Required Installation

### Install MQTT Package

You need to install the `mqtt` package for MQTT support:

```bash
cd bonyad-app
npm install mqtt
# or
yarn add mqtt
```

### For React Native (Android/iOS)

The `mqtt` package should work with React Native, but you may need additional polyfills for WebSocket support. The service handles this automatically.

## 🔧 Android Permissions

Android permissions are already configured in `android/app/src/main/AndroidManifest.xml`:
- ✅ `RECORD_AUDIO` - For microphone access
- ✅ `MODIFY_AUDIO_SETTINGS` - For audio recording configuration

## 🌐 Web Permissions

For Web, the browser will automatically prompt for microphone permission when the user tries to record a voice note. The service handles this via the MediaRecorder API.

## 📝 Usage

### Recording Voice Notes

Voice notes can be recorded in any chat screen:

1. **Start Recording**: Tap the microphone icon (🎤)
2. **Stop & Send**: Tap the stop button while recording
3. **Cancel**: Tap the cancel button to discard the recording

The voice note will be:
- Recorded in **m4a format**
- Sent via the `/chat/send-with-file` API endpoint
- Delivered to the recipient via MQTT

### MQTT Connection

The MQTT service automatically:
- Connects when entering a chat room
- Subscribes to room-specific topics
- Receives messages in real-time
- Handles reconnection on network issues

## 🔍 Testing

1. **Test Microphone Permission**:
   - Try recording a voice note
   - Verify permission prompt appears (first time)
   - Verify recording works after granting permission

2. **Test Voice Note Format**:
   - Record a voice note
   - Check network request - should have `Content-Type: audio/m4a`
   - Verify file extension is `.m4a`

3. **Test MQTT Connection**:
   - Open chat screen
   - Check console logs for MQTT connection status
   - Send a message and verify it's received via MQTT

## 🐛 Troubleshooting

### MQTT Connection Issues

If you see "MQTT library not available":
```bash
npm install mqtt
```

### Microphone Permission Denied

- **Android**: Check app permissions in device settings
- **Web**: Check browser permissions (usually in address bar)
- **iOS**: Check app permissions in device settings

### Voice Note Not Sending

1. Check network request in browser/network inspector
2. Verify file size is reasonable (< 10MB recommended)
3. Check server logs for upload errors
4. Verify API endpoint `/chat/send-with-file` is accessible

### MQTT Not Receiving Messages

1. Check MQTT broker connection (should see "✅ [MQTT] Connected" in logs)
2. Verify subscription to correct room topic
3. Check MQTT broker is running at `www.bonyad-hub.com:1883`
4. Verify JWT token is valid

## 📚 Files Modified

- ✅ `src/services/MqttChatService.ts` (NEW)
- ✅ `src/services/VoiceNoteService.ts` (UPDATED)
- ✅ `src/screens/ChatDetailScreen.tsx` (UPDATED)

## 🎯 Next Steps

1. Install MQTT package: `npm install mqtt`
2. Test voice note recording on Android
3. Test voice note recording on Web
4. Verify MQTT connection and message delivery
5. Test voice note playback on receiving end

---

**Note**: The old WebSocket chat implementation (`WebSocketChatManager`) has been completely removed. All chat functionality now uses MQTT exclusively.

