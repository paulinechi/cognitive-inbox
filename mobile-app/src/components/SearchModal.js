import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity, FlatList, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const SearchModal = ({ isVisible, onClose, logs, onSelectMemo }) => {
    const { colors: themeColors, isDark } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    // Fuzzy search logic
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        const results = [];

        logs.forEach(log => {
            const summary = (log.summary || '').toLowerCase();
            const originalInput = (log.originalInput || '').toLowerCase();

            // Check for matches in summary or original input
            const summaryMatch = summary.includes(query);
            const inputMatch = originalInput.includes(query);

            if (summaryMatch || inputMatch) {
                // Calculate relevance score (exact matches rank higher)
                let score = 0;
                if (summary === query || originalInput === query) {
                    score = 3; // Exact match
                } else if (summary.startsWith(query) || originalInput.startsWith(query)) {
                    score = 2; // Starts with query
                } else {
                    score = 1; // Contains query
                }

                results.push({
                    ...log,
                    score,
                    matchInSummary: summaryMatch,
                    matchInInput: inputMatch,
                });
            }
        });

        // Sort by relevance score (highest first), then by timestamp (newest first)
        return results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    }, [searchQuery, logs]);

    const handleSelectMemo = (memo) => {
        Keyboard.dismiss();
        setSearchQuery('');
        onSelectMemo(memo);
        onClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    // Highlight matching text
    const highlightText = (text, query) => {
        if (!query.trim() || !text) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        const before = text.substring(0, index);
        const match = text.substring(index, index + query.length);
        const after = text.substring(index + query.length);

        return (
            <Text>
                {before}
                <Text style={styles.highlight}>{match}</Text>
                {after}
            </Text>
        );
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const renderSearchResult = ({ item }) => (
        <TouchableOpacity
            style={[styles.resultItem, {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
            }]}
            onPress={() => handleSelectMemo(item)}
            activeOpacity={0.7}
        >
            <View style={styles.resultHeader}>
                <View style={[styles.typeBadge, { backgroundColor: isDark ? themeColors.border : '#F3F4F6' }]}>
                    <Text style={[styles.typeText, { color: themeColors.text }]}>
                        {item.type}
                    </Text>
                </View>
                <Text style={[styles.timestamp, { color: themeColors.placeholder }]}>
                    {formatTimestamp(item.timestamp)}
                </Text>
            </View>

            <Text style={[styles.resultSummary, { color: themeColors.text }]} numberOfLines={2}>
                {item.matchInSummary ? highlightText(item.summary, searchQuery) : item.summary}
            </Text>

            {item.matchInInput && item.originalInput !== item.summary && (
                <Text style={[styles.resultOriginal, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {highlightText(item.originalInput, searchQuery)}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent={false}
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
                    <View style={[styles.searchInputContainer, {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                    }]}>
                        <Ionicons name="search" size={20} color={themeColors.placeholder} />
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.text }]}
                            placeholder="Search notes..."
                            placeholderTextColor={themeColors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={true}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={themeColors.placeholder} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
                        <Text style={[styles.cancelText, { color: '#6366F1' }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {/* Results */}
                <View style={styles.resultsContainer}>
                    {searchQuery.trim() === '' ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="search" size={64} color={themeColors.border} />
                            <Text style={[styles.emptyStateTitle, { color: themeColors.textSecondary }]}>
                                Search your notes
                            </Text>
                            <Text style={[styles.emptyStateSubtitle, { color: themeColors.placeholder }]}>
                                Find notes by keywords in titles or content
                            </Text>
                        </View>
                    ) : searchResults.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={themeColors.border} />
                            <Text style={[styles.emptyStateTitle, { color: themeColors.textSecondary }]}>
                                No results found
                            </Text>
                            <Text style={[styles.emptyStateSubtitle, { color: themeColors.placeholder }]}>
                                Try different keywords
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={searchResults}
                            renderItem={renderSearchResult}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.resultsList}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 8,
        marginRight: 8,
    },
    cancelButton: {
        paddingVertical: 8,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    resultsContainer: {
        flex: 1,
    },
    resultsList: {
        padding: 16,
    },
    resultItem: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 12,
    },
    resultSummary: {
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 22,
        marginBottom: 4,
    },
    resultOriginal: {
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    highlight: {
        backgroundColor: '#FEF3C7',
        color: '#92400E',
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});
