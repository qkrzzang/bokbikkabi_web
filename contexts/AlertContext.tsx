'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AlertState {
  title?: string
  message: string
  icon?: string
  onClose?: () => void
  isConfirm?: boolean
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

interface AlertContextType {
  showAlert: (message: string, options?: { title?: string; icon?: string; onClose?: () => void }) => void
  showSuccess: (message: string, options?: { title?: string; onClose?: () => void }) => void
  showError: (message: string, options?: { title?: string; onClose?: () => void }) => void
  showWarning: (message: string, options?: { title?: string; onClose?: () => void }) => void
  showConfirm: (message: string, onConfirm: () => void, options?: { title?: string; icon?: string; confirmText?: string; cancelText?: string }) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState | null>(null)

  const closeAlert = useCallback(() => {
    const onClose = alertState?.onClose
    setAlertState(null)
    onClose?.()
  }, [alertState])

  const showAlert = useCallback((message: string, options?: { title?: string; icon?: string; onClose?: () => void }) => {
    setAlertState({ message, title: options?.title || '알림', icon: options?.icon || 'ℹ️', onClose: options?.onClose })
  }, [])

  const showSuccess = useCallback((message: string, options?: { title?: string; onClose?: () => void }) => {
    setAlertState({ message, title: options?.title || '완료', icon: '✅', onClose: options?.onClose })
  }, [])

  const showError = useCallback((message: string, options?: { title?: string; onClose?: () => void }) => {
    setAlertState({ message, title: options?.title || '오류', icon: '❌', onClose: options?.onClose })
  }, [])

  const showWarning = useCallback((message: string, options?: { title?: string; onClose?: () => void }) => {
    setAlertState({ message, title: options?.title || '주의', icon: '⚠️', onClose: options?.onClose })
  }, [])

  const showConfirm = useCallback((message: string, onConfirm: () => void, options?: { title?: string; icon?: string; confirmText?: string; cancelText?: string }) => {
    setAlertState({
      message,
      title: options?.title || '확인',
      icon: options?.icon || '❓',
      isConfirm: true,
      onConfirm,
      confirmText: options?.confirmText || '확인',
      cancelText: options?.cancelText || '취소',
    })
  }, [])

  return (
    <AlertContext.Provider value={{ showAlert, showSuccess, showError, showWarning, showConfirm }}>
      {children}

      {/* 글로벌 서비스 팝업 */}
      {alertState && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            animation: 'alertFadeIn 0.2s ease',
            paddingTop: '64px',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
            boxSizing: 'border-box',
          }}
          onClick={closeAlert}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '360px',
              padding: '32px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              animation: 'alertSlideUp 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '4px' }}>{alertState.icon}</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {alertState.title}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              lineHeight: '1.6',
              margin: 0,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-line',
            }}>
              {alertState.message}
            </p>
            {alertState.isConfirm ? (
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setAlertState(null)
                  }}
                  style={{
                    padding: '12px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    background: '#fff',
                    color: '#64748b',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                >
                  {alertState.cancelText || '취소'}
                </button>
                <button
                  onClick={() => {
                    const onConfirm = alertState.onConfirm
                    setAlertState(null)
                    onConfirm?.()
                  }}
                  style={{
                    padding: '12px 32px',
                    border: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                    transition: 'transform 0.1s',
                  }}
                >
                  {alertState.confirmText || '확인'}
                </button>
              </div>
            ) : (
              <button
                onClick={closeAlert}
                style={{
                  marginTop: '8px',
                  padding: '12px 48px',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                  transition: 'transform 0.1s',
                }}
              >
                확인
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes alertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes alertSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    // fallback: context 없으면 시스템 alert 사용
    return {
      showAlert: (msg: string) => alert(msg),
      showSuccess: (msg: string) => alert(msg),
      showError: (msg: string) => alert(msg),
      showWarning: (msg: string) => alert(msg),
      showConfirm: (msg: string, onConfirm: () => void) => { if (confirm(msg)) onConfirm() },
    }
  }
  return context
}
