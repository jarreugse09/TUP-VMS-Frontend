import { useState } from 'react';
import {
  Input,
  Select,
  DatePicker,
  Button,
  Drawer,
  Space,
  Typography,
  Grid,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

export interface FilterField {
  key: string;
  label: string;
  type: 'search' | 'select' | 'dateRange';
  placeholder?: string;
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
}

interface ResponsiveFilterProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
  activeFilterCount?: number;
}

const ResponsiveFilter = ({
  fields,
  values,
  onChange,
  onReset,
  activeFilterCount = 0,
}: ResponsiveFilterProps) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  const [drawerOpen, setDrawerOpen] = useState(false);

  const searchField = fields.find(f => f.type === 'search');
  const dateRangeField = fields.find(f => f.type === 'dateRange');
  const selectFields = fields.filter(f => f.type === 'select');

  const renderField = (field: FilterField, compact = false) => {
    switch (field.type) {
      case 'search':
        return (
          <Input
            key={field.key}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder={field.placeholder || 'Search...'}
            allowClear
            value={values[field.key] || ''}
            onChange={e => onChange(field.key, e.target.value)}
            style={{
              flex: 1,
              minWidth: compact ? '100%' : 200,
              borderRadius: 8,
            }}
            size={isMobile ? 'middle' : 'middle'}
          />
        );

      case 'select':
        return (
          <Select
            key={field.key}
            placeholder={field.placeholder || `Select ${field.label}`}
            allowClear
            value={values[field.key]}
            onChange={value => onChange(field.key, value)}
            style={{
              width: compact ? '100%' : isMobile ? 'calc(50% - 4px)' : 140,
              borderRadius: 8,
            }}
            size={isMobile ? 'middle' : 'middle'}
          >
            {field.options?.map(opt => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        );

      case 'dateRange':
        return (
          <RangePicker
            key={field.key}
            value={values[field.key]}
            onChange={dates => onChange(field.key, dates)}
            style={{
              width: compact ? '100%' : isMobile ? '100%' : undefined,
              borderRadius: 8,
            }}
            size={isMobile ? 'middle' : 'middle'}
          />
        );

      default:
        return null;
    }
  };

  // Mobile: Compact layout with icon buttons
  if (isMobile) {
    return (
      <>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          {/* Search bar always visible */}
          {searchField && (
            <div style={{ flex: 1, minWidth: '100%' }}>
              {renderField(searchField)}
            </div>
          )}

          {/* Date Range Picker always visible */}
          {dateRangeField && (
            <div style={{ width: '100%' }}>{renderField(dateRangeField)}</div>
          )}

          {/* Filter icon button for secondary filters */}
          {selectFields.length > 0 && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setDrawerOpen(true)}
              type={activeFilterCount > 0 ? 'primary' : 'default'}
              size="middle"
            >
              {activeFilterCount > 0 && (
                <Tag
                  color="white"
                  style={{
                    marginLeft: 4,
                    fontSize: 11,
                    padding: '0 6px',
                    lineHeight: '18px',
                  }}
                >
                  {activeFilterCount}
                </Tag>
              )}
            </Button>
          )}

          {/* Reset button */}
          {activeFilterCount > 0 && (
            <Button
              icon={<ClearOutlined />}
              onClick={onReset}
              size="middle"
              danger
            />
          )}
        </div>

        {/* Drawer for secondary filters */}
        <Drawer
          title={
            <Text strong style={{ fontSize: 18 }}>
              Filters
            </Text>
          }
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="bottom"
          height="auto"
          extra={
            <Button type="link" onClick={onReset}>
              Reset
            </Button>
          }
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {selectFields.map(field => (
              <div key={field.key}>
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
                  {field.label}
                </Text>
                {renderField(field, true)}
              </div>
            ))}
          </Space>
        </Drawer>
      </>
    );
  }

  // Tablet: Search + Date Range primary, Filter icon for secondary
  if (isTablet) {
    return (
      <>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          {/* Search bar */}
          {searchField && (
            <div style={{ flex: 1, minWidth: 200 }}>
              {renderField(searchField)}
            </div>
          )}

          {/* Date Range Picker */}
          {dateRangeField && renderField(dateRangeField)}

          {/* Filter icon for secondary filters */}
          {selectFields.length > 0 && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setDrawerOpen(true)}
              type={activeFilterCount > 0 ? 'primary' : 'default'}
            >
              Filters
              {activeFilterCount > 0 && (
                <Tag
                  color="white"
                  style={{
                    marginLeft: 4,
                    fontSize: 11,
                    padding: '0 6px',
                    lineHeight: '18px',
                  }}
                >
                  {activeFilterCount}
                </Tag>
              )}
            </Button>
          )}

          {/* Reset button */}
          {activeFilterCount > 0 && (
            <Button icon={<ClearOutlined />} onClick={onReset} danger>
              Reset
            </Button>
          )}
        </div>

        {/* Drawer for secondary filters */}
        <Drawer
          title={
            <Text strong style={{ fontSize: 18 }}>
              Filters
            </Text>
          }
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={340}
          extra={
            <Button type="link" onClick={onReset}>
              Reset
            </Button>
          }
        >
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {selectFields.map(field => (
              <section key={field.key}>
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
                  {field.label}
                </Text>
                {renderField(field, true)}
              </section>
            ))}
          </Space>
        </Drawer>
      </>
    );
  }

  // Desktop: Everything expanded
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      {/* Search bar */}
      {searchField && (
        <div style={{ flex: 1, minWidth: 250 }}>{renderField(searchField)}</div>
      )}

      {/* All select filters */}
      {selectFields.map(field => renderField(field))}

      {/* Date Range Picker */}
      {dateRangeField && renderField(dateRangeField)}

      {/* Reset button */}
      {activeFilterCount > 0 && (
        <Button icon={<ClearOutlined />} onClick={onReset} danger>
          Reset
        </Button>
      )}
    </div>
  );
};

export default ResponsiveFilter;
