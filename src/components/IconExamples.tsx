import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  FontAwesome5,
  Feather,
  AntDesign,
  Entypo,
  EvilIcons,
  SimpleLineIcons,
  Octicons,
  Foundation,
} from '@expo/vector-icons';

/**
 * 🎨 Icon Examples Component
 * Demonstrates all available icon libraries in @expo/vector-icons
 */
export default function IconExamples() {
  const iconSize = 28;
  const iconColor = '#0080E0';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Available Icon Libraries</Text>

      {/* Ionicons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ionicons (iOS-style)</Text>
        <View style={styles.iconRow}>
          <Ionicons name="home" size={iconSize} color={iconColor} />
          <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
          <Ionicons name="person-circle-outline" size={iconSize} color={iconColor} />
          <Ionicons name="settings-outline" size={iconSize} color={iconColor} />
          <Ionicons name="search" size={iconSize} color={iconColor} />
          <Ionicons name="heart" size={iconSize} color={iconColor} />
          <Ionicons name="mail-outline" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* Material Icons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Material Icons</Text>
        <View style={styles.iconRow}>
          <MaterialIcons name="dashboard" size={iconSize} color={iconColor} />
          <MaterialIcons name="notifications" size={iconSize} color={iconColor} />
          <MaterialIcons name="account-circle" size={iconSize} color={iconColor} />
          <MaterialIcons name="settings" size={iconSize} color={iconColor} />
          <MaterialIcons name="search" size={iconSize} color={iconColor} />
          <MaterialIcons name="favorite" size={iconSize} color={iconColor} />
          <MaterialIcons name="email" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* Material Community Icons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Material Community Icons</Text>
        <View style={styles.iconRow}>
          <MaterialCommunityIcons name="home-variant" size={iconSize} color={iconColor} />
          <MaterialCommunityIcons name="bell-outline" size={iconSize} color={iconColor} />
          <MaterialCommunityIcons name="account-circle-outline" size={iconSize} color={iconColor} />
          <MaterialCommunityIcons name="cog-outline" size={iconSize} color={iconColor} />
          <MaterialCommunityIcons name="magnify" size={iconSize} color={iconColor} />
          <MaterialCommunityIcons name="heart-outline" size={iconSize} color={iconColor} />
          <MaterialCommunityIcons name="email-outline" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* FontAwesome 5 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FontAwesome 5</Text>
        <View style={styles.iconRow}>
          <FontAwesome5 name="home" size={iconSize} color={iconColor} />
          <FontAwesome5 name="bell" size={iconSize} color={iconColor} />
          <FontAwesome5 name="user-circle" size={iconSize} color={iconColor} />
          <FontAwesome5 name="cog" size={iconSize} color={iconColor} />
          <FontAwesome5 name="search" size={iconSize} color={iconColor} />
          <FontAwesome5 name="heart" size={iconSize} color={iconColor} />
          <FontAwesome5 name="envelope" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* Feather */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feather (Clean & Simple)</Text>
        <View style={styles.iconRow}>
          <Feather name="home" size={iconSize} color={iconColor} />
          <Feather name="bell" size={iconSize} color={iconColor} />
          <Feather name="user" size={iconSize} color={iconColor} />
          <Feather name="settings" size={iconSize} color={iconColor} />
          <Feather name="search" size={iconSize} color={iconColor} />
          <Feather name="heart" size={iconSize} color={iconColor} />
          <Feather name="mail" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* AntDesign */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AntDesign</Text>
        <View style={styles.iconRow}>
          <AntDesign name="home" size={iconSize} color={iconColor} />
          <AntDesign name="notification" size={iconSize} color={iconColor} />
          <AntDesign name="user" size={iconSize} color={iconColor} />
          <AntDesign name="setting" size={iconSize} color={iconColor} />
          <AntDesign name="search1" size={iconSize} color={iconColor} />
          <AntDesign name="heart" size={iconSize} color={iconColor} />
          <AntDesign name="mail" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* Entypo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entypo</Text>
        <View style={styles.iconRow}>
          <Entypo name="home" size={iconSize} color={iconColor} />
          <Entypo name="bell" size={iconSize} color={iconColor} />
          <Entypo name="user" size={iconSize} color={iconColor} />
          <Entypo name="cog" size={iconSize} color={iconColor} />
          <Entypo name="magnifying-glass" size={iconSize} color={iconColor} />
          <Entypo name="heart" size={iconSize} color={iconColor} />
          <Entypo name="mail" size={iconSize} color={iconColor} />
        </View>
      </View>

      {/* Simple Line Icons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simple Line Icons</Text>
        <View style={styles.iconRow}>
          <SimpleLineIcons name="home" size={iconSize} color={iconColor} />
          <SimpleLineIcons name="bell" size={iconSize} color={iconColor} />
          <SimpleLineIcons name="user" size={iconSize} color={iconColor} />
          <SimpleLineIcons name="settings" size={iconSize} color={iconColor} />
          <SimpleLineIcons name="magnifier" size={iconSize} color={iconColor} />
          <SimpleLineIcons name="heart" size={iconSize} color={iconColor} />
          <SimpleLineIcons name="envelope" size={iconSize} color={iconColor} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Browse all icons at: https://icons.expo.fyi/
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0080E0',
    marginBottom: 12,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'flex-start',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#E0F2FF',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#0080E0',
    textAlign: 'center',
  },
});

