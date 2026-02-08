import React, { useState } from 'react';
import {
    View,
    Text,
    Switch,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ScrollView,
    Modal,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLogs } from '../context/LogContext';
import { captureThought } from '../services/api';

export default function SettingScreen({ selectedFilter, onSelectFilter }) {
    const { colors: themeColors, toggleTheme, isDark } = useTheme();
    const { addLog, collections } = useLogs();
    const [loading, setLoading] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const insets = useSafeAreaInsets();

    // Use collections from context + 'All'
    const tags = ['All', ...collections.map(c => c.type)];

    const handleImport = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/*', 'application/json'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;
            setLoading(true);

            const file = result.assets[0];
            const content = await FileSystem.readAsStringAsync(file.uri);
            const aiResult = await captureThought(content);

            addLog(aiResult, content);
            setLoading(false);
            Alert.alert("Success", `Imported from ${file.name}`);
        } catch (error) {
            setLoading(false);
            Alert.alert("Import Failed", "Could not process the file.");
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top + 32 }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Settings</Text>
                {loading && <ActivityIndicator size="small" color={themeColors.text} />}
            </View>

            {/* Navigation Section */}
            <Text style={[styles.sectionTitle, { color: themeColors.placeholder }]}>Navigation</Text>
            <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() => setShowTagPicker(true)}
                >
                    <View>
                        <Text style={[styles.rowLabel, { color: themeColors.text }]}>Active Collection</Text>
                        <Text style={{ fontSize: 12, color: themeColors.placeholder }}>Set default landing page</Text>
                    </View>
                    <View style={styles.rightContent}>
                        <Text style={[styles.activeValue, { color: '#3B82F6' }]}>{selectedFilter}</Text>
                        <Ionicons name="chevron-forward" size={16} color={themeColors.placeholder} style={{ marginLeft: 8 }} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Preferences Section */}
            <Text style={[styles.sectionTitle, { color: themeColors.placeholder }]}>Preferences</Text>
            <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: themeColors.text }]}>Dark Mode</Text>
                    <Switch
                        trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                        thumbColor={"#FFFFFF"}
                        onValueChange={toggleTheme}
                        value={isDark}
                    />
                </View>
                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                <TouchableOpacity style={styles.row} onPress={handleImport}>
                    <Text style={[styles.rowLabel, { color: themeColors.text }]}>Import Notes</Text>
                    <Ionicons name="download-outline" size={20} color={themeColors.placeholder} />
                </TouchableOpacity>
            </View>

            {/* Tag Selection Overlap (Modal) */}
            <Modal
                visible={showTagPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTagPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowTagPicker(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Collection</Text>
                        {tags.map((tag) => (
                            <TouchableOpacity
                                key={tag}
                                style={styles.tagOption}
                                onPress={() => {
                                    onSelectFilter(tag);
                                    setShowTagPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.tagText,
                                    { color: selectedFilter === tag ? '#3B82F6' : themeColors.text }
                                ]}>
                                    {tag}
                                </Text>
                                {selectedFilter === tag && (
                                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <View style={styles.footer}>
                <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>v1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
    headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    section: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, marginBottom: 24, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
    rowLabel: { fontSize: 16, fontWeight: '500' },
    rightContent: { flexDirection: 'row', alignItems: 'center' },
    activeValue: { fontSize: 15, fontWeight: '600' },
    divider: { height: 1, width: '100%' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', borderRadius: 24, padding: 24, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
    tagOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
    tagText: { fontSize: 16, fontWeight: '500' },
    footer: { alignItems: 'center', marginTop: 32, paddingBottom: 60 },
    versionText: { fontSize: 12, fontWeight: '500' },
});