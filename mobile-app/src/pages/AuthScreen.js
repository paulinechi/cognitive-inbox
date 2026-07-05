import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export default function AuthScreen() {
    const { colors: themeColors, isDark } = useTheme();
    const { login, register } = useAuth();
    const { t } = useLocale();
    const insets = useSafeAreaInsets();

    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isLogin = mode === 'login';

    const handleSubmit = async () => {
        if (loading) return;
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setError(t('enterEmailPassword'));
            return;
        }
        if (!isLogin && password.length < 8) {
            setError(t('passwordTooShort'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (isLogin) {
                await login(trimmedEmail, password);
            } else {
                await register(trimmedEmail, password);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(isLogin ? 'register' : 'login');
        setError(null);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: themeColors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={[styles.logoCircle, { backgroundColor: themeColors.tint }]}>
                        <Ionicons name="sparkles" size={28} color={isDark ? '#111827' : '#FFFFFF'} />
                    </View>
                    <Text style={[styles.title, { color: themeColors.text }]}>Cognitive Inbox</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                        {isLogin ? t('welcomeBack') : t('createAccount')}
                    </Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBackground,
                            borderColor: themeColors.border,
                            color: themeColors.text,
                        }]}
                        placeholder={t('email')}
                        placeholderTextColor={themeColors.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        textContentType="emailAddress"
                    />

                    <View style={styles.passwordRow}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, {
                                backgroundColor: themeColors.inputBackground,
                                borderColor: themeColors.border,
                                color: themeColors.text,
                            }]}
                            placeholder={t('password')}
                            placeholderTextColor={themeColors.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            textContentType={isLogin ? 'password' : 'newPassword'}
                            onSubmitEditing={handleSubmit}
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(prev => !prev)}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={themeColors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {error && (
                        <Text style={styles.error}>{error}</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: themeColors.tint }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={isDark ? '#111827' : '#FFFFFF'} />
                        ) : (
                            <Text style={[styles.submitText, { color: isDark ? '#111827' : '#FFFFFF' }]}>
                                {isLogin ? t('signIn') : t('signUp')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
                        <Text style={[styles.switchText, { color: themeColors.textSecondary }]}>
                            {isLogin ? t('noAccountYet') : t('alreadyHaveAccount')}
                            <Text style={{ color: themeColors.text, fontWeight: '600' }}>
                                {isLogin ? t('signUp') : t('signIn')}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
    },
    form: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        marginBottom: 12,
    },
    passwordRow: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 48,
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        top: 15,
    },
    error: {
        color: '#EF4444',
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 4,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
    },
    switchButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchText: {
        fontSize: 14,
    },
});
