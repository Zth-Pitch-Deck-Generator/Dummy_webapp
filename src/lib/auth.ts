// src/lib/auth.ts
import { supabase } from './supabase.ts';

/**
 * Handles Google Sign-In with a dynamic redirect.
 * @param nextRoute The path to return to after login (defaults to current path)
 */
export async function handleGoogleSignIn(nextRoute?: string) {
    // 1. Get the current origin (e.g., https://smart-engine-deck-h7vd.onrender.com)
    const baseOrigin = window.location.origin;
    
    // 2. Determine where to send them. 
    // If nextRoute is provided, use it. Otherwise, use the current path they are on.
    const targetPath = nextRoute || window.location.pathname;

    // 3. Clean the path to prevent the /index.html 404 error
    // If the path is just "/" or empty, we send them to "/create" as a landing spot.
    const cleanPath = (targetPath === "/" || targetPath === "/index.html") ? "/create" : targetPath;

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // This builds the full URL dynamically: https://...com/investor-mockroom
            redirectTo: `${baseOrigin}${cleanPath}` 
        }
    });

    if (error) {
        console.error('Google Sign-In Error:', error.message);
        return false;
    }
    return true;
}