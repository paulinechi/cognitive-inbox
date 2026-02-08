import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { useTheme } from '../context/ThemeContext';

export const LogItem = ({ item, onDelete, onClick }) => {
    const { colors: themeColors, isDark } = useTheme();
    const swipeableRef = useRef(null);

    const renderRightActions = (progress, dragX) => {
        const trans = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.rightActionContainer}>
                {/* Background filler for overshoot */}
                <View style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: '100%',
                    width: 500,
                    backgroundColor: '#EF4444'
                }} />

                <Animated.View style={[
                    styles.rightAction,
                    { transform: [{ translateX: trans }] }
                ]}>
                    <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.actionText}>Delete</Text>
                </Animated.View>
            </View>
        );
    };

    const renderLeftActions = (progress, dragX) => {
        const trans = dragX.interpolate({
            inputRange: [0, 100],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.leftActionContainer}>
                {/* Background filler for overshoot */}
                <View style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '100%',
                    width: 500,
                    backgroundColor: '#10B981'
                }} />

                <Animated.View style={[
                    styles.leftAction,
                    { transform: [{ translateX: trans }] }
                ]}>
                    <Ionicons name="pencil" size={24} color="#FFFFFF" />
                    <Text style={styles.actionText}>Edit</Text>
                </Animated.View>
            </View>
        );
    };

    const handleDelete = () => {
        // Delete directly without confirmation for swipe-to-delete
        if (swipeableRef.current) {
            swipeableRef.current.close();
        }
        onDelete(item.id);
    };

    const handleEdit = () => {
        if (swipeableRef.current) {
            swipeableRef.current.close();
        }
        onClick(item, true);
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            renderLeftActions={renderLeftActions}
            onSwipeableRightOpen={handleDelete}
            onSwipeableLeftOpen={handleEdit}
        >
            <View style={[styles.container, {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
                shadowOpacity: isDark ? 0 : 0.05
            }]}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onClick(item)}
                    style={styles.contentContainer}
                >
                    <Text style={[styles.summary, { color: themeColors.text }]} numberOfLines={2}>
                        {item.summary}
                    </Text>
                    <View style={styles.metaContainer}>
                        <View style={styles.typesList}>
                            {item.types && item.types.map((type, index) => (
                                <View key={index} style={[styles.typeBadge, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                    <Text style={[styles.typeText, { color: themeColors.textSecondary }]}>
                                        {type}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        </Swipeable>
    );
};

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
        marginRight: 0, // removed margin as delete button is gone
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
    // Swipe Action Styles
    rightActionContainer: {
        width: 80,
        backgroundColor: '#EF4444',
        marginBottom: 12,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        // Overflow must be visible for the background filler to show up outside
        overflow: 'visible',
    },
    rightAction: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
    },
    leftActionContainer: {
        width: 80,
        backgroundColor: '#10B981',
        marginBottom: 12,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        // Overflow must be visible
        overflow: 'visible',
    },
    leftAction: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});
