import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureThought } from '../services/api';

import { Toast } from '../components/Toast';
import { LogItem } from '../components/LogItem';
import { FilterDropdown } from '../components/FilterDropdown';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { CameraCapture } from '../components/CameraCapture';
import { MemoDetailModal } from '../components/MemoDetailModal';

export default function CaptureScreen() {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedFilter, setSelectedFilter] = useState("All");
    const [selectedMemo, setSelectedMemo] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);


    // Lock to prevent double-submission
    const isProcessing = useRef(false);

    const showToast = (message) => setToastMessage(message);

    const handleSend = async () => {
        if (!text.trim()/* || isProcessing.current*/) return;
        // isProcessing.current = true;
        setLoading(true);
        const inputText = text;

        try {
            const result = await captureThought(inputText);
            setText('');
            addLog(result, inputText);
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
            const result = await captureThought({ type, uri });
            addLog(result, type === 'audio' ? "Audio Note" : "Photo Note", uri, type);
        } catch (error) {
            console.error(error);
            showToast(`Error uploading ${type}.`);
        } finally {
            setLoading(false);
            // isProcessing.current = false;
        }
    };

    const addLog = (result, originalInput, mediaUri = null, mediaType = null) => {
        const newLog = {
            id: result.id || Date.now().toString(),
            types: result.memo_types || ["Other"],
            summary: result.summary || originalInput,
            originalInput: originalInput,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            action_items: result.action_items,
            tags: result.tags,
            emotional_tone: result.emotional_tone,
            mediaUri: mediaUri,
            mediaType: mediaType,
        };
        setLogs(prev => [newLog, ...prev]);
        const primaryType = newLog.types[0];
        showToast(`Saved as ${primaryType}`);
    };

    const filteredLogs = useMemo(() => {
        if (selectedFilter === "All") return logs;
        return logs.filter(log => log.types.includes(selectedFilter));
    }, [logs, selectedFilter]);

    return (
        <SafeAreaView style={styles.safeArea}>
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

                <View style={styles.inputCard}>
                    <TextInput
                        style={{
                            color: '#374151',
                            fontSize: 16,
                            fontWeight: '400',
                            lineHeight: 24,
                            flex: 1,
                            paddingBottom: 40,
                        }}
                        placeholder="Write, speak, or drop anything here..."
                        placeholderTextColor="#D1D5DB"
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
                                (!text.trim() || loading) && { backgroundColor: '#E5E7EB' }
                            ]}
                            onPress={handleSend}
                            activeOpacity={0.7}
                            disabled={!text.trim() || loading}
                        >
                            <Ionicons
                                name="send"
                                size={18}
                                color={!text.trim() || loading ? "#9CA3AF" : "white"}
                            />
                            <Text style={[
                                styles.saveButtonText,
                                (!text.trim() || loading) && { color: '#9CA3AF' }
                            ]}>Save</Text>
                        </TouchableOpacity>

                        {loading && <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 12 }} />}

                    </View>
                </View>

                <View style={styles.contentArea}>
                    {logs.length > 0 && (
                        <FilterDropdown
                            selectedFilter={selectedFilter}
                            onSelectFilter={setSelectedFilter}
                        />
                    )}

                    {logs.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text
                                style={styles.emptyStateTitle}
                            >
                                Your thoughts will appear here
                            </Text>
                            <Text
                                style={styles.emptyStateSubtitle}
                            >
                                Start typing above to capture your first thought
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredLogs}
                            renderItem={({ item }) => (
                                <LogItem
                                    item={item}
                                    onDelete={(id) => setLogs(prev => prev.filter(l => l.id !== id))}
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9F9FB',
    },
    keyboardView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 48,
    },
    inputCard: {
        position: 'relative',
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        height: 192,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
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
        color: '#9CA3AF',
        fontSize: 20,
        fontWeight: '400',
        letterSpacing: -0.3,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        width: '66%',
        lineHeight: 20,
    },
});