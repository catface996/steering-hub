import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Typography, Input, Button, Flex } from 'antd';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DeleteConfirmOptions {
  title?: string;
  description?: string;
  confirmName?: string;
  onConfirm: () => void;
}

interface SuccessOptions {
  title?: string;
  description?: string;
  onClose?: () => void;
}

interface ErrorOptions {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

interface ModalContextValue {
  confirm: {
    delete: (options: DeleteConfirmOptions) => void;
  };
  alert: {
    success: (options?: SuccessOptions) => void;
    error: (options?: ErrorOptions) => void;
  };
}

const ModalContext = createContext<ModalContextValue | null>(null);

type ModalType = 'delete' | 'success' | 'error';

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const optionsRef = useRef<Record<string, unknown>>({});

  const open = useCallback((type: ModalType, options: Record<string, unknown> = {}) => {
    optionsRef.current = options;
    setConfirmInput('');
    setActiveModal(type);
  }, []);

  const close = useCallback(() => {
    setActiveModal(null);
    optionsRef.current = {};
  }, []);

  const value = useMemo<ModalContextValue>(() => ({
    confirm: {
      delete: (opts) => open('delete', opts as unknown as Record<string, unknown>),
    },
    alert: {
      success: (opts) => open('success', (opts ?? {}) as Record<string, unknown>),
      error: (opts) => open('error', (opts ?? {}) as Record<string, unknown>),
    },
  }), [open]);

  const opts = optionsRef.current;
  const confirmName = opts.confirmName as string | undefined;
  const needsInput = !!confirmName;
  const canConfirm = !needsInput || confirmInput === confirmName;

  return (
    <ModalContext.Provider value={value}>
      {children}

      {/* Delete Confirm Modal */}
      <Modal
        open={activeModal === 'delete'}
        onCancel={close}
        footer={null}
        closable={false}
        width={420}
      >
        <Flex vertical align="center" gap={16} style={{ padding: '16px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(248, 113, 113, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} color="#f87171" />
          </div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {(opts.title as string) || '确认删除'}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
            {(opts.description as string) || '此操作不可撤销。'}
          </Typography.Text>
          {needsInput && (
            <div style={{ width: '100%' }}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                请输入 <strong style={{ color: '#f4f4f5' }}>{confirmName}</strong> 以确认
              </Typography.Text>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
          <Flex gap={12} style={{ width: '100%' }}>
            <Button block onClick={close}>取消</Button>
            <Button
              block
              danger
              type="primary"
              disabled={!canConfirm}
              onClick={() => {
                const cb = optionsRef.current.onConfirm as (() => void) | undefined;
                cb?.();
                close();
              }}
            >
              删除
            </Button>
          </Flex>
        </Flex>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={activeModal === 'success'}
        onCancel={() => {
          const cb = optionsRef.current.onClose as (() => void) | undefined;
          cb?.();
          close();
        }}
        footer={null}
        closable={false}
        width={380}
      >
        <Flex vertical align="center" gap={16} style={{ padding: '16px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74, 222, 128, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#4ade80" />
          </div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {(opts.title as string) || '操作成功'}
          </Typography.Title>
          {opts.description != null && (
            <Typography.Text type="secondary">{String(opts.description)}</Typography.Text>
          )}
          <Button
            type="primary"
            block
            onClick={() => {
              const cb = optionsRef.current.onClose as (() => void) | undefined;
              cb?.();
              close();
            }}
          >
            确定
          </Button>
        </Flex>
      </Modal>

      {/* Error Modal */}
      <Modal
        open={activeModal === 'error'}
        onCancel={close}
        footer={null}
        closable={false}
        width={380}
      >
        <Flex vertical align="center" gap={16} style={{ padding: '16px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(248, 113, 113, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={24} color="#f87171" />
          </div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {(opts.title as string) || '操作失败'}
          </Typography.Title>
          {opts.description != null && (
            <Typography.Text type="secondary">{String(opts.description)}</Typography.Text>
          )}
          <Flex gap={12} style={{ width: '100%' }}>
            <Button block onClick={close}>关闭</Button>
            {opts.onRetry != null && (
              <Button
                type="primary"
                block
                onClick={() => {
                  const cb = optionsRef.current.onRetry as (() => void) | undefined;
                  cb?.();
                  close();
                }}
              >
                重试
              </Button>
            )}
          </Flex>
        </Flex>
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal() must be used within <ModalProvider>');
  }
  return ctx;
}
