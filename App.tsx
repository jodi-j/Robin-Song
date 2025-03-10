import React, { useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { app } from './database/firebaseConfig';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import RootLayout from './frontend/app/RootLayout';

//Firebase Auth Instance
const auth = getAuth(app);

export default function App() {
    const [loaded, error] = useFonts({
        'Caprasimo': require('./frontend/assets/fonts/Caprasimo.ttf'),
        'Radio Canada': require('./frontend/assets/fonts/RadioCanadaVariable.ttf'),
        'Radio Canada Italic': require('./frontend/assets/fonts/RadioCanadaItalic.ttf'),
    });

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setIsLoading(false);
        });
        return unsubscribe;
    }, []);

    if (isLoading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <RootLayout />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'colors.background',
        alignItems: 'center',
        justifyContent: 'center',
    },
});