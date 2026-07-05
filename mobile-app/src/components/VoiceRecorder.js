import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import {
    useAudioRecorder,
    RecordingPresets,
    AudioModule,
    setAudioModeAsync,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

export const VoiceRecorder = ({ onRecordingComplete, isProcessing }) => {
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const [isRecording, setIsRecording] = useState(false);

    async function startRecording() {
        try {
            const permission = await AudioModule.requestRecordingPermissionsAsync();
            if (!permission.granted) {
                console.log('Microphone permission not granted');
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            console.log('Starting recording..');
            await recorder.prepareToRecordAsync();
            recorder.record();
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        setIsRecording(false);
        await recorder.stop();

        await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: true,
        });

        const uri = recorder.uri;
        console.log('Recording stopped and stored at', uri);

        if (onRecordingComplete && uri) {
            onRecordingComplete(uri);
        }
    }

    const handlePress = () => {
        if (isProcessing) return;

        if (isRecording) {
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
