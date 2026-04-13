/**
 * 协作者光标组件
 * 显示其他用户的光标位置
 */
import React from 'react';
import { CollaborationUser, CursorPosition } from '../services/socketService';

interface CursorOverlayProps {
  cursors: Map<string, { user: CollaborationUser; position: CursorPosition }>;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {Array.from(cursors.entries()).map(([userId, { user, position }]) => (
        <div
          key={userId}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-2px, -2px)'
          }}
        >
          {/* 光标图标 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-md"
          >
            <path
              d="M5.5 3.21V20.8l4.38-4.38 3.59 8.59 2.59-2.59-2.59-2.59 4.38-4.38H5.5z"
              fill="#3B82F6"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          {/* 用户名标签 */}
          <div
            className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: getUserColor(user.userId) }}
          >
            {user.username}
          </div>
        </div>
      ))}
    </div>
  );
};

// 根据用户ID生成稳定的颜色
const getUserColor = (userId: string): string => {
  const colors = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
    '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
};

export default CursorOverlay;
