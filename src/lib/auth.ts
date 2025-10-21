// src/auth.ts
import { supabase } from './supabase.ts';

export async function handleGoogleSignIn(redirectToRoute: string = '/create') {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // This is the URL Supabase will redirect the user to AFTER a successful sign-in.
            redirectTo: `${window.location.origin}${redirectToRoute}` 
        }
    });

    if (error) {
        console.error('Google Sign-In Error:', error.message);
        return false;
    }
    return true;
}