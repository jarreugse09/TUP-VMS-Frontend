import {
  Modal,
  Select,
  DatePicker,
  Input,
  Space,
  Typography,
  Button,
} from 'antd';
import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ExportModalProps {
  open: boolean;
  onCancel: () => void;
  onExport: () => void;
  exporting: boolean;
  exportMode: 'month' | 'range';
  onExportModeChange: (mode: 'month' | 'range') => void;
  exportMonth: any;
  onExportMonthChange: (date: any) => void;
  exportRange: any;
  onExportRangeChange: (dates: any) => void;
  exportFormat: 'csv' | 'xlsx';
  onExportFormatChange: (format: 'csv' | 'xlsx') => void;
  exportPassword: string;
  onExportPasswordChange: (password: string) => void;
  exportRole?: string;
  onExportRoleChange?: (role: string | undefined) => void;
  showRoleFilter?: boolean;
  title?: string;
  description?: string;
}

const ExportModal = ({
  open,
  onCancel,
  onExport,
  exporting,
  exportMode,
  onExportModeChange,
  exportMonth,
  onExportMonthChange,
  exportRange,
  onExportRangeChange,
  exportFormat,
  onExportFormatChange,
  exportPassword,
  onExportPasswordChange,
  exportRole,
  onExportRoleChange,
  showRoleFilter = false,
  title = 'Export Logs',
  description = 'Export log data for a specific month or date range. For security, you must confirm your account password before the download will start.',
}: ExportModalProps) => {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onExport}
      okText="Export"
      confirmLoading={exporting}
      width="90%"
      style={{ maxWidth: 500 }}
    >
      <p>{description}</p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Select
          value={exportMode}
          onChange={v => onExportModeChange(v as any)}
          style={{ flex: 1, minWidth: 120 }}
        >
          <Option value="month">Month</Option>
          <Option value="range">Date Range</Option>
        </Select>

        {exportMode === 'month' ? (
          <DatePicker
            picker="month"
            onChange={d => onExportMonthChange(d)}
            style={{ flex: 1, minWidth: 150 }}
          />
        ) : (
          <RangePicker
            onChange={d => onExportRangeChange(d)}
            style={{ flex: 1, minWidth: 200 }}
          />
        )}
      </div>

      <Space direction="vertical" style={{ width: '100%' }}>
        {showRoleFilter && onExportRoleChange && (
          <Select
            value={exportRole}
            onChange={v => onExportRoleChange(v || undefined)}
            style={{ width: '100%' }}
            placeholder="All Roles"
            allowClear
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
        )}

        <Select
          value={exportFormat}
          onChange={v => onExportFormatChange(v as any)}
          style={{ width: '100%' }}
        >
          <Option value="csv">CSV</Option>
          <Option value="xlsx">Excel (.xlsx)</Option>
        </Select>

        <Input.Password
          placeholder="Confirm your password"
          value={exportPassword}
          onChange={e => onExportPasswordChange(e.target.value)}
        />
      </Space>
    </Modal>
  );
};

export default ExportModal;
