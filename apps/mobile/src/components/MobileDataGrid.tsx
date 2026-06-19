import React from 'react';
import { View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';

interface MobileDataGridProps {
  rowData: any[];
}

export const MobileDataGrid: React.FC<MobileDataGridProps> = ({ rowData }) => {
  if (rowData.length === 0) return <Text className="text-gray-400 p-4">No data</Text>;

  const columns = Object.keys(rowData[0]);

  const renderItem = ({ item }: { item: any }) => (
    <View className="border-b border-gray-800 p-3 bg-gray-900/50 rounded-lg mb-2">
      {columns.map(col => (
        <View key={col} className="flex-row justify-between mb-1">
          <Text className="text-gray-400 text-xs font-bold">{col}</Text>
          <Text className="text-white text-sm">{String(item[col])}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 w-full p-2">
      <FlashList
        data={rowData}
        renderItem={renderItem}
        estimatedItemSize={100}
      />
    </View>
  );
};
