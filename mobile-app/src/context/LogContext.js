import React, { createContext, useState, useContext } from 'react';

const LogContext = createContext();

export const LogProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);

    // Initial default collections
    const [collections, setCollections] = useState([
        { id: 'Wishlist', title: 'Wishlist', type: 'Wishlist' },
        { id: 'Task', title: 'Task', type: 'Task' },
        { id: 'Idea', title: 'Ideas', type: 'Idea' },
        { id: 'Reflection', title: 'Reflection', type: 'Reflection' },
        { id: 'Insight', title: 'Insight', type: 'Insight' },
        { id: 'Other', title: 'Other', type: 'Other' },
    ]);

    const addCollection = (name) => {
        // Simple duplicate check
        if (collections.some(c => c.title.toLowerCase() === name.toLowerCase())) return;

        const newCollection = {
            id: name,
            title: name,
            type: name, // Custom types use the name itself
            isCustom: true
        };
        setCollections(prev => [...prev, newCollection]);
    };

    const addLog = (result, originalInput, mediaUri = null, mediaType = null) => {
        const newLog = {
            id: result.id || Date.now().toString(),
            type: result.memo_type || "Memo",
            summary: result.summary || originalInput,
            originalInput: originalInput,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            action_items: result.action_items,
            tags: result.tags,
            emotional_tone: result.emotional_tone,
            mediaUri: mediaUri,
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

    const deleteLog = (id) => {
        setLogs(prev => prev.filter(l => l.id !== id));
    };

    const deleteCollection = (collectionId) => {
        // Remove the collection itself
        setCollections(prev => prev.filter(c => c.id !== collectionId));

        // Remove all logs associated with this collection type
        // Note: collectionId maps to 'type' in our logic for custom collections
        setLogs(prev => prev.filter(log => log.type !== collectionId));
    };

    return (
        <LogContext.Provider value={{ logs, addLog, deleteLog, collections, addCollection, deleteCollection }}>
            {children}
        </LogContext.Provider>
    );
};

export const useLogs = () => useContext(LogContext);
