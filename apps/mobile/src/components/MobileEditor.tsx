import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Play } from 'iconsax-react-native';

interface MobileEditorProps {
  onExecute: (query: string) => void;
  isLoading: boolean;
}

export const MobileEditor: React.FC<MobileEditorProps> = ({ onExecute, isLoading }) => {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');

  return (
    <View className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <View className="flex-row justify-between items-center bg-black px-4 py-2 border-b border-gray-800">
        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">SQL Editor</Text>
        <TouchableOpacity 
          onPress={() => onExecute(query)}
          disabled={isLoading}
          className="flex-row items-center bg-green-900/40 px-3 py-1.5 rounded-lg"
        >
          <Play size={16} color="#4ade80" variant="Bold" />
          <Text className="text-green-400 font-bold ml-1 text-xs">Run</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        className="flex-1 text-white p-4 font-mono text-sm"
        multiline
        value={query}
        onChangeText={setQuery}
        textAlignVertical="top"
        placeholder="Enter SQL Query..."
        placeholderTextColor="#666"
      />
    </View>
  );
};
