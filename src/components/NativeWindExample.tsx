/**
 * NativeWind Example Component
 * 
 * This component demonstrates how to use NativeWind (Tailwind CSS) in your React Native app.
 * You can use this as a reference when migrating your components.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NativeWindExample() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header Section */}
      <View className="bg-primary-500 p-6 rounded-b-3xl shadow-lg">
        <Text className="text-white text-3xl font-bold mb-2">
          NativeWind Example
        </Text>
        <Text className="text-primary-100 text-base">
          Tailwind CSS for React Native
        </Text>
      </View>

      {/* Content Section */}
      <View className="p-4">
        {/* Card Example */}
        <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
          <View className="flex-row items-center mb-4">
            <View className="bg-primary-100 w-12 h-12 rounded-full items-center justify-center mr-3">
              <Ionicons name="star" size={24} color="#0080FF" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 text-lg font-bold">
                Professional Styling
              </Text>
              <Text className="text-gray-500 text-sm">
                Using Tailwind CSS classes
              </Text>
            </View>
          </View>
          
          <Text className="text-gray-700 text-base leading-6 mb-4">
            NativeWind allows you to use Tailwind CSS utility classes directly
            in your React Native components, making styling faster and more consistent.
          </Text>
        </View>

        {/* Button Examples */}
        <View className="space-y-3 mb-4">
          <TouchableOpacity className="bg-primary-500 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-md">
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold text-base ml-2">
              Primary Button
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-secondary-500 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-md">
            <Ionicons name="heart" size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold text-base ml-2">
              Secondary Button
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-danger-500 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-md">
            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold text-base ml-2">
              Danger Button
            </Text>
          </TouchableOpacity>
        </View>

        {/* Badge Examples */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          <View className="bg-primary-100 px-4 py-2 rounded-full">
            <Text className="text-primary-700 font-medium text-sm">
              Primary Badge
            </Text>
          </View>
          <View className="bg-secondary-100 px-4 py-2 rounded-full">
            <Text className="text-secondary-700 font-medium text-sm">
              Secondary Badge
            </Text>
          </View>
          <View className="bg-warning-100 px-4 py-2 rounded-full">
            <Text className="text-warning-700 font-medium text-sm">
              Warning Badge
            </Text>
          </View>
        </View>

        {/* Responsive Example (Web) */}
        <View className="bg-white rounded-2xl p-6 shadow-md">
          <Text className="text-gray-900 text-lg font-bold mb-2">
            Responsive Design
          </Text>
          <Text className="text-gray-600 text-sm mb-4">
            This text adapts to screen size on web
          </Text>
          <View className="bg-gray-100 p-4 rounded-lg">
            <Text className="text-xs md:text-sm lg:text-base text-gray-700">
              Responsive text that changes size based on screen width
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

