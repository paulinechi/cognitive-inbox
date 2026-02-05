import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureThought } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLogs } from '../context/LogContext';

import { Toast } from '../components/Toast';
import { LogItem } from '../components/LogItem';
import { FilterDropdown } from '../components/FilterDropdown';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { CameraCapture } from '../components/CameraCapture';
import { MemoDetailModal } from '../components/MemoDetailModal';
import CollectionScreen from './CollectionScreen';
import SettingScreen from './SettingScreen';
import { NavigationTab } from '../components/NavigationTab';

export default function CaptureScreen() {
    const { colors: themeColors, isDark } = useTheme();
    const { logs, addLog, deleteLog, collections } = useLogs();

    const [activeTab, setActiveTab] = useState('Home');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedFilter, setSelectedFilter] = useState("All");

    const [selectedMemo, setSelectedMemo] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showToast = (message) => setToastMessage(message);

    // Filter only custom collections to send to AI
    const customTags = useMemo(() => {
        return collections.filter(c => c.isCustom).map(c => c.title);
    }, [collections]);

    const handleSend = async () => {
        if (!text.trim()) return;
        setLoading(true);
        const inputText = text;

        try {
            // Pass custom tags to AI
            const result = await captureThought(inputText, customTags);
            setText('');
            const newLog = addLog(result, inputText);
            showToast(`Saved as ${newLog.type}`);
        } catch (error) {
            console.error(error);
            showToast('Error saving.');
        } finally {
            setLoading(false);
        }
    };

    const handleMediaCapture = async (uri, type) => {
        setLoading(true);
        try {
            // Pass custom tags to AI
            const result = await captureThought({ type, uri }, customTags);
            const newLog = addLog(result, type === 'audio' ? "Audio Note" : "Photo Note", uri, type);
            showToast(`Saved as ${newLog.type}`);
        } catch (error) {
            console.error(error);
            showToast(`Error uploading ${type}.`);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        if (selectedFilter === "All") return logs;
        return logs.filter(log => log.type === selectedFilter);
    }, [logs, selectedFilter]);

    const renderContent = () => {
        if (activeTab === 'Collection') {
            return (
                <CollectionScreen
                    onSelectCategory={(category) => {
                        setSelectedFilter(category);
                        setActiveTab('Home');
                    }}
                />
            );
        }

        if (activeTab === 'Settings') {
            return (
                <SettingScreen
                    selectedFilter={selectedFilter}
                    onSelectFilter={(newFilter) => {
                        setSelectedFilter(newFilter);
                        // Optional: Navigate back to Home automatically not requested, 
                        // just setting the state.
                    }}
                />
            );
        }

        // Default: Home (Capture) Screen
        return (
            <>
                <View style={[styles.inputCard, {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                    shadowOpacity: isDark ? 0 : 0.05
                }]}>
                    <TextInput
                        style={[styles.textInput, { color: themeColors.text }]}
                        placeholder="Write, speak, or drop anything here..."
                        placeholderTextColor={themeColors.placeholder}
                        multiline={true}
                        textAlignVertical="top"
                        value={text}
                        onChangeText={setText}
                        onSubmitEditing={handleSend}
                        returnKeyType="done"
                        blurOnSubmit={true}
                    />

                    <View style={styles.iconContainer}>
                        <VoiceRecorder
                            onRecordingComplete={(uri) => handleMediaCapture(uri, 'audio')}
                            isProcessing={loading}
                        />
                        <CameraCapture
                            onCapture={(uri) => handleMediaCapture(uri, 'image')}
                            isProcessing={loading}
                        />
                        {loading && <ActivityIndicator size="small" color={themeColors.textSecondary} />}
                    </View>
                </View>

                <View style={styles.contentArea}>
                    {/* Landing Page Header - Shows when coming from Collection tab */}
                    {selectedFilter !== "All" ? (
                        <View style={styles.landingHeader}>
                            <View>
                                <Text style={[styles.landingLabel, { color: themeColors.placeholder }]}>Collection</Text>
                                <Text style={[styles.landingTitle, { color: themeColors.text }]}>{selectedFilter}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.clearFilterBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                                onPress={() => setSelectedFilter("All")}
                            >
                                <Text style={{ color: themeColors.textSecondary, fontWeight: '600', fontSize: 12 }}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        logs.length > 0 && (
                            <FilterDropdown
                                selectedFilter={selectedFilter}
                                onSelectFilter={setSelectedFilter}
                            />
                        )
                    )}

                    {filteredLogs.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyStateTitle, { color: themeColors.textSecondary }]}>
                                {selectedFilter === "All" ? "Your thoughts will appear here" : `No ${selectedFilter}s yet`}
                            </Text>
                            <Text style={[styles.emptyStateSubtitle, { color: themeColors.placeholder }]}>
                                {selectedFilter === "All" ? "Start typing above to capture your first thought" : "Try categorizing some notes to see them here"}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredLogs}
                            renderItem={({ item }) => (
                                <LogItem
                                    item={item}
                                    onDelete={(id) => deleteLog(id)}
                                    onClick={(item) => {
                                        setSelectedMemo(item);
                                        setIsModalVisible(true);
                                    }}
                                />
                            )}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </View>
            </>
        );
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <Toast message={toastMessage} onHide={() => setToastMessage('')} />

                <MemoDetailModal
                    isVisible={isModalVisible}
                    onClose={() => setIsModalVisible(false)}
                    memo={selectedMemo}
                />

                {renderContent()}

            </KeyboardAvoidingView>

            <View style={[styles.navigationContainer, { backgroundColor: themeColors.background }]}>
                <NavigationTab
                    activeTab={activeTab}
                    onTabPress={(tab) => {
                        if (tab === 'Home' && activeTab === 'Home') {
                            setSelectedFilter("All");
                        }
                        setActiveTab(tab);
                    }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 48,
    },
    textInput: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        flex: 1,
    },
    inputCard: {
        position: 'relative',
        borderRadius: 32,
        padding: 24,
        height: 192,
        marginBottom: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        position: 'absolute',
        bottom: 20,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    contentArea: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 128,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '400',
        letterSpacing: -0.3,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        width: '66%',
        lineHeight: 20,
    },
    navigationContainer: {
        zIndex: 100,
        elevation: 20,
    },
    // New Landing Page Styles
    landingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    landingLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    landingTitle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    clearFilterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 4,
    },
});