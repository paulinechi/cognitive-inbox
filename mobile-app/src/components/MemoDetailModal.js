
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions, StyleSheet, Image, TextInput, KeyboardAvoidingView, Platform, FlatList, Keyboard, LayoutAnimation, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { API_URL } from '../config/api';
import Markdown from 'react-native-markdown-display';

const { height } = Dimensions.get('window');

import { useLogs } from '../context/LogContext';
import { useTheme } from '../context/ThemeContext';

const STANDARD_TYPES = ['Memo', 'Task', 'Wishlist', 'Journal', 'Ideas', 'Other', 'Completed'];

export const MemoDetailModal = ({ isVisible, onClose, memo, onMemoUpdate, initialEditMode = false }) => {
    const { collections } = useLogs();
    const { colors: themeColors } = useTheme();
    const slideAnim = useRef(new Animated.Value(height)).current;

    const dynamicStyles = useMemo(() => StyleSheet.create({
        modalContent: {
            backgroundColor: themeColors.card,
        },
        text: {
            color: themeColors.text,
        },
        subtext: {
            color: themeColors.textSecondary,
        },
        container: {
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
        },
        input: {
            color: themeColors.text,
            backgroundColor: themeColors.inputBackground,
            borderColor: themeColors.border,
        }
    }), [themeColors]);


    // Combine standard types with custom collections
    const availableTypes = useMemo(() => {
        const customTypes = collections.map(c => c.type);
        const cleanCustom = customTypes.filter(t => t && t !== 'All');
        return Array.from(new Set([...STANDARD_TYPES, ...cleanCustom]));
    }, [collections]);

    // Audio State
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [showTypeSelector, setShowTypeSelector] = useState(false);

    // Editable Field State
    const [summary, setSummary] = useState('');
    const [originalInput, setOriginalInput] = useState('');
    const [tags, setTags] = useState([]);
    const [types, setTypes] = useState([]);
    const [actionItems, setActionItems] = useState([]);
    const [completedItems, setCompletedItems] = useState([]);
    const [originalType, setOriginalType] = useState(null); // Track original type for reverting
    const [updatedAt, setUpdatedAt] = useState('');

    // Temporary inputs
    const [newTag, setNewTag] = useState('');
    const [newActionItem, setNewActionItem] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isVisible && memo) {

            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
            }).start();
            // ... (rest of the effect)
            // Initialize state
            setSummary(memo.summary || '');
            setOriginalInput(memo.originalInput || '');
            setTags(memo.tags || []);
            setTypes(memo.types || []);
            // Set original type from backend or fallback to first type if not 'Completed'
            const initialTypes = memo.types || [];
            const isCompleted = initialTypes.includes('Completed');
            setOriginalType(memo.original_memo_type || (isCompleted ? 'Task' : initialTypes[0] || 'Task'));

            setActionItems(memo.action_items || []);
            setCompletedItems(memo.completed_action_items || []);

            setShowTypeSelector(false);
        } else {
            slideAnim.setValue(height);
            if (sound) {
                sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
            }
        }
    }, [isVisible, memo]);

    useEffect(() => {
        if (isVisible) {
            setIsEditing(initialEditMode);
        }
    }, [isVisible, initialEditMode]);

    useEffect(() => {
        return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [sound]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const handleStartEditing = () => {
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        // Revert changes
        if (memo) {
            setSummary(memo.summary || '');
            setOriginalInput(memo.originalInput || '');
            setTags(memo.tags || []);
            setTypes(memo.types || []);
            setActionItems(memo.action_items || []);
            setCompletedItems(memo.completed_action_items || []);
            setUpdatedAt(memo.updatedAt || memo.timestamp || '');
        }
        setShowTypeSelector(false);
        setIsEditing(false);
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        try {
            const date = new Date(ts);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (e) {
            return ts;
        }
    };

    const handleSave = async () => {
        if (!memo) return;
        setIsSaving(true);
        try {
            const body = {
                summary,
                original_input: originalInput,
                tags,
                memo_types: types,
                action_items: actionItems,
                completed_action_items: completedItems,
            };

            const response = await fetch(`${API_URL}/memos/${memo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const result = await response.json();
                if (onMemoUpdate) {
                    onMemoUpdate(memo.id, {
                        summary: result.summary,
                        originalInput: result.original_input,
                        tags: result.tags,
                        types: result.memo_types,
                        type: result.memo_types[0],
                        action_items: result.action_items,
                        completed_action_items: result.completed_action_items,
                        updatedAt: result.updated_at,
                    });
                }
                setUpdatedAt(result.updated_at);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error saving memo:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Action Items ---
    const handleToggleAction = async (index) => {
        // In View mode, we toggle immediately via API (or local optimistic if we prefer)
        // In Edit mode, we just toggle local state?
        // Let's keep it consistent: Toggle updates local state. 
        // If in View mode, we might want to allow "checking off" without entering "Edit Mode" full text.
        // But for simplicity, let's treat checking off as a "View Mode interaction" that auto-saves or is separate?
        // User request: "edit function should only be able actiate when i am in edit mode"
        // Usually checking a box is allowed in view mode.
        // Let's allow toggling in BOTH modes, but in View Mode it might need to trigger an update?
        // Yes, that's better UX.

        if (!isEditing) {
            // Immediate API toggle for View Mode
            try {
                const response = await fetch(`${API_URL}/memos/${memo.id}/toggle-action/${index}`, { method: 'PATCH' });
                if (response.ok) {
                    const result = await response.json();
                    setCompletedItems(result.completed_action_items);
                    setTypes(result.memo_types); // Update local types state
                    if (onMemoUpdate) {
                        onMemoUpdate(memo.id, {
                            completed_action_items: result.completed_action_items,
                            types: result.memo_types,
                            type: result.memo_types[0]
                        });
                    }
                }
            } catch (e) { console.error(e); }
            return;
        }

        // Edit Mode: Local toggle only, save later
        let newCompleted;
        if (completedItems.includes(index)) {
            newCompleted = completedItems.filter(i => i !== index);
        } else {
            newCompleted = [...completedItems, index];
        }
        setCompletedItems(newCompleted);

        // Auto-update status in Edit Mode
        const allCompleted = newCompleted.length === actionItems.length && actionItems.length > 0;
        if (allCompleted) {
            setTypes(['Completed']);
        } else if (types.includes('Completed')) {
            setTypes([originalType || 'Task']);
        }
    };

    const handleDeleteAction = (index) => {
        const newItems = actionItems.filter((_, i) => i !== index);
        setActionItems(newItems);
        // Sync indices for completion
        const newCompleted = completedItems
            .filter(i => i !== index)
            .map(i => i > index ? i - 1 : i);
        setCompletedItems(newCompleted);

        // Check completion status after delete
        const allCompleted = newCompleted.length === newItems.length && newItems.length > 0;
        if (allCompleted) {
            setTypes(['Completed']);
        } else if (types.includes('Completed') && newItems.length > 0) {
            setTypes([originalType || 'Task']);
        }
    };

    const handleAddAction = () => {
        if (!newActionItem.trim()) return;
        const newItems = [...actionItems, newActionItem.trim()];
        setActionItems(newItems);
        setNewActionItem('');

        // Revert to original type if properly adding new item (since it's incomplete by default)
        if (types.includes('Completed')) {
            setTypes([originalType || 'Task']);
        }
    };

    const handleEditActionText = (text, index) => {
        const newItems = [...actionItems];
        newItems[index] = text;
        setActionItems(newItems);
    };

    // --- Tags ---
    const handleAddTag = () => {
        if (!newTag.trim()) return;
        if (!tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
        }
        setNewTag('');
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    // --- Types ---
    const handleTypeSelect = (selectedType) => {
        // Replace current types with selected one (single select behavior for dropdown)
        // Or toggle? User said "reassign".
        setTypes([selectedType]);
        if (selectedType !== 'Completed') {
            setOriginalType(selectedType);
        }
        setShowTypeSelector(false);
    };

    // --- Audio ---
    const playAudio = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: true,
                        shouldDuckAndroid: true,
                        staysActiveInBackground: false,
                    });
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                setIsLoadingAudio(true);
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    staysActiveInBackground: false,
                });
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: memo.mediaUri },
                    { shouldPlay: true },
                    (status) => { if (status.didJustFinish) setIsPlaying(false); }
                );
                setSound(newSound);
                setIsPlaying(true);
                setIsLoadingAudio(false);
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            setIsLoadingAudio(false);
        }
    };

    if (!memo) return null;

    const isAudio = (memo.mediaType && memo.mediaType.toLowerCase().startsWith('audio')) ||
        (memo.mediaUri && /\.(m4a|mp3|wav|aac|ogg)$/i.test(memo.mediaUri));

    const isImage = (memo.mediaType && memo.mediaType.toLowerCase().startsWith('image')) ||
        (memo.mediaUri && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(memo.mediaUri));

    return (
        <Modal transparent visible={isVisible} animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.backdrop}>
                <TouchableOpacity style={styles.backdropTouch} onPress={handleClose} />

                <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }, dynamicStyles.modalContent]}>
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.typesList}>
                                {types.map((type, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.typeBadge, isEditing && styles.typeBadgeEditable]}
                                        onPress={() => isEditing && setShowTypeSelector(prev => !prev)}
                                        disabled={!isEditing}
                                    >
                                        <Text style={styles.typeBadgeText}>{type}</Text>
                                        {isEditing && <Ionicons name="caret-down" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {showTypeSelector && (
                                <View style={[styles.dropdownContainer, dynamicStyles.container, { height: 'auto', maxHeight: 250 }]}>
                                    <FlatList
                                        data={availableTypes}
                                        keyExtractor={(item) => item}
                                        style={[styles.selectorList, { maxHeight: 250 }]}
                                        nestedScrollEnabled={true}
                                        showsVerticalScrollIndicator={false}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.selectorItem,
                                                    { borderBottomColor: themeColors.border },
                                                    dynamicStyles.modalContent,
                                                    types.includes(item) && [styles.selectorItemSelected, dynamicStyles.container]
                                                ]}
                                                onPress={() => handleTypeSelect(item)}
                                            >
                                                <Text style={[
                                                    styles.selectorItemText,
                                                    dynamicStyles.text,
                                                    types.includes(item) && [styles.selectorItemTextSelected, dynamicStyles.text]
                                                ]}>{item}</Text>
                                                {types.includes(item) && <Ionicons name="checkmark" size={16} color={themeColors.text} />}
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>
                            )}
                            <Text style={styles.timestamp}>{formatTimestamp(updatedAt)}</Text>
                        </View>

                        <View style={styles.headerRight}>
                            {isEditing ? (
                                <>
                                    <TouchableOpacity onPress={handleCancelEditing} style={styles.cancelButton}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                                        {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity onPress={handleStartEditing} style={styles.editButton}>
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Summary */}
                        {isEditing ? (
                            <TextInput
                                style={[styles.summaryInput, dynamicStyles.text]}
                                value={summary}
                                onChangeText={setSummary}
                                multiline
                                placeholder="Add your thoughts..."
                            />
                        ) : (
                            <Text style={[styles.summaryText, dynamicStyles.text]}>{summary}</Text>
                        )}

                        {/* Audio/Image Content (Read Only) */}
                        {isAudio && memo.mediaUri && (
                            <View style={styles.mediaSection}>
                                <TouchableOpacity
                                    style={[styles.audioButton, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                                    onPress={playAudio}
                                    disabled={isLoadingAudio}
                                >
                                    <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={48} color={themeColors.text} />
                                    <Text style={[styles.audioButtonText, { color: themeColors.text }]}>{isLoadingAudio ? 'Loading...' : isPlaying ? 'Pause' : 'Play Recording'}</Text>
                                </TouchableOpacity>
                                <View style={[styles.transcriptionContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                                    <Text style={styles.transcriptionLabel}>Transcription</Text>
                                    <Text style={[styles.transcriptionText, { color: themeColors.text }]}>
                                        "{memo.originalInput || "No transcription available"}"
                                    </Text>
                                </View>
                            </View>
                        )}
                        {isImage && memo.mediaUri && (
                            <View style={styles.mediaSection}>
                                <Image source={{ uri: memo.mediaUri }} style={styles.image} resizeMode="cover" />
                            </View>
                        )}

                        <View style={styles.detailsContainer}>

                            {/* Action Items */}
                            {(actionItems.length > 0 || isEditing) && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Action Items</Text>
                                    <View style={[styles.actionItemsContainer, dynamicStyles.container]}>
                                        {actionItems.map((item, index) => (
                                            <View key={index} style={styles.actionItemRow}>
                                                <TouchableOpacity onPress={() => handleToggleAction(index)}>
                                                    <Ionicons
                                                        name={completedItems.includes(index) ? "checkbox" : "square-outline"}
                                                        size={24}
                                                        color={completedItems.includes(index) ? "#10B981" : "#6B7280"}
                                                    />
                                                </TouchableOpacity>
                                                {isEditing ? (
                                                    <TextInput
                                                        style={[styles.actionItemInput, dynamicStyles.text, completedItems.includes(index) && styles.completedActionItem]}
                                                        value={item}
                                                        onChangeText={(text) => handleEditActionText(text, index)}
                                                        multiline
                                                    />
                                                ) : (
                                                    <Text style={[
                                                        styles.actionItemText,
                                                        dynamicStyles.text,
                                                        completedItems.includes(index) && styles.completedActionItem
                                                    ]}>
                                                        {item}
                                                    </Text>
                                                )}
                                                {isEditing && (
                                                    <TouchableOpacity onPress={() => handleDeleteAction(index)}>
                                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}

                                        {isEditing && (
                                            <View style={styles.addInputRow}>
                                                <Ionicons name="add" size={20} color={themeColors.textSecondary} />
                                                <TextInput
                                                    style={[styles.addInput, { color: themeColors.text }]}
                                                    placeholder="Add action item..."
                                                    placeholderTextColor={themeColors.textSecondary}
                                                    value={newActionItem}
                                                    onChangeText={setNewActionItem}
                                                    onSubmitEditing={handleAddAction}
                                                />
                                                {newActionItem.length > 0 && (
                                                    <TouchableOpacity onPress={handleAddAction}>
                                                        <Text style={{ color: '#6366F1', fontWeight: '600' }}>Add</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Tags */}
                            {(tags.length > 0 || isEditing) && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Tags</Text>
                                    <View style={styles.tagsContainer}>
                                        {tags.map((tag, index) => (
                                            <View key={index} style={[styles.tag, dynamicStyles.container]}>
                                                <Text style={styles.tagText}>#{tag}</Text>
                                                {isEditing && (
                                                    <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={{ marginLeft: 6 }}>
                                                        <Ionicons name="close-circle" size={14} color="#9CA3AF" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                        {isEditing && (
                                            <TextInput
                                                style={[styles.smallTagInput, dynamicStyles.input]}
                                                placeholder="+ Tag"
                                                placeholderTextColor={themeColors.textSecondary}
                                                value={newTag}
                                                onChangeText={setNewTag}
                                                onSubmitEditing={handleAddTag}
                                            />
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Original Input */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Original Input</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={[styles.originalInput, dynamicStyles.input]}
                                        value={originalInput}
                                        onChangeText={setOriginalInput}
                                        multiline
                                        placeholder="Original entry text..."
                                    />
                                ) : (
                                    <Text style={[styles.originalInputText, dynamicStyles.text]}>
                                        "{originalInput || 'Media Content'}"
                                    </Text>
                                )}
                            </View>
                        </View>
                    </ScrollView>



                </Animated.View>
            </KeyboardAvoidingView>
        </Modal >
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 20,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    dragHandle: {
        width: 48,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        zIndex: 10, // Ensure header children float above content
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 14,
    },
    saveButton: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    cancelButton: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: '500',
        fontSize: 14,
    },
    typesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4,
    },
    typeBadge: {
        backgroundColor: '#000000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeBadgeEditable: {
        backgroundColor: '#4B5563', // Lighter when editable to hint interaction
    },
    typeBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timestamp: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 8,
    },
    summaryText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        lineHeight: 32,
        marginBottom: 24,
    },
    summaryInput: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        lineHeight: 32,
        marginBottom: 24,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    mediaSection: { marginBottom: 24 },
    audioButton: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    audioButtonText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#374151' },
    transcriptionContainer: { marginTop: 16, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    transcriptionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 },
    transcriptionText: { fontSize: 14, lineHeight: 22, color: '#374151', fontStyle: 'italic' },
    image: { width: '100%', height: 300, borderRadius: 16, backgroundColor: '#F3F4F6' },
    detailsContainer: { gap: 24 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 },
    actionItemsContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    actionItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    actionItemText: { marginLeft: 8, color: '#374151', fontSize: 14, lineHeight: 20, flex: 1 },
    actionItemInput: { flex: 1, marginLeft: 8, color: '#374151', fontSize: 14, lineHeight: 20, paddingVertical: 0 },
    addInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingLeft: 2 },
    addInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#6B7280' },
    completedActionItem: { textDecorationLine: 'line-through', color: '#9CA3AF' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
    tagText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
    smallTagInput: { fontSize: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, color: '#374151', marginBottom: 8 },
    originalInput: { color: '#1F2937', fontSize: 14, lineHeight: 24, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
    originalInputText: { color: '#6B7280', fontSize: 14, lineHeight: 24, fontStyle: 'italic' },

    // Inline Dropdown Styles
    // Inline Dropdown Styles
    dropdownContainer: {
        position: 'absolute',
        top: 40,
        left: 0,
        width: 220,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100, // Float above everything
        overflow: 'hidden',
    },
    selectorList: {
        flexDirection: 'column',
    },
    selectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    selectorTitle: { display: 'none' }, // Hide title since it's inline now
    selectorItemSelected: {
        backgroundColor: '#F9FAFB', // Subtle highlight for selected
    },
    selectorItemText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#4B5563',
    },
    selectorItemTextSelected: {
        color: '#111827',
        fontWeight: '600',
    },
});
