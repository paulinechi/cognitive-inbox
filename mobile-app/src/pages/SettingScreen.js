import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    View,
    Text,
    Switch,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    ActivityIndicator,
    FlatList,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';

import { useLogs } from '../context/LogContext';
import { captureThought, importKeepNotes } from '../services/api';

export default function SettingScreen({ selectedFilter, onSelectFilter }) {
    const { colors: themeColors, toggleTheme, isDark } = useTheme();
    const { addLog, collections, fetchLogs } = useLogs();
    const [loading, setLoading] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [keepInstructionsVisible, setKeepInstructionsVisible] = useState(false);
    const insets = useSafeAreaInsets();

    const [isPicking, setIsPicking] = useState(false);

    // Alert state
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        buttons: []
    });

    const showAlert = (title, message, buttons = [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]) => {
        setAlertConfig({ visible: true, title, message, buttons });
    };

    // ...

    const handleKeepImport = () => {
        setImportModalVisible(false);
        setKeepInstructionsVisible(true);
    };

    const performKeepImport = async () => {
        setKeepInstructionsVisible(false);
        if (isPicking) return;
        setIsPicking(true);

        // Wait for modal to fully close
        setTimeout(async () => {
            try {
                const result = await DocumentPicker.getDocumentAsync({
                    // Restrict to zip files
                    type: ['application/zip', 'application/x-zip-compressed'],
                    copyToCacheDirectory: true,
                });

                if (result.canceled) return;

                const file = result.assets[0];
                const fileName = file.name.toLowerCase();

                // Validate file extension - only allow .zip
                const allowedExtensions = ['.zip'];
                const isValidFile = allowedExtensions.some(ext => fileName.endsWith(ext));

                if (!isValidFile) {
                    showAlert(
                        "Invalid File Type",
                        "Please select a .zip file."
                    );
                    return;
                }

                setLoading(true);

                const response = await importKeepNotes(file.uri);

                setLoading(false);

                const count = response.details?.imported || 0;
                showAlert("Success", `Imported ${count} notes from Google Keep.`);

                // Refresh memos to show imported notes
                await fetchLogs();

            } catch (error) {
                setLoading(false);
                showAlert("Import Failed", error.message || "Could not process the ZIP file.");
            } finally {
                setIsPicking(false);
            }
        }, 1000);
    };

    // Use collections from context + 'All'
    const tags = ['All', ...collections.map(c => c.type)];

    const handleLocalImport = async () => {
        if (isPicking) return; // Prevent concurrent picking
        setImportModalVisible(false);
        setIsPicking(true);

        // Wait for modal to fully close (increased to delay to ensure stability)
        setTimeout(async () => {
            try {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['text/*', 'application/json'],
                    copyToCacheDirectory: true,
                });

                if (result.canceled) return;

                const file = result.assets[0];
                const fileName = file.name.toLowerCase();

                // Validate file extension - only allow .txt, .json, .md
                const allowedExtensions = ['.txt', '.json', '.md'];
                const isValidFile = allowedExtensions.some(ext => fileName.endsWith(ext));

                if (!isValidFile) {
                    showAlert(
                        "Invalid File Type",
                        "Please select a .txt, .json, or .md file."
                    );
                    return;
                }

                setLoading(true);
                const content = await FileSystem.readAsStringAsync(file.uri);
                const aiResult = await captureThought(content);

                addLog(aiResult, content);
                setLoading(false);
                showAlert("Success", `Imported from ${file.name}`);
            } catch (error) {
                console.error("Local import error:", error);
                setLoading(false);
                showAlert("Import Failed", error.message || "Could not process the file.");
            } finally {
                setIsPicking(false);
            }
        }, 1000);
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
                <TouchableOpacity style={styles.row} onPress={() => setImportModalVisible(true)}>
                    <Text style={[styles.rowLabel, { color: themeColors.text }]}>Import Notes</Text>
                    <Ionicons name="download-outline" size={20} color={themeColors.placeholder} />
                </TouchableOpacity>
            </View>

            {/* Tag Selection Overlap (Modal) */}
            <Modal
                visible={showTagPicker}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setShowTagPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowTagPicker(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card, maxHeight: '80%' }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Collection</Text>
                        <FlatList
                            data={tags}
                            keyExtractor={(item) => item}
                            style={{ maxHeight: 400 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.tagOption}
                                    onPress={() => {
                                        onSelectFilter(item);
                                        setShowTagPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.tagText,
                                        { color: selectedFilter === item ? '#3B82F6' : themeColors.text }
                                    ]}>
                                        {item}
                                    </Text>
                                    {selectedFilter === item && (
                                        <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Import Options Modal */}
            <Modal
                visible={importModalVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setImportModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setImportModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.text }]}>Import Notes</Text>

                        <TouchableOpacity
                            style={[styles.importOption, { borderBottomColor: themeColors.border }]}
                            onPress={handleLocalImport}
                        >
                            <View style={styles.importIconContainer}>
                                <Ionicons name="document-text-outline" size={24} color={themeColors.text} />
                            </View>
                            <View>
                                <Text style={[styles.importOptionTitle, { color: themeColors.text }]}>Local File</Text>
                                <Text style={[styles.importOptionDesc, { color: themeColors.placeholder }]}>Import single text or JSON file</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.importOption}
                            onPress={handleKeepImport}
                        >
                            <View style={styles.importIconContainer}>
                                <Ionicons name="logo-google" size={24} color={themeColors.text} />
                            </View>
                            <View>
                                <Text style={[styles.importOptionTitle, { color: themeColors.text }]}>Google Keep</Text>
                                <Text style={[styles.importOptionDesc, { color: themeColors.placeholder }]}>Import Google Takeout</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: themeColors.border, marginTop: 16 }]}
                            onPress={() => setImportModalVisible(false)}
                        >
                            <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Google Keep Instructions Modal */}
            <Modal
                visible={keepInstructionsVisible}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={() => setKeepInstructionsVisible(false)}
            >
                <View style={[styles.fullScreenModal, { backgroundColor: themeColors.background }]}>
                    <View style={[styles.fullScreenHeader, { borderBottomColor: themeColors.border, paddingTop: insets.top }]}>
                        <Text style={[styles.fullScreenTitle, { color: themeColors.text }]}>Google Keep Import</Text>
                        <TouchableOpacity onPress={() => setKeepInstructionsVisible(false)}>
                            <Ionicons name="close" size={24} color={themeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.fullScreenContent} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
                        <Text style={[styles.instructionStep, { color: themeColors.text }]}>1. Trigger Export</Text>
                        <Text style={[styles.instructionDesc, { color: themeColors.textSecondary }]}>
                            Go to <Text style={{ color: '#3B82F6', fontWeight: '600' }} onPress={() => WebBrowser.openBrowserAsync('https://takeout.google.com/settings/takeout/custom/keep')}>takeout.google.com</Text>
                        </Text>

                        <Text style={[styles.instructionDesc, { color: themeColors.textSecondary, marginLeft: 16, marginTop: 8 }]}>
                            • Under "Delivery method," select <Text style={{ fontWeight: '600', color: themeColors.text }}>"Send download link via email"</Text> to download directly to your device.
                        </Text>

                        <Text style={[styles.instructionDesc, { color: themeColors.textSecondary, marginLeft: 16, marginTop: 8 }]}>
                            • Click "Create export". Google will package the notes into a .zip file and send it to your email.
                        </Text>

                        <Text style={[styles.instructionStep, { color: themeColors.text, marginTop: 16 }]}>2. Download</Text>
                        <Text style={[styles.instructionDesc, { color: themeColors.textSecondary }]}>
                            Click the email button and redirect to mail app to download the .zip file to your device
                        </Text>

                        <Text style={[styles.instructionStep, { color: themeColors.text }]}>3. Import</Text>
                        <Text style={[styles.instructionDesc, { color: themeColors.textSecondary }]}>
                            Tap the button below to open the file picker and select the .zip file.
                        </Text>

                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: themeColors.border, marginTop: 24 }]}
                            onPress={() => WebBrowser.openBrowserAsync('https://takeout.google.com/settings/takeout/custom/keep')}
                        >
                            <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>1. Open Google Takeout</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: themeColors.border, marginTop: 12 }]}
                            onPress={() => Linking.openURL('message://')}
                        >
                            <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>2. Email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: themeColors.border, marginTop: 12 }]}
                            onPress={performKeepImport}
                        >
                            <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>3. Select from Device</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            <View style={styles.footer}>
                <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>v1.0.0</Text>
            </View>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
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
    importOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'transparent' },
    importIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    importOptionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    importOptionDesc: { fontSize: 12 },
    cancelButton: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '600' },
    footer: { alignItems: 'center', marginTop: 32, paddingBottom: 60 },
    versionText: { fontSize: 12, fontWeight: '500' },
    fullScreenModal: { flex: 1, paddingTop: 40 },
    fullScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1 },
    fullScreenTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
    fullScreenContent: { flex: 1, padding: 24 },
    instructionStep: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    instructionDesc: { fontSize: 15, marginBottom: 24, lineHeight: 22 },
    primaryButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    secondaryButton: { paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});