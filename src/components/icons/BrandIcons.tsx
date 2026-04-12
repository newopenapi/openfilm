/**
 * BrandIcons.tsx
 * 
 * Custom brand icons for AI providers (OpenAI, Google, Kling, Hailuo/MiniMax, etc.)
 * Uses inline SVGs with currentColor for theme compatibility.
 * Re-exports third-party brand icons for centralized access.
 */

import React from 'react';
import { Kling, Minimax } from '@lobehub/icons';

interface IconProps {
    size?: number;
    className?: string;
}

/**
 * OpenAI Logo Icon (hexagonal flower symbol)
 * Source: Bootstrap Icons
 */
export const OpenAIIcon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 16 16"
        className={className}
    >
        <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
    </svg>
);

/**
 * Google Logo Icon
 * Source: User provided SVG
 */
export const GoogleIcon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 16 16"
        className={className}
    >
        <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z" />
    </svg>
);

/**
 * Kling AI Logo Icon
 * Re-exported from @lobehub/icons for centralized brand icon access
 * Usage: <KlingIcon size={14} /> for colored version
 */
export const KlingIcon = Kling.Color;

/**
 * Hailuo AI (MiniMax) Logo Icon
 * Re-exported from @lobehub/icons for centralized brand icon access
 * Usage: <HailuoIcon size={14} /> for colored version
 */
export const HailuoIcon = Minimax.Color;

/**
 * Volcano Engine (火山方舟) Logo Icon
 * ByteDance's Volcano Engine platform logo
 * Usage: <VolcanoIcon size={14} />
 */
export const VolcanoIcon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
    >
        {/* Volcano flame icon - simplified brand representation */}
        <path
            d="M12 2C10.5 4 9 5 9 8C9 9.5 9.5 11 10 12H14C14.5 11 15 9.5 15 8C15 5 13.5 4 12 2Z"
            fill="#FF6B35"
        />
        <path
            d="M12 5C11 7 10 7.5 10 10C10 11 10.3 12 11 12H13C13.7 12 14 11 14 10C14 7.5 13 7 12 5Z"
            fill="#FF8C42"
        />
        {/* Mountain base */}
        <path
            d="M4 20L12 10L20 20H4Z"
            fill="#4A90D9"
        />
        <path
            d="M7 20L12 13L17 20H7Z"
            fill="#2D5A8A"
        />
    </svg>
);

/**
 * Volcano Engine Logo (Simplified flame-like icon)
 * Alternative icon for the Volcano/Seedance brand
 */
export const SeedanceIcon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 24 24"
        className={className}
    >
        <path d="M12 2L4 12l3 2-2 6 11-10-3-2 2-6z"/>
        <path d="M12 6l-4 5 1.5 1L12 9l2.5 3L16 11l-4-5z" fillOpacity="0.6"/>
    </svg>
);
