import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export const VoiceRecorder = ({ onRecordingComplete, isProcessing }) => {
    const [recording, setRecording] = useState(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [isRecording, setIsRecording] = useState(false);

    async function startRecording() {
        try {
            if (permissionResponse.status !== 'granted') {
                console.log('Requesting permission..');
                await requestPermission();
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        setIsRecording(false);
        setRecording(undefined);
        await recording.stopAndUnloadAsync();

        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        if (onRecordingComplete) {
            onRecordingComplete(uri);
        }
    }

    const handlePress = () => {
        if (isProcessing) return;

        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            disabled={isProcessing}
            onPress={handlePress}
            style={[
                styles.button,
                isRecording && styles.buttonRecording
            ]}
        >
            {isProcessing ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={isRecording ? "stop-circle-outline" : "mic-outline"}
                        size={24}
                        color={isRecording ? "#EF4444" : "#9CA3AF"}
                    />
                    {isRecording && (
                        <View style={styles.recordingIndicator} />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: 9999,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    buttonRecording: {
        backgroundColor: '#FEF2F2',
    },
    iconContainer: {
        position: 'relative',
    },
    recordingIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 10,
        height: 10,
        backgroundColor: '#EF4444',
        borderRadius: 5,
    },
});
