import React from 'react';

export default function AnimatedBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
            {/* Layer 1: Base Ambient Gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.06),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.04),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.03),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(147,51,234,0.03),transparent_55%)]" />
            
            {/* Layer 2: Overlay Ambient Gradients with GPU-accelerated slow breathing animation */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.04),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.03),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.02),transparent_50%)] animate-pulse-gradient" />
        </div>
    );
}
