// For now, this is a mock implementation until native code is fully hooked up.
export async function connect(dbType: string, connectionString: string): Promise<string> {
    return "mock-mobile-id";
}

export async function disconnect(connectionId: string): Promise<void> {
    return;
}

export async function executeQuery(connectionId: string, query: string): Promise<{rows: string[], affected_rows: number}> {
    return { rows: [], affected_rows: 0 };
}
