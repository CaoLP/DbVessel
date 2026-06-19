import { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useConnectionStore } from '@db-client/core';
import { MobileEditor } from '../src/components/MobileEditor';
import { MobileDataGrid } from '../src/components/MobileDataGrid';
import { connect, executeQuery } from 'db-native';

export default function App() {
  const { connections } = useConnectionStore();
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectConnection = async (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    
    setIsLoading(true);
    setError(null);
    try {
      let connectionString = conn.type === 'sqlite' 
        ? `sqlite://${conn.name}.db?mode=rwc` 
        : `${conn.type}://${conn.user}@${conn.host}:${conn.port}`;
      
      const sessionId = await connect(conn.type, connectionString);
      setDbSessionId(sessionId);
      setActiveConnectionId(connId);
      setQueryResult([]);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!dbSessionId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await executeQuery(dbSessionId, query);
      const parsedRows = result.rows.map(r => JSON.parse(r));
      setQueryResult(parsedRows);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 p-4">
        {!activeConnectionId ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-bold mb-6">Select Connection</Text>
            {connections.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => handleSelectConnection(c.id)}
                className="bg-indigo-600 px-6 py-3 rounded-xl mb-4 w-full"
              >
                <Text className="text-white text-center font-bold text-base">{c.name}</Text>
              </TouchableOpacity>
            ))}
            {isLoading && <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />}
            {error && <Text className="text-red-400 mt-4">{error}</Text>}
          </View>
        ) : (
          <View className="flex-1">
            <View className="h-1/3 mb-4">
              <MobileEditor onExecute={handleExecuteQuery} isLoading={isLoading} />
            </View>
            <View className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
              {error && <Text className="text-red-400 p-4">{error}</Text>}
              <MobileDataGrid rowData={queryResult} />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
