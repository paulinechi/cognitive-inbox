
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
    const { colors: themeColors, isDark } = useTheme();

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[
                            styles.alertContainer,
                            {
                                backgroundColor: themeColors.card,
                                borderColor: themeColors.border,
                                borderWidth: 1
                            }
                        ]}>
                            {title && (
                                <Text style={[
                                    styles.title,
                                    { color: themeColors.text }
                                ]}>
                                    {title}
                                </Text>
                            )}
                            {message && (
                                <Text style={[
                                    styles.message,
                                    { color: themeColors.textSecondary }
                                ]}>
                                    {message}
                                </Text>
                            )}

                            <View style={styles.buttonContainer}>
                                {buttons.map((btn, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            btn.style === 'destructive'
                                                ? { backgroundColor: '#EF4444' }
                                                : btn.style === 'cancel'
                                                    ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: themeColors.border }
                                                    : { backgroundColor: '#3B82F6' }
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            else if (onClose) onClose();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            {
                                                color: btn.style === 'cancel'
                                                    ? themeColors.text
                                                    : '#FFFFFF',
                                            }
                                        ]}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    alertContainer: {
        width: Math.min(width - 64, 300),
        borderRadius: 20,
        padding: 24,
        alignItems: 'flex-start',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'left',
        width: '100%'
    },
    message: {
        fontSize: 14,
        textAlign: 'left',
        marginBottom: 24,
        lineHeight: 20,
        width: '100%'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        gap: 12,
        marginTop: 8
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        minWidth: 80,
        alignItems: 'center',
        borderRadius: 12,
        justifyContent: 'center'
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});

export default CustomAlert;
