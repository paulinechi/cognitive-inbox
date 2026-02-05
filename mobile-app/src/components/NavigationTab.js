import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const NavigationTab = ({ activeTab, onTabPress }) => {
    const { colors: themeColors, isDark } = useTheme();

    const tabs = [
        { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
        { name: 'Collection', icon: 'layers-outline', activeIcon: 'layers' },
        { name: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
    ];

    const activeColor = isDark ? '#FFFFFF' : '#374151'; // White or Dark Grey
    const inactiveColor = themeColors.placeholder;

    return (
        <View style={[styles.tabBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.name;
                return (
                    <TouchableOpacity
                        key={tab.name}
                        onPress={() => onTabPress(tab.name)}
                        style={styles.tabItem}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isActive ? tab.activeIcon : tab.icon}
                            size={24}
                            color={isActive ? activeColor : inactiveColor}
                        />
                        <Text style={[
                            styles.tabLabel,
                            { color: isActive ? activeColor : inactiveColor }
                        ]}>
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        paddingVertical: 8, // Reduced from 12
        paddingBottom: Platform.OS === 'ios' ? 20 : 12, // Reduced from 30/16
        borderTopWidth: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 10,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabLabel: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '500',
    },
});