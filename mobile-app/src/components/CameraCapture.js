import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export const CameraCapture = ({ onCapture, isProcessing }) => {

    const pickImage = async () => {
        if (isProcessing) return;

        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("You've refused to allow this app to access your camera!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            onCapture(result.assets[0].uri);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            disabled={isProcessing}
            onPress={pickImage}
            style={styles.button}
        >
            <Ionicons name="camera-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 8,
        marginLeft: 16,
    },
});
