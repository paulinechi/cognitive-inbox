import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FILTER_TYPES = ["All", "Idea", "Task", "Journal", "Other"];

export const FilterDropdown = ({ selectedFilter, onSelectFilter }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (type) => {
        onSelectFilter(type);
        setIsOpen(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>
                {selectedFilter === "All" ? "Recent Thoughts" : `${selectedFilter}s`}
            </Text>

            <View style={styles.filterButtonContainer}>
                <TouchableOpacity
                    onPress={() => setIsOpen(!isOpen)}
                    style={[
                        styles.filterButton,
                        selectedFilter !== 'All' && styles.filterButtonActive
                    ]}
                >
                    <Ionicons
                        name="filter"
                        size={14}
                        color={selectedFilter !== 'All' ? "#FFFFFF" : "#6B7280"}
                    />
                    <Text style={[
                        styles.filterButtonText,
                        selectedFilter !== 'All' && styles.filterButtonTextActive
                    ]}>
                        {selectedFilter}
                    </Text>
                </TouchableOpacity>

                {isOpen && (
                    <>
                        <View style={styles.dropdown}>
                            {FILTER_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => handleSelect(type)}
                                    style={[
                                        styles.dropdownItem,
                                        selectedFilter === type && styles.dropdownItemSelected
                                    ]}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        selectedFilter === type && styles.dropdownItemTextSelected
                                    ]}>
                                        {type}
                                    </Text>
                                    {selectedFilter === type && (
                                        <Ionicons name="checkmark" size={14} color="#000000" />
                                    )}
                                </TouchableOpacity>
                            ))}
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
        paddingHorizontal: 4,
        zIndex: 20,
        position: 'relative',
    },
    headerText: {
        color: '#1F2937',
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
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    filterButtonActive: {
        backgroundColor: '#000000',
        borderColor: '#000000',
    },
    filterButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginLeft: 6,
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    dropdown: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
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
    dropdownItemSelected: {
        backgroundColor: '#F9FAFB',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#6B7280',
    },
    dropdownItemTextSelected: {
        fontWeight: '600',
        color: '#000000',
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
