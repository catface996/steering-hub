import { ConfigProvider, Modal, Typography, theme } from 'antd';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: React.ReactNode;
  okText: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 统一二次确认弹窗组件。
 * 使用受控 <Modal> + ConfigProvider 暗色主题，确保弹窗样式与整体一致。
 * 所有不可逆操作（删除、禁用、废弃等）必须使用此组件。
 */
export default function ConfirmModal({
  open,
  title,
  content,
  okText,
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <Modal
        open={open}
        onCancel={onCancel}
        onOk={onConfirm}
        title={title}
        okText={okText}
        cancelText="取消"
        okButtonProps={{ danger: true, loading }}
      >
        <Typography.Text type="secondary">{content}</Typography.Text>
      </Modal>
    </ConfigProvider>
  );
}

