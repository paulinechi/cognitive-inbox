import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const FilterDropdown = ({ selectedFilter, onSelectFilter, collections = [] }) => {
    const { colors: themeColors, isDark } = useTheme();
    const { t, tc } = useLocale();
    const [isOpen, setIsOpen] = useState(false);

    // Build filter types from collections
    const FILTER_TYPES = ["All", ...collections.map(c => c.title)];

    const handleSelect = (type) => {
        onSelectFilter(type);
        setIsOpen(false);
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.headerText, { color: themeColors.text }]}>
                {selectedFilter === "All" ? t('recentThoughts') : t('filterHeading', selectedFilter)}
            </Text>

            <View style={styles.filterButtonContainer}>
                <TouchableOpacity
                    onPress={() => setIsOpen(!isOpen)}
                    style={[
                        styles.filterButton,
                        {
                            backgroundColor: themeColors.card,
                            borderColor: themeColors.border
                        },
                        selectedFilter !== 'All' && {
                            backgroundColor: isDark ? '#FFFFFF' : '#000000',
                            borderColor: isDark ? '#FFFFFF' : '#000000',
                        }
                    ]}
                >
                    <Ionicons
                        name="filter"
                        size={14}
                        color={selectedFilter !== 'All' ? (isDark ? "#000000" : "#FFFFFF") : themeColors.textSecondary}
                    />
                    <Text style={[
                        styles.filterButtonText,
                        { color: themeColors.textSecondary },
                        selectedFilter !== 'All' && { color: isDark ? '#000000' : '#FFFFFF' }
                    ]}>
                        {tc(selectedFilter)}
                    </Text>
                </TouchableOpacity>

                {isOpen && (
                    <>
                        <View style={[styles.dropdown, {
                            backgroundColor: themeColors.card,
                            borderColor: themeColors.border,
                            maxHeight: 300
                        }]}>
                            <FlatList
                                data={FILTER_TYPES}
                                keyExtractor={(item) => item}
                                style={{ maxHeight: 300 }}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item)}
                                        style={[
                                            styles.dropdownItem,
                                            selectedFilter === item && { backgroundColor: isDark ? '#374151' : '#F9FAFB' }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            { color: themeColors.textSecondary },
                                            selectedFilter === item && {
                                                color: themeColors.text,
                                                fontWeight: '600'
                                            }
                                        ]}>
                                            {tc(item)}
                                        </Text>
                                        {selectedFilter === item && (
                                            <Ionicons name="checkmark" size={14} color={themeColors.text} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </>
                )}
            </View>

            {isOpen && (
                <TouchableOpacity
                    style={styles.overlay}
                    onPress={() => setIsOpen(false)}
                    activeOpacity={1}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        // paddingHorizontal: 4, // Removed to align with cards
        zIndex: 20,
        position: 'relative',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    filterButtonContainer: {
        position: 'relative',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterButtonText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 6,
    },
    dropdown: {
        position: 'absolute',
        top: 40,
        right: 0,
        borderRadius: 12,
        borderWidth: 1,
        width: 128,
        paddingVertical: 8,
        overflow: 'hidden',
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownItemText: {
        fontSize: 14,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        height: 1000,
        width: 1000,
        zIndex: -10,
        backgroundColor: 'transparent',
    },
});
