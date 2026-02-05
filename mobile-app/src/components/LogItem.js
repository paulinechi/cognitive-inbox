import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const LogItem = ({ item, onDelete, onClick }) => (
    <View style={styles.container}>
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onClick(item)}
            style={styles.contentContainer}
        >
            <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
            </Text>
            <View style={styles.metaContainer}>
                <View style={styles.typesList}>
                    {item.types && item.types.map((type, index) => (
                        <View key={index} style={styles.typeBadge}>
                            <Text style={styles.typeText}>
                                {type}
                            </Text>
                        </View>
                    ))}
                </View>
                {item.timestamp && (
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                )}
            </View>
        </TouchableOpacity>

        <TouchableOpacity
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteButton}
        >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    contentContainer: {
        flex: 1,
        marginRight: 12,
    },
    summary: {
        color: '#1F2937',
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
        marginBottom: 8,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    typeBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeText: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timestamp: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '400',
        marginLeft: 8,
    },
    deleteButton: {
        opacity: 0.5,
        padding: 8,
    },
});
