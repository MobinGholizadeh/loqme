'use client';

import React, { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}) => {
  // ESC key listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={cn('modal-dialog', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          {title && <h3 className="modal-title">{title}</h3>}
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          background-color: rgba(9, 9, 11, 0.5);
          backdrop-filter: blur(8px);
          animation: fadeIn 180ms var(--ease-out);
        }

        .modal-dialog {
          width: 100%;
          max-width: 480px;
          background-color: var(--color-bg-surface);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border-subtle);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* Emil Kowalski guideline: Start from scale(0.95), never scale(0) */
          animation: modalEnter 220ms var(--ease-out);
          transform-origin: center;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .modal-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 1.125rem;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          transition: background-color 150ms ease, color 150ms ease;
        }

        .modal-close-btn:hover {
          background-color: var(--loqme-neutral-100);
          color: var(--color-text-primary);
        }

        .modal-body {
          padding: var(--space-5);
          max-height: calc(85vh - 140px);
          overflow-y: auto;
          color: var(--color-text-secondary);
          line-height: var(--line-height-relaxed);
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-5);
          border-top: 1px solid var(--color-border-subtle);
          background-color: var(--loqme-neutral-25);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
