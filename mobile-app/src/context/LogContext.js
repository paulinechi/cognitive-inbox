import React, { createContext, useState, useContext, useEffect } from 'react';

const LogContext = createContext();

export const LogProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);
    const [collections, setCollections] = useState([]);

    const getApiUrl = () => {
        const Constants = require('expo-constants').default;
        const debuggerHost = Constants.expoConfig?.hostUri;
        if (debuggerHost) {
            const host = debuggerHost.split(':').shift();
            return `http://${host}:8000`;
        }
        return 'http://localhost:8000';
    };

    // Fetch collections from API on mount
    useEffect(() => {
        fetchCollections();
        fetchLogs();
    }, []);

    const fetchCollections = async () => {
        try {
            const response = await fetch(`${getApiUrl()}/collections/`);
            if (response.ok) {
                const data = await response.json();
                setCollections(data);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    const addCollection = async (name) => {
        // Simple duplicate check
        if (collections.some(c => c.title.toLowerCase() === name.toLowerCase())) return;

        try {
            const response = await fetch(`${getApiUrl()}/collections/?title=${encodeURIComponent(name)}`, {
                method: 'POST',
            });

            if (response.ok) {
                const newCollection = await response.json();
                setCollections(prev => [...prev, newCollection]);
            }
        } catch (error) {
            console.error('Error creating collection:', error);
        }
    };

    const updateCollection = async (collectionId, newTitle) => {
        try {
            const response = await fetch(`${getApiUrl()}/collections/${collectionId}?title=${encodeURIComponent(newTitle)}`, {
                method: 'PUT',
            });

            if (response.ok) {
                const updatedCollection = await response.json();
                setCollections(prev => prev.map(c =>
                    c.id === collectionId ? updatedCollection : c
                ));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating collection:', error);
            return false;
        }
    };

    const addLog = (result, originalInput, mediaUri = null, mediaType = null) => {
        const apiUrl = getApiUrl();
        const newLog = {
            id: result.id || Date.now().toString(),
            types: result.memo_types || ["Other"],
            type: (result.memo_types && result.memo_types.length > 0) ? result.memo_types[0] : "Memo",
            summary: result.summary || originalInput,
            originalInput: originalInput,
            timestamp: new Date().toISOString(),
            action_items: result.action_items,
            tags: result.tags,
            emotional_tone: result.emotional_tone,
            mediaUri: mediaUri && mediaUri.startsWith('/') ? `${apiUrl}${mediaUri}` : mediaUri,
            mediaType: mediaType,
        };
        setCollections(prev => {
            // If the AI returned a new type that we don't have (rare but possible if hallucinated or added via other means), 
            // we could optionally add it. But for now, we rely on the explicit addCollection.
            // However, if the result.memo_type is NOT in our current collections, we should probably add it dynamically?
            // The user plan said: "User creates 'Cooking', AI uses 'Cooking'".
            // AI might return 'Cooking' even if we didn't explicitly add it if we passed it in tags.
            // Let's stick to explicit addCollection for now to avoid clutter from AI hallucinations, 
            // UNLESS it's a valid return from our passed tags.

            // Check if the type exists, if not, add it? 
            // Let's safe guard: If Type is not in Collections, add it.
            const exists = prev.some(c => c.type === newLog.type);
            if (!exists) {
                return [...prev, { id: newLog.type, title: newLog.type, type: newLog.type, isCustom: true }];
            }
            return prev;
        });

        setLogs(prev => [newLog, ...prev]);
        return newLog;
    };

    const deleteLog = async (id) => {
        try {
            const response = await fetch(`${getApiUrl()}/memos/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setLogs(prev => prev.filter(l => l.id !== id));
            } else {
                console.error('Failed to delete log');
            }
        } catch (error) {
            console.error('Error deleting log:', error);
        }
    };

    const deleteCollection = async (collectionId) => {
        try {
            const response = await fetch(`${getApiUrl()}/collections/${collectionId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Find the collection to get its type/title
                const collectionToDelete = collections.find(c => c.id === collectionId);
                const typeToDelete = collectionToDelete ? collectionToDelete.type : null;

                // Remove the collection from state
                setCollections(prev => prev.filter(c => c.id !== collectionId));

                // Remove all logs associated with this collection type
                if (typeToDelete) {
                    setLogs(prev => prev.filter(log => {
                        // Check if the log's primary type matches
                        if (log.type === typeToDelete) return false;
                        // Check if it's in the types array
                        if (log.types && log.types.includes(typeToDelete)) return false;
                        return true;
                    }));
                }
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/memos/`);
            if (response.ok) {
                const memos = await response.json();
                const formattedLogs = memos.map(memo => ({
                    id: memo.id,
                    types: memo.memo_types || ["Other"],
                    type: (memo.memo_types && memo.memo_types.length > 0) ? memo.memo_types[0] : "Other",
                    summary: memo.summary,
                    originalInput: memo.original_input,
                    timestamp: memo.updated_at || memo.created_at, // Use latest for timestamp
                    updatedAt: memo.updated_at || memo.created_at,
                    mediaType: memo.media_type,
                    mediaUri: memo.media_uri ? `${apiUrl}${memo.media_uri}` : null,
                    action_items: memo.action_items,
                    tags: memo.tags,
                    completed_action_items: memo.completed_action_items || [],
                }));
                setLogs(formattedLogs);
            }
        } catch (error) {
            console.error('Error fetching memos:', error);
        }
    };

    const updateLog = (memoId, updates) => {
        setLogs(prev => prev.map(log =>
            log.id === memoId
                ? { ...log, ...updates }
                : log
        ));
    };

    return (
        <LogContext.Provider value={{ logs, addLog, deleteLog, collections, addCollection, updateCollection, deleteCollection, fetchLogs, updateLog }}>
            {children}
        </LogContext.Provider>
    );
};

export const useLogs = () => useContext(LogContext);
