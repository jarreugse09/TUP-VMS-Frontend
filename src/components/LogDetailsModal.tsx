import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Table, Tag, Typography, Divider, Spin, Empty, Space } from 'antd';
import { HistoryOutlined, SwapOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text, Title } = Typography;

interface LogDetailsModalProps {
  open: boolean;
  onClose: () => void;
  record: any; // The attendance or visit record
}

const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ open, onClose, record }) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (open && record) {
      fetchDetailedActivity();
    }
  }, [open, record]);

  const fetchDetailedActivity = async () => {
    setLoading(true);
    try {
      // Fetch transactions for this user on this specific day
      const dateStr = dayjs(record.date).format('YYYY-MM-DD');
      const userId = record.staffId?._id || record.visitorId?._id || record.userId?._id;

      const res = await api.get('/transaction-logs/all', {
        params: {
          dateFrom: `${dateStr}T00:00:00.000Z`,
          dateTo: `${dateStr}T23:59:59.999Z`,
        },
      });

      const raw = res.data?.data || [];
      const filtered = raw.filter((entry: any) => {
        const clientId = entry.clientId?._id || entry.clientId;
        const staffId = entry.staffId?._id || entry.staffId;
        return String(clientId) === String(userId) || String(staffId) === String(userId);
      });

      setTransactions(filtered);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  const transactionColumns = [
    {
      title: 'Time',
      dataIndex: 'transactionStart',
      key: 'time',
      render: (t: string) => dayjs(t).format('hh:mm A'),
    },
    {
      title: 'Type',
      dataIndex: 'transactionType',
      key: 'type',
      render: (type: string) => <Tag color="purple">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Counterpart',
      key: 'counterpart',
      render: (_: any, r: any) => {
        const isClient = String(r.clientId?._id || r.clientId) === String(record.staffId?._id || record.userId?._id);
        const target = isClient ? r.staffId : r.clientId;
        return target ? `${target.firstName} ${target.surname}` : 'Unknown';
      }
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, r: any) => r.transactionEnd ? `${dayjs(r.transactionEnd).diff(dayjs(r.transactionStart), 'minute')} mins` : 'Ongoing',
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>Detailed Activity Log: {dayjs(record.date).format('MMMM D, YYYY')}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Staff/Visitor" span={2}>
          <Text strong>{record.staffId?.firstName || record.visitorId?.firstName} {record.staffId?.surname || record.visitorId?.surname}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Time In">
          <Tag color="green"><ClockCircleOutlined /> {record.timeIn ? dayjs(record.timeIn).format('hh:mm A') : 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Time Out">
          <Tag color={record.timeOut ? 'red' : 'blue'}>
             <ClockCircleOutlined /> {record.timeOut ? dayjs(record.timeOut).format('hh:mm A') : 'Active'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Silo" span={2}>
          {record.collegeId?.name || 'N/A'} - {record.departmentId?.name || 'Generic'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <Space>
          <SwapOutlined />
          <Title level={5} style={{ margin: 0 }}>Associated Transactions</Title>
        </Space>
      </Divider>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading activity..." /></div>
      ) : transactions.length > 0 ? (
        <Table
          columns={transactionColumns}
          dataSource={transactions}
          rowKey="_id"
          size="small"
          pagination={false}
        />
      ) : (
        <Empty description="No transaction activity recorded for this session" />
      )}
      </Space>
    </Modal>
  );
};

export default LogDetailsModal;
