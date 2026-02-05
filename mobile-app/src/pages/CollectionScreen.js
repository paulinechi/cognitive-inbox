import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme } from '../context/ThemeContext';
import { useLogs } from '../context/LogContext';
import { Ionicons } from '@expo/vector-icons';

export default function CollectionScreen({ onSelectCategory }) {
    const { colors: themeColors } = useTheme();
    const { logs, collections, addCollection, deleteCollection } = useLogs();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

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

    return (
        <View style={[styles.container, { backgroundColor: '#F9F9FB' }]}>
            <ScrollView
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.headerTitle}>Collections</Text>

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
                                            backgroundColor: 'transparent',
                                            borderColor: themeColors?.border || '#E5E7EB',
                                            borderStyle: 'dashed',
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
                                Alert.alert(
                                    "Delete Collection",
                                    `Are you sure you want to delete "${item.title}"? All notes in this collection will also be deleted.`,
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Delete",
                                            style: "destructive",
                                            onPress: () => deleteCollection(item.type)
                                        }
                                    ]
                                );
                            };

                            const renderRightActions = (progress, dragX) => {
                                return (
                                    <TouchableOpacity
                                        style={styles.deleteAction}
                                        onPress={handleDelete}
                                    >
                                        <Ionicons name="trash-outline" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                );
                            };

                            return (
                                <View key={item.id} style={styles.cardContainer}>
                                    <Swipeable renderRightActions={renderRightActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.card,
                                                styles.fullWidthCard,
                                                {
                                                    backgroundColor: themeColors?.card || '#FFFFFF',
                                                    borderColor: themeColors?.border || '#F3F4F6',
                                                },
                                            ]}
                                            activeOpacity={0.7}
                                            onPress={() => onSelectCategory?.(item.type)}
                                        >
                                            <View style={styles.cardContent}>
                                                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
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
                                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                                    <Text style={styles.cardCount}>
                                        {counts[item.type] || 0} notes
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Collection</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Recipes, Project X"
                            value={newCollectionName}
                            onChangeText={setNewCollectionName}
                            autoFocus={true}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateCollection} style={styles.createBtn}>
                                <Text style={styles.createText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    }
});