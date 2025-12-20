// src/lib/auth.ts
import { supabase } from './supabase.ts';

export async function handleGoogleSignIn(redirectToRoute: string = '/create') {
    // We strip any trailing slashes and ensure a clean URL structure
    const baseOrigin = window.location.origin.replace(/\/$/, "");
    const finalRedirect = `${baseOrigin}${redirectToRoute}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // This URL MUST be exactly what is in your Supabase Redirect URLs list
            redirectTo: finalRedirect 
        }
    });

    if (error) {
        console.error('Google Sign-In Error:', error.message);
        return false;
    }
    return true;
}