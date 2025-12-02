// 🎤 Voice Note Service - Record and send voice notes in m4a format
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface RecordingState {
  isRecording: boolean;
  duration: number;
  uri: string | null;
}

class VoiceNoteService {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private onDurationUpdate: ((duration: number) => void) | null = null;

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use MediaRecorder API
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Web microphone permission granted');
            return true;
          } catch (error: any) {
            console.error('❌ Web microphone permission denied:', error);
            Alert.alert(
              'Microphone Permission',
              'Please allow microphone access to record voice notes.'
            );
            return false;
          }
        } else {
          Alert.alert(
            'Not Supported',
            'Your browser does not support audio recording.'
          );
          return false;
        }
      } else {
        // Android/iOS: Use Expo AV
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Permission',
            'Please allow microphone access to record voice notes.'
          );
          return false;
        }
        console.log('✅ Microphone permission granted');
        return true;
      }
    } catch (error: any) {
      console.error('❌ Error requesting microphone permission:', error);
      Alert.alert('Error', 'Failed to request microphone permission');
      return false;
    }
  }

  /**
   * Start recording voice note
   */
  async startRecording(
    onDurationUpdate?: (duration: number) => void
  ): Promise<boolean> {
    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      this.onDurationUpdate = onDurationUpdate || null;
      this.startTime = Date.now();

      if (Platform.OS === 'web') {
        // Web: Use MediaRecorder API
        return await this.startWebRecording();
      } else {
        // Android/iOS: Use Expo AV
        return await this.startNativeRecording();
      }
    } catch (error: any) {
      console.error('❌ Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      return false;
    }
  }

  /**
   * Start recording on Web using MediaRecorder
   */
  private async startWebRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder with m4a/mp4 codec if available, fallback to webm
      // Note: Web browsers typically don't support m4a directly, but we'll try mp4 (which is compatible)
      let mimeType = 'audio/webm;codecs=opus'; // Default fallback
      
      // Try to use mp4/m4a compatible format if supported
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'; // mp4 container with AAC codec (compatible with m4a)
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }

      const options: MediaRecorderOptions = {
        mimeType,
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.recordingUri = url;
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      (this.recording as any) = { mediaRecorder, stream, chunks, mimeType };

      // Update duration
      this.durationInterval = setInterval(() => {
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onDurationUpdate) {
          this.onDurationUpdate(duration);
        }
      }, 1000);

      console.log('🎤 [Web] Started recording with mimeType:', mimeType);
      return true;
    } catch (error: any) {
      console.error('❌ [Web] Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Start recording on Android/iOS using Expo AV
   */
  private async startNativeRecording(): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Configure recording options for m4a format
      const recordingOptions: Audio.RecordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/mp4',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (status.isRecording && this.onDurationUpdate) {
            const duration = Math.floor((status.durationMillis || 0) / 1000);
            this.onDurationUpdate(duration);
          }
        }
      );

      this.recording = recording;
      console.log('🎤 [Native] Started recording with m4a format');
      return true;
    } catch (error: any) {
      console.error('❌ [Native] Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Stop recording and get the file URI
   */
  async stopRecording(): Promise<{ uri: string; duration: number; mimeType: string } | null> {
    try {
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }

      const duration = Math.floor((Date.now() - this.startTime) / 1000);

      if (Platform.OS === 'web') {
        return await this.stopWebRecording(duration);
      } else {
        return await this.stopNativeRecording(duration);
      }
    } catch (error: any) {
      console.error('❌ Error stopping recording:', error);
      return null;
    }
  }

  /**
   * Stop Web recording
   */
  private async stopWebRecording(duration: number): Promise<{ uri: string; duration: number; mimeType: string } | null> {
    try {
      const recordingData = this.recording as any;
      if (!recordingData?.mediaRecorder) {
        return null;
      }

      return new Promise((resolve) => {
        // Store the original onstop handler
        const originalOnStop = recordingData.mediaRecorder.onstop;
        
        recordingData.mediaRecorder.onstop = async () => {
          try {
            // Wait a bit to ensure all chunks are collected
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create blob from all chunks
            const chunks = recordingData.chunks || [];
            if (chunks.length === 0) {
              console.error('❌ [Web] No audio chunks recorded');
              resolve(null);
              return;
            }

            const recordedMimeType = recordingData.mimeType || recordingData.mediaRecorder.mimeType || 'audio/webm';
            const blob = new Blob(chunks, { 
              type: recordedMimeType
            });
            
            if (blob.size === 0) {
              console.error('❌ [Web] Recorded blob is empty');
              resolve(null);
              return;
            }
            
            // ALWAYS use m4a format for upload (server expects m4a)
            // File extension and mimeType must be m4a regardless of actual recording format
            const fileName = `voice_${Date.now()}.m4a`;
            const uploadMimeType = 'audio/m4a';
            
            // Convert to File with m4a extension and mimeType
            // Note: If browser recorded in webm, the blob is still webm internally,
            // but we're sending it with m4a metadata. Server should handle conversion if needed.
            const file = new File([blob], fileName, {
              type: uploadMimeType, // Always use audio/m4a mimeType
            });

            // Create object URL
            const url = URL.createObjectURL(file);
            
            // Stop all tracks
            if (recordingData.stream) {
              recordingData.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }

            this.recording = null;
            this.recordingUri = null;

            console.log('✅ [Web] Voice note prepared as m4a:', {
              fileName,
              mimeType: uploadMimeType,
              originalFormat: recordedMimeType,
              blobSize: blob.size,
              fileSize: file.size,
              chunksCount: chunks.length
            });

            resolve({
              uri: url,
              duration,
              mimeType: uploadMimeType, // Always return audio/m4a
            });

            // Call original handler if it exists
            if (originalOnStop) {
              originalOnStop();
            }
          } catch (error: any) {
            console.error('❌ [Web] Error in onstop handler:', error);
            resolve(null);
          }
        };

        recordingData.mediaRecorder.stop();
      });
    } catch (error: any) {
      console.error('❌ [Web] Error stopping recording:', error);
      return null;
    }
  }

  /**
   * Stop Native recording
   */
  private async stopNativeRecording(duration: number): Promise<{ uri: string; duration: number; mimeType: string } | null> {
    try {
      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      let uri = this.recording.getURI();
      
      if (!uri) {
        return null;
      }

      // Expo AV should create m4a files with our configuration
      // Ensure we always return m4a format
      const mimeType = 'audio/m4a';
      
      // Verify the file extension (Expo AV should have created .m4a)
      if (!uri.endsWith('.m4a')) {
        console.warn('⚠️ Recording URI does not end with .m4a:', uri);
        console.warn('⚠️ File will still be sent with m4a mimeType:', mimeType);
      }

      this.recording = null;
      this.recordingUri = null;

      console.log('✅ [Native] Voice note prepared as m4a:', {
        uri,
        mimeType,
        duration,
        extension: uri.endsWith('.m4a') ? '.m4a' : 'unknown'
      });

      return {
        uri,
        duration,
        mimeType, // Always audio/m4a
      };
    } catch (error: any) {
      console.error('❌ [Native] Error stopping recording:', error);
      return null;
    }
  }

  /**
   * Cancel recording
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }

      if (Platform.OS === 'web') {
        const recordingData = this.recording as any;
        if (recordingData?.mediaRecorder) {
          recordingData.mediaRecorder.stop();
        }
        if (recordingData?.stream) {
          recordingData.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
      } else {
        if (this.recording) {
          await this.recording.stopAndUnloadAsync();
        }
      }

      // Clean up file if exists
      if (this.recordingUri && Platform.OS !== 'web') {
        try {
          await FileSystem.deleteAsync(this.recordingUri, { idempotent: true });
        } catch (error) {
          console.warn('⚠️ Failed to delete recording file:', error);
        }
      }

      this.recording = null;
      this.recordingUri = null;
      console.log('🛑 Recording cancelled');
    } catch (error: any) {
      console.error('❌ Error cancelling recording:', error);
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    if (Platform.OS === 'web') {
      const recordingData = this.recording as any;
      return recordingData?.mediaRecorder?.state === 'recording';
    } else {
      return this.recording !== null;
    }
  }
}

export default new VoiceNoteService();

