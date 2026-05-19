import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useConnectionStore } from '@db-client/core';

export default function ConnectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { connections } = useConnectionStore();
  const connection = connections.find(c => c.id === id);

  return (
    <View className="flex-1 bg-[#030014] p-4 justify-center items-center">
      <Stack.Screen 
        options={{ 
          title: connection?.name || 'Chi tiết kết nối',
        }} 
      />
      {connection ? (
        <View className="bg-white/5 border border-white/10 rounded-xl p-6 w-full items-center">
          <Text className="text-white text-xl font-bold mb-2">{connection.name}</Text>
          <Text className="text-indigo-400 text-sm font-semibold mb-4">{connection.type.toUpperCase()}</Text>
          <View className="w-full space-y-2">
            <Text className="text-gray-400 text-xs">Host: <Text className="text-white">{connection.host}</Text></Text>
            <Text className="text-gray-400 text-xs">Port: <Text className="text-white">{connection.port}</Text></Text>
            <Text className="text-gray-400 text-xs">User: <Text className="text-white">{connection.user}</Text></Text>
          </View>
        </View>
      ) : (
        <Text className="text-red-400">Không tìm thấy thông tin kết nối.</Text>
      )}
    </View>
  );
}
