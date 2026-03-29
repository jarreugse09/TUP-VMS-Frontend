import {
  Drawer,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { Option } = Select;

interface Filters {
  name: string;
  role: string | undefined;
  dateRange: any;
}

interface LogFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onReset: () => void;
  roleOptions?: { value: string; label: string }[];
}

const LogFilterDrawer = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  onReset,
  roleOptions = [
    { value: 'Staff', label: 'Staff' },
    { value: 'Student', label: 'Student' },
    { value: 'Visitor', label: 'Visitor' },
  ],
}: LogFilterDrawerProps) => {
  return (
    <Drawer
      title={
        <Text strong style={{ fontSize: 18 }}>
          Filters
        </Text>
      }
      open={open}
      onClose={onClose}
      width={340}
      extra={
        <Button type="link" onClick={onReset}>
          Reset
        </Button>
      }
    >
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <section>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'block',
            }}
          >
            Search Identification
          </Text>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Search by name..."
            size="large"
            allowClear
            style={{ borderRadius: 8 }}
            value={filters.name}
            onChange={e =>
              onFiltersChange({ ...filters, name: e.target.value })
            }
          />
        </section>

        <section>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'block',
            }}
          >
            Role
          </Text>
          <Select
            placeholder="All Roles"
            allowClear
            size="large"
            value={filters.role}
            onChange={value => onFiltersChange({ ...filters, role: value })}
            style={{ width: '100%', borderRadius: 8 }}
          >
            {roleOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </section>

        <section>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'block',
            }}
          >
            Date Range
          </Text>
          <RangePicker
            style={{ width: '100%' }}
            value={filters.dateRange}
            onChange={dates =>
              onFiltersChange({ ...filters, dateRange: dates })
            }
          />
        </section>
      </Space>
    </Drawer>
  );
};

export default LogFilterDrawer;
