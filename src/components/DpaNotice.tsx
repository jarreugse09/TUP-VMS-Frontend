import React from 'react';
import { Typography, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const DpaNotice: React.FC = () => {
  return (
    <div style={{ marginTop: 16 }}>
      <Alert
        message="RA 10173 Compliance Notice"
        description={
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Your data is processed strictly for campus security and monitoring in compliance with the Data Privacy Act of 2012 (RA 10173). 
            Unauthorized extraction or sharing of these logs is strictly prohibited.
          </Text>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
      />
    </div>
  );
};
