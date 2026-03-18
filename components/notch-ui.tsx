"use client"
import { SafeArea } from 'capacitor-plugin-safe-area';

export async function NotchUI() {
    const { insets } = await SafeArea.getSafeAreaInsets();
    if (!insets) {
        return null;
    }
    
    return (
        <div
            className="text-white bg-black font-mono text-[11px] px-3 py-1 rounded-full"
        >
            车来车网
        </div>
    )
}