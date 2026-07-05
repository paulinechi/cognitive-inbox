import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, StyleSheet, TouchableOpacity, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureThought } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLogs } from '../context/LogContext';
import { useLocale } from '../context/LocaleContext';
import { Toast } from '../components/Toast';
import { LogItem } from '../components/LogItem';
import { FilterDropdown } from '../components/FilterDropdown';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { CameraCapture } from '../components/CameraCapture';
import { MemoDetailModal } from '../components/MemoDetailModal';
import { SearchModal } from '../components/SearchModal';
import CollectionScreen from './CollectionScreen';
import SettingScreen from './SettingScreen';
import { NavigationTab } from '../components/NavigationTab';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CaptureScreen() {
    const { colors: themeColors, isDark } = useTheme();
    const { logs, addLog, deleteLog, collections, updateLog } = useLogs();
    const { t } = useLocale();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState('Home');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedFilter, setSelectedFilter] = useState("All");
    const [selectedMemo, setSelectedMemo] = useState(null);
    const [selectedMemoInitialEditMode, setSelectedMemoInitialEditMode] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    // Lock to prevent double-submission
    const isProcessing = useRef(false);

    const showToast = (message) => setToastMessage(message);

    // Filter only custom collections to send to AI
    const customTags = useMemo(() => {
        return collections.filter(c => c.isCustom).map(c => c.title);
    }, [collections]);

    const handleSend = async () => {
        if (!text.trim()/* || isProcessing.current*/) return;
        // isProcessing.current = true;
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
            // isProcessing.current = false;
        }
    };

    const handleMediaCapture = async (uri, type) => {
        // if (isProcessing.current) return;
        // isProcessing.current = true;
        setLoading(true);
        try {
            // Pass custom tags to AI
            const result = await captureThought({ type, uri }, customTags);
            // Use actual transcription if available
            const transcription = result.original_input || (type === 'audio' ? "Audio Note" : "Photo Note");
            const newLog = addLog(result, transcription, result.media_uri, result.media_type);
            showToast(`Saved as ${newLog.type}`);
        } catch (error) {
            console.error(error);
            showToast(`Error uploading ${type}.`);
        } finally {
            setLoading(false);
            // isProcessing.current = false;
        }
    };



    const filteredLogs = useMemo(() => {
        if (selectedFilter === "All") return logs;
        return logs.filter(log => log.types.includes(selectedFilter));
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
        // Apply Home-specific padding here
        return (
            <View style={[styles.homeContainer, { paddingTop: insets.top + 24 }]}>
                {/* Header with Search Icon */}
                <View style={styles.homeHeader}>
                    <TouchableOpacity
                        style={[styles.searchButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                        onPress={() => setIsSearchVisible(true)}
                    >
                        <Ionicons name="search" size={20} color={themeColors.text} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.inputCard, {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                    shadowOpacity: isDark ? 0 : 0.05
                }]}>
                    <TextInput
                        style={{
                            color: '#374151',
                            fontSize: 16,
                            fontWeight: '400',
                            lineHeight: 24,
                            flex: 1,
                            paddingBottom: 40,
                        }}
                        placeholder={t('capturePlaceholder')}
                        placeholderTextColor={themeColors.placeholder}
                        multiline={true}
                        textAlignVertical="top"
                        value={text}
                        onChangeText={setText}
                        returnKeyType="default"
                        blurOnSubmit={false}
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

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                (!text.trim() || loading) && { backgroundColor: isDark ? themeColors.border : '#E5E7EB' }
                            ]}
                            onPress={handleSend}
                            activeOpacity={0.7}
                            disabled={!text.trim() || loading}
                        >
                            <Ionicons
                                name="send"
                                size={18}
                                color={!text.trim() || loading ? (isDark ? themeColors.textSecondary : "#9CA3AF") : "white"}
                            />
                            <Text style={[
                                styles.saveButtonText,
                                (!text.trim() || loading) && { color: isDark ? themeColors.textSecondary : '#9CA3AF' }
                            ]}>{t('save')}</Text>
                        </TouchableOpacity>

                        {loading && <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 12 }} />}

                    </View>
                </View>

                <View style={styles.contentArea}>
                    {/* Landing Page Header - Shows when coming from Collection tab */}
                    {logs.length > 0 && (
                        <FilterDropdown
                            selectedFilter={selectedFilter}
                            onSelectFilter={setSelectedFilter}
                            collections={collections}
                        />
                    )}

                    {filteredLogs.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyStateTitle, { color: themeColors.textSecondary }]}>
                                {selectedFilter === "All" ? t('emptyStateTitle') : t('emptyFilterTitle', selectedFilter)}
                            </Text>
                            <Text style={[styles.emptyStateSubtitle, { color: themeColors.placeholder }]}>
                                {selectedFilter === "All" ? t('emptyStateSubtitle') : t('emptyFilterSubtitle')}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredLogs}
                            renderItem={({ item }) => (
                                <LogItem
                                    item={item}
                                    onDelete={(id) => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                                        deleteLog(id);
                                    }}
                                    onClick={(item, editMode = false) => {
                                        setSelectedMemo(item);
                                        setSelectedMemoInitialEditMode(editMode);
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
            </View>
        );
    };

    return (
        <SafeAreaView edges={['left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <Toast message={toastMessage} onHide={() => setToastMessage('')} />

                <SearchModal
                    isVisible={isSearchVisible}
                    onClose={() => setIsSearchVisible(false)}
                    logs={logs}
                    onSelectMemo={(memo) => {
                        setSelectedMemo(memo);
                        setSelectedMemoInitialEditMode(false);
                        setIsModalVisible(true);
                    }}
                />

                <MemoDetailModal
                    isVisible={isModalVisible}
                    onClose={() => {
                        setIsModalVisible(false);
                        setSelectedMemoInitialEditMode(false);
                    }}
                    memo={selectedMemo}
                    initialEditMode={selectedMemoInitialEditMode}
                    onMemoUpdate={updateLog}
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
    },
    homeContainer: {
        flex: 1,
        paddingHorizontal: 24,
        // paddingTop is dynamic
    },
    homeHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 16,
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
        bottom: 16,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 12,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 6,
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

});