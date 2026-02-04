import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated, Dimensions, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { height } = Dimensions.get('window');

export const MemoDetailModal = ({ isVisible, onClose, memo }) => {
    const slideAnim = useRef(new Animated.Value(height)).current;
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);

    useEffect(() => {
        if (isVisible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
            }).start();
        } else {
            slideAnim.setValue(height);
            if (sound) {
                sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
            }
        }
    }, [isVisible]);

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const playAudio = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                setIsLoadingAudio(true);
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: memo.mediaUri },
                    { shouldPlay: true },
                    (status) => {
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                        }
                    }
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

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.backdrop}>
                <TouchableOpacity style={styles.backdropTouch} onPress={handleClose} />

                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <View style={styles.typesList}>
                                {memo.types && memo.types.map((type, index) => (
                                    <View key={index} style={styles.typeBadge}>
                                        <Text style={styles.typeBadgeText}>
                                            {type}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.timestamp}>
                                {memo.timestamp}
                            </Text>
                        </View>

                        <Text style={styles.summary}>
                            {memo.summary}
                        </Text>

                        {memo.mediaType === 'audio' && memo.mediaUri && (
                            <View style={styles.mediaSection}>
                                <Text style={styles.sectionTitle}>Audio Recording</Text>
                                <TouchableOpacity
                                    style={styles.audioButton}
                                    onPress={playAudio}
                                    disabled={isLoadingAudio}
                                >
                                    <Ionicons
                                        name={isPlaying ? "pause-circle" : "play-circle"}
                                        size={48}
                                        color="#000000"
                                    />
                                    <Text style={styles.audioButtonText}>
                                        {isLoadingAudio ? 'Loading...' : isPlaying ? 'Pause' : 'Play Recording'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.transcriptionContainer}>
                                    <Text style={styles.transcriptionLabel}>Transcription</Text>
                                    <Text style={styles.transcriptionText}>"{memo.summary}"</Text>
                                </View>
                            </View>
                        )}

                        {memo.mediaType === 'image' && memo.mediaUri && (
                            <View style={styles.mediaSection}>
                                <Text style={styles.sectionTitle}>Original Photo</Text>
                                <Image
                                    source={{ uri: memo.mediaUri }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            </View>
                        )}

                        <View style={styles.detailsContainer}>
                            {memo.action_items && memo.action_items.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                        Action Items
                                    </Text>
                                    <View style={styles.actionItemsContainer}>
                                        {memo.action_items.map((item, index) => (
                                            <View key={index} style={styles.actionItem}>
                                                <Ionicons name="checkbox-outline" size={16} color="#6B7280" />
                                                <Text style={styles.actionItemText}>
                                                    {item}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {memo.tags && memo.tags.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                        Tags
                                    </Text>
                                    <View style={styles.tagsContainer}>
                                        {memo.tags.map((tag, index) => (
                                            <View key={index} style={styles.tag}>
                                                <Text style={styles.tagText}>#{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {memo.summary !== memo.originalInput && !memo.mediaType && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                        Original Input
                                    </Text>
                                    <Text style={styles.originalInput}>
                                        "{memo.originalInput || 'Media Content'}"
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
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
        backgroundColor: '#FFFFFF',
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
    },
    typesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        flex: 1,
        marginRight: 12,
    },
    typeBadge: {
        backgroundColor: '#000000',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
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
    },
    summary: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        lineHeight: 32,
        marginBottom: 24,
    },
    mediaSection: {
        marginBottom: 24,
    },
    audioButton: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    audioButtonText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    transcriptionContainer: {
        marginTop: 16,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    transcriptionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    transcriptionText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#374151',
        fontStyle: 'italic',
    },
    image: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
    },
    detailsContainer: {
        gap: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    actionItemsContainer: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionItemText: {
        marginLeft: 8,
        color: '#374151',
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '500',
    },
    originalInput: {
        color: '#6B7280',
        fontSize: 14,
        lineHeight: 24,
        fontStyle: 'italic',
    },
});
