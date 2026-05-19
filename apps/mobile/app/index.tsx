import React from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useConnectionStore } from '@db-client/core';
import { Stack, useRouter } from 'expo-router';

export default function ConnectionListScreen() {
  const { connections } = useConnectionStore();
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#030014] p-4">
      <Stack.Screen 
        options={{ 
          title: 'Kết nối',
        }} 
      />
      <ScrollView className="flex-1">
        {connections.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-500 text-sm">Chưa có kết nối nào được tạo.</Text>
            <Text className="text-gray-600 text-xs mt-1">Vui lòng khởi tạo kết nối trên Desktop.</Text>
          </View>
        ) : (
          connections.map((conn) => (
            <TouchableOpacity 
              key={conn.id} 
              onPress={() => router.push(`/connection/${conn.id}`)}
              className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 active:bg-white/10"
            >
              <Text className="text-white text-base font-bold">{conn.name}</Text>
              <Text className="text-gray-400 text-xs mt-1">{conn.type.toUpperCase()} • {conn.host}:{conn.port}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
