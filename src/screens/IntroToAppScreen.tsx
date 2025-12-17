import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

interface IntroToAppScreenProps {
  onBack?: () => void;
}

// YouTube video data - Bonyad app introduction videos
const VIDEOS = [
  {
    id: 'IDzG49s0xOA', // https://youtube.com/shorts/IDzG49s0xOA
    title: 'Bonyad App Introduction - Part 1',
  },
  {
    id: 'XORyEQRqn5g', // https://youtu.be/XORyEQRqn5g
    title: 'Bonyad App Introduction - Part 2',
  },
  {
    id: '8MW12hrdi50', // https://youtube.com/shorts/8MW12hrdi50
    title: 'Bonyad App Introduction - Part 3',
  },
  {
    id: 'pGQ35MXPbyM', // https://youtube.com/shorts/pGQ35MXPbyM
    title: 'Bonyad App Introduction - Part 4',
  },
  {
    id: 'YwXbfME4Oks', // https://youtube.com/shorts/YwXbfME4Oks
    title: 'Bonyad App Introduction - Part 5',
  },
  {
    id: 'ZBVwKwo9skU', // https://youtube.com/shorts/ZBVwKwo9skU
    title: 'Bonyad App Introduction - Part 6',
  },
  {
    id: 'b6BGGeC9mW8', // https://youtube.com/shorts/b6BGGeC9mW8
    title: 'Bonyad App Introduction - Part 7',
  },
];

// Extract YouTube video ID from various URL formats (if needed)
const extractVideoId = (urlOrId: string): string => {
  // If it's already just an ID, return it
  if (!urlOrId.includes('youtube.com') && !urlOrId.includes('youtu.be')) {
    return urlOrId;
  }
  
  // Extract from various YouTube URL formats including Shorts
  const patterns = [
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/, // YouTube Shorts
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/, // Regular videos
  ];
  
  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return urlOrId;
};

export default function IntroToAppScreen({ onBack }: IntroToAppScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const screenWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  
  // Track which videos are expanded (can have multiple expanded)
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>({});
  
  // Handle video title click - expand only (no collapse)
  const handleVideoTitleClick = (videoId: string) => {
    if (!expandedVideos[videoId]) {
      // Expand video - once expanded, it stays expanded
      setExpandedVideos(prev => ({
        ...prev,
        [videoId]: true,
      }));
    }
  };
  
  // Calculate video width - responsive
  const videoWidth = isWeb 
    ? Math.min(800, screenWidth - 80) 
    : screenWidth - 40;
  const videoHeight = (videoWidth * 9) / 16; // 16:9 aspect ratio

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text, fontSize: scaledSize(16) }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>Intro to the App</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.introTitle, { color: colors.text, fontSize: scaledSize(24) }]}>Learn About Bonyad</Text>
          <Text style={[styles.introText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            Watch these videos to learn more about Bonyad and how to use our platform.
          </Text>
        </View>

        {VIDEOS.map((video, index) => {
          const isExpanded = expandedVideos[video.id];
          
          return (
            <View 
              key={`video-${video.id}-${index}`}
              style={[styles.accordionItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            >
              {/* Clickable title header - only clickable if not expanded */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleVideoTitleClick(video.id)}
                disabled={isExpanded}
                style={styles.accordionHeader}
              >
                <Text style={[styles.videoTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
                  {video.title}
                </Text>
                {!isExpanded && (
                  <Ionicons 
                    name="chevron-down" 
                    size={24} 
                    color={colors.text} 
                  />
                )}
              </TouchableOpacity>
              
              {/* Expanded content - video container */}
              {isExpanded && (
                <View style={styles.accordionContent}>
                  <View style={[styles.videoContainer, { width: videoWidth, height: videoHeight }]}>
                    <YoutubePlayer
                      height={videoHeight}
                      width={videoWidth}
                      videoId={extractVideoId(video.id)}
                      play={false}
                      webViewStyle={styles.youtubeWebView}
                      webViewProps={{
                        allowsFullscreenVideo: true,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 0,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
    alignItems: 'center',
  },
  introCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 800,
    gap: 12,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
  },
  accordionItem: {
    borderWidth: 1,
    borderRadius: 12,
    width: '100%',
    maxWidth: 800,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 18,
  },
  accordionContent: {
    padding: 20,
    paddingTop: 0,
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  youtubeWebView: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

