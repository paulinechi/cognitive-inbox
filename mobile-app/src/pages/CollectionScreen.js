import React, { useMemo, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme } from '../context/ThemeContext';
import { useLogs } from '../context/LogContext';
import { MemoDetailModal } from '../components/MemoDetailModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';

export default function CollectionScreen({ onSelectCategory }) {
    const { colors: themeColors } = useTheme();
    const { logs, collections, addCollection, updateCollection, deleteCollection, updateLog } = useLogs();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [editingCollection, setEditingCollection] = useState(null);
    const [editedName, setEditedName] = useState('');

    // Selection mode state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedCollections, setSelectedCollections] = useState([]);

    // Note list and detail modal state
    const [isNoteListVisible, setIsNoteListVisible] = useState(false);
    const [selectedCollectionType, setSelectedCollectionType] = useState(null);
    const [selectedCollectionTitle, setSelectedCollectionTitle] = useState('');
    const [isNoteDetailVisible, setIsNoteDetailVisible] = useState(false);
    const [selectedNoteDetail, setSelectedNoteDetail] = useState(null);

    // Derived state for notes to ensure UI updates immediately
    const selectedCollectionNotes = useMemo(() => {
        if (!selectedCollectionType) return [];
        return logs.filter(log => log.type === selectedCollectionType);
    }, [logs, selectedCollectionType]);

    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '', buttons: [] });

    const showAlert = (title, message, buttons) => {
        setAlertConfig({ title, message, buttons });
        setAlertVisible(true);
    };

    const hideAlert = () => {
        setAlertVisible(false);
    };

    // Store refs to all swipeable items
    const swipeableRefs = useRef({});

    const insets = useSafeAreaInsets();

    const closeAllSwipeables = () => {
        Object.values(swipeableRefs.current).forEach(ref => {
            ref?.close();
        });
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedCollections([]);
        closeAllSwipeables();
    };

    const toggleSelection = (collectionId) => {
        if (selectedCollections.includes(collectionId)) {
            setSelectedCollections(prev => prev.filter(id => id !== collectionId));
        } else {
            setSelectedCollections(prev => [...prev, collectionId]);
        }
    };

    const selectAll = () => {
        const selectableIds = collections
            .filter(c => c.is_custom)
            .map(c => c.id);
        setSelectedCollections(selectableIds);
    };

    const handleBulkDelete = () => {
        if (selectedCollections.length === 0) return;

        showAlert(
            "Delete Collections",
            `Delete ${selectedCollections.length} collection(s)? All notes in these collections will also be deleted.`,
            [
                { text: "Cancel", style: "cancel", onPress: hideAlert },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        hideAlert();
                        // Delete all simultaneously for smooth animation
                        await Promise.all(
                            selectedCollections.map(id => deleteCollection(id))
                        );
                        setSelectedCollections([]);
                        setIsSelectionMode(false);
                    }
                }
            ]
        );
    };

    const handleCollectionClick = (collection) => {
        // Filter notes by collection type using global logs state
        // We use derived state, so we just check if any exist first for the alert
        const hasNotes = logs.some(log => log.type === collection.type);

        if (!hasNotes) {
            showAlert(
                "No Notes",
                `There are no notes in "${collection.title}" yet.`,
                [{ text: "OK", onPress: hideAlert }]
            );
        } else {
            setSelectedCollectionType(collection.type);
            setSelectedCollectionTitle(collection.title);
            setIsNoteListVisible(true);
        }
    };

    const [selectedNoteInitialEditMode, setSelectedNoteInitialEditMode] = useState(false);

    const handleNoteClick = (note, editMode = false) => {
        setSelectedNoteDetail(note);
        setSelectedNoteInitialEditMode(editMode);
        setIsNoteDetailVisible(true);
    };

    const closeNoteDetail = () => {
        setIsNoteDetailVisible(false);
        setSelectedNoteDetail(null);
        setSelectedNoteInitialEditMode(false);
    };

    const closeNoteList = () => {
        setIsNoteListVisible(false);
        setSelectedCollectionType(null);
        setSelectedCollectionTitle('');
    };

    const gridData = useMemo(() => {
        // combine context collections with 'View All'
        const data = [...collections, { id: 'ViewAll', title: 'View All', type: 'All' }];

        // Add "Add New" button as the last item
        data.push({ id: 'AddCustom', title: '+ New', type: '__ADD__', isAction: true });

        if (data.length % 2 !== 0) {
            data.push({ id: 'spacer', isPlaceholder: true });
        }
        return data;
    }, [collections]);

    const counts = useMemo(() => {
        const temp = {};
        logs.forEach(log => {
            const type = log.type || 'Other';
            temp[type] = (temp[type] || 0) + 1;
        });
        temp.All = logs.length;
        return temp;
    }, [logs]);

    const handleCreateCollection = () => {
        if (!newCollectionName.trim()) return;
        addCollection(newCollectionName.trim());
        setNewCollectionName('');
        setIsModalVisible(false);
    };

    const handleEditCollection = async () => {
        if (!editedName.trim()) return;
        const success = await updateCollection(editingCollection.id, editedName.trim());
        if (success) {
            setEditedName('');
            setEditingCollection(null);
            setIsEditModalVisible(false);
        }
    };

    const openEditModal = (collection) => {
        setEditingCollection(collection);
        setEditedName(collection.title);
        setIsEditModalVisible(true);
    };

    return (
        <TouchableWithoutFeedback onPress={closeAllSwipeables}>
            <View style={[styles.container, { backgroundColor: isNoteListVisible ? themeColors.background : themeColors.background, paddingTop: insets.top }]}>

                {/* Full Screen Note List View */}
                {isNoteListVisible ? (
                    <View style={[styles.fullScreenContainer, { backgroundColor: themeColors.background }]}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={closeNoteList} style={styles.backBtn}>
                                <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: themeColors.text }]}>{selectedCollectionTitle}</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView
                            style={styles.noteListScroll}
                            contentContainerStyle={{ paddingBottom: 120 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {selectedCollectionNotes.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No notes in this collection yet.</Text>
                                </View>
                            ) : (
                                selectedCollectionNotes.map((note) => {
                                    const renderNoteLeftActions = (progress, dragX) => {
                                        return (
                                            <TouchableOpacity
                                                style={styles.editActionNote}
                                                onPress={() => {
                                                    // Close swipeable
                                                    swipeableRefs.current[`note-${note.id}`]?.close();
                                                    handleNoteClick(note, true);
                                                }}
                                            >
                                                <Ionicons name="pencil-outline" size={24} color="#FFF" />
                                            </TouchableOpacity>
                                        );
                                    };

                                    return (
                                        <Swipeable
                                            key={note.id}
                                            ref={(ref) => swipeableRefs.current[`note-${note.id}`] = ref}
                                            renderLeftActions={renderNoteLeftActions}
                                            onSwipeableLeftOpen={() => {
                                                swipeableRefs.current[`note-${note.id}`]?.close();
                                                handleNoteClick(note, true);
                                            }}
                                        >
                                            <TouchableOpacity
                                                style={styles.noteRow}
                                                onPress={() => handleNoteClick(note, false)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.noteRowContent}>
                                                    <Text style={[styles.noteRowTitle, { color: themeColors.text }]} numberOfLines={2}>
                                                        {note.summary || note.originalInput || "No content"}
                                                    </Text>
                                                    <Text style={styles.noteRowMeta}>
                                                        {note.type}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        </Swipeable>
                                    );
                                })
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                ) : (
                    /* Default Grid View */
                    <>
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Collections</Text>
                            <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectBtn}>
                                <Ionicons
                                    name={isSelectionMode ? "close-circle" : "checkmark-circle-outline"}
                                    size={24}
                                    color={isSelectionMode ? "#EF4444" : "#3B82F6"}
                                />
                            </TouchableOpacity>
                        </View>

                        {isSelectionMode && (
                            <View style={styles.selectionBar}>
                                <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
                                    <Text style={styles.selectAllText}>Select All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleBulkDelete}
                                    style={[styles.deleteBtn, selectedCollections.length === 0 && styles.deleteBtnDisabled]}
                                    disabled={selectedCollections.length === 0}
                                >
                                    <Ionicons name="trash" size={18} color="#FFF" />
                                    <Text style={styles.deleteBtnText}>
                                        Delete ({selectedCollections.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <ScrollView
                            contentContainerStyle={styles.contentContainer}
                            showsVerticalScrollIndicator={false}
                            onScrollBeginDrag={closeAllSwipeables}
                        >
                            <View style={styles.grid}>
                                {gridData.map((item) => {
                                    if (item.isPlaceholder) {
                                        return <View key={item.id} style={styles.placeholderCard} />;
                                    }

                                    if (item.isAction) {
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.card,
                                                    styles.addCard,
                                                    {
                                                        backgroundColor: themeColors?.card || '#FFFFFF',
                                                        borderColor: themeColors?.border || '#F3F4F6',
                                                        borderWidth: 1,
                                                    },
                                                ]}
                                                activeOpacity={0.7}
                                                onPress={() => setIsModalVisible(true)}
                                            >
                                                <View style={[styles.cardContent, { justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Ionicons name="add" size={24} color={themeColors?.placeholder || '#9CA3AF'} />
                                                    <Text style={[styles.cardTitle, { color: themeColors?.placeholder || '#9CA3AF', fontSize: 13 }]}>New Collection</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }

                                    const isSwipeable = item.type !== 'All';

                                    if (isSwipeable) {
                                        const handleDelete = () => {
                                            showAlert(
                                                "Delete Collection",
                                                `Are you sure you want to delete "${item.title}"? All notes in this collection will also be deleted.`,
                                                [
                                                    { text: "Cancel", style: "cancel", onPress: hideAlert },
                                                    {
                                                        text: "Delete",
                                                        style: "destructive",
                                                        onPress: () => {
                                                            hideAlert();
                                                            deleteCollection(item.id);
                                                        }
                                                    }
                                                ]
                                            );
                                        };

                                        const renderLeftActions = (progress, dragX) => {
                                            // Only show edit for custom collections
                                            if (!item.is_custom) return null;

                                            return (
                                                <TouchableOpacity
                                                    style={styles.editAction}
                                                    onPress={() => {
                                                        swipeableRefs.current[item.id]?.close();
                                                        openEditModal(item);
                                                    }}
                                                >
                                                    <Ionicons name="pencil-outline" size={24} color="#FFF" />
                                                </TouchableOpacity>
                                            );
                                        };

                                        const renderRightActions = (progress, dragX) => {
                                            // Only allow delete for custom collections
                                            if (!item.is_custom) return null;

                                            return (
                                                <TouchableOpacity
                                                    style={styles.deleteAction}
                                                    onPress={() => {
                                                        swipeableRefs.current[item.id]?.close();
                                                        handleDelete();
                                                    }}
                                                >
                                                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                                                </TouchableOpacity>
                                            );
                                        };

                                        return (
                                            <View key={item.id} style={styles.cardContainer}>
                                                <Swipeable
                                                    ref={(ref) => swipeableRefs.current[item.id] = ref}
                                                    renderLeftActions={renderLeftActions}
                                                    renderRightActions={renderRightActions}
                                                    onSwipeableLeftOpen={() => {
                                                        if (item.is_custom) {
                                                            swipeableRefs.current[item.id]?.close();
                                                            openEditModal(item);
                                                        }
                                                    }}
                                                    onSwipeableRightOpen={() => {
                                                        if (item.is_custom) {
                                                            swipeableRefs.current[item.id]?.close();
                                                            handleDelete();
                                                        }
                                                    }}
                                                >
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.card,
                                                            styles.fullWidthCard,
                                                            {
                                                                backgroundColor: themeColors?.card || '#FFFFFF',
                                                                borderColor: selectedCollections.includes(item.id) ? '#3B82F6' : (themeColors?.border || '#F3F4F6'),
                                                                borderWidth: selectedCollections.includes(item.id) ? 2 : 1,
                                                            },
                                                        ]}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            if (isSelectionMode && item.is_custom) {
                                                                toggleSelection(item.id);
                                                            } else {
                                                                closeAllSwipeables();
                                                                if (item.type === 'All') {
                                                                    onSelectCategory?.(item.type);
                                                                } else {
                                                                    handleCollectionClick(item);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {isSelectionMode && item.is_custom && (
                                                            <View style={styles.checkbox}>
                                                                <Ionicons
                                                                    name={selectedCollections.includes(item.id) ? "checkmark-circle" : "ellipse-outline"}
                                                                    size={24}
                                                                    color={selectedCollections.includes(item.id) ? "#3B82F6" : "#9CA3AF"}
                                                                />
                                                            </View>
                                                        )}
                                                        <View style={styles.cardContent}>
                                                            <Text style={[styles.cardTitle, { color: themeColors?.text }]}>{item.title}</Text>
                                                            <Text style={styles.cardCount}>
                                                                {counts[item.type] || 0} notes
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </Swipeable>
                                            </View>
                                        );
                                    }

                                    // Non-Swipeable Card (Only for 'View All')
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.card,
                                                {
                                                    backgroundColor: themeColors?.card || '#FFFFFF',
                                                    borderColor: themeColors?.border || '#F3F4F6',
                                                },
                                            ]}
                                            activeOpacity={0.7}
                                            onPress={() => onSelectCategory?.(item.type)}
                                        >
                                            <View style={styles.cardContent}>
                                                <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={2}>{item.title}</Text>
                                                <Text style={styles.cardCount}>
                                                    {counts[item.type] || 0} notes
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </>
                )}

                <Modal
                    visible={isModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsModalVisible(false)}
                    statusBarTranslucent={true}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Collection</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: themeColors.inputBackground || themeColors.background, color: themeColors.text, borderColor: themeColors.border, borderWidth: 1 }]}
                                placeholder="e.g., Recipes, Project X"
                                placeholderTextColor={themeColors.placeholder || '#9CA3AF'}
                                value={newCollectionName}
                                onChangeText={setNewCollectionName}
                                autoFocus={true}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]}>
                                    <Text style={[styles.cancelText, { color: themeColors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCreateCollection} style={styles.createBtn}>
                                    <Text style={styles.createText}>Create</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Edit Collection Modal */}
                <Modal
                    visible={isEditModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsEditModalVisible(false)}
                    statusBarTranslucent={true}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Collection</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: themeColors.inputBackground || themeColors.background, color: themeColors.text, borderColor: themeColors.border, borderWidth: 1 }]}
                                placeholder="Collection name"
                                placeholderTextColor={themeColors.placeholder || '#9CA3AF'}
                                value={editedName}
                                onChangeText={setEditedName}
                                autoFocus={true}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]}>
                                    <Text style={[styles.cancelText, { color: themeColors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleEditCollection} style={styles.createBtn}>
                                    <Text style={styles.createText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <MemoDetailModal
                    isVisible={isNoteDetailVisible}
                    onClose={closeNoteDetail}
                    memo={selectedNoteDetail}
                    initialEditMode={selectedNoteInitialEditMode}
                    onMemoUpdate={(id, updates) => {
                        updateLog(id, updates); // Update local state
                    }}
                />

                <CustomAlert
                    visible={alertVisible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={alertConfig.buttons}
                    onClose={hideAlert}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 8,
    },
    selectBtn: {
        padding: 4,
    },
    selectionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 8,
    },
    selectAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    selectAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    deleteBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    deleteBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    checkbox: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 120,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        color: '#111827',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 6,
    },
    // Modified Card Styles to support Swipeable
    cardContainer: {
        width: '49%',
        marginBottom: 2,
    },
    fullWidthCard: {
        width: '100%',
        marginBottom: 0,
    },
    card: {
        width: '49%', // Default for non-swipeable
        aspectRatio: 2.0,
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        marginBottom: 2,
        justifyContent: 'flex-end',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.01,
        shadowRadius: 3,
        elevation: 1,
    },
    addCard: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderCard: {
        width: '49%',
        aspectRatio: 2.0,
    },
    cardContent: {
        justifyContent: 'flex-end',
        flex: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    cardCount: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 1,
    },
    // Swipe Action
    editAction: {
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: '100%',
        borderRadius: 16,
        marginRight: 8,
    },
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: '100%',
        borderRadius: 16,
        marginLeft: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#FFF',
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 24,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center'
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 24
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },
    cancelBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center'
    },
    createBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        alignItems: 'center'
    },
    cancelText: {
        fontWeight: '600',
        color: '#374151'
    },
    createText: {
        fontWeight: '600',
        color: '#FFF'
    },
    // Full Screen Note List Styles
    fullScreenContainer: {
        flex: 1,
    },
    backBtn: {
        padding: 4,
        marginRight: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    noteListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 24,
    },
    noteListScroll: {
        flex: 1,
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingHorizontal: 24,
    },
    noteRowContent: {
        flex: 1,
        marginRight: 12,
    },
    noteRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 4,
    },
    noteRowMeta: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    editActionNote: {
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: '100%',
        borderRadius: 0, // No radius for list items usually, or match row? List items are flat. 
        // But the list item has padding? No, noteRow has styling.
        // Let's keep it simple.
    },
});