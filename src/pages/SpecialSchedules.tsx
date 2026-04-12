import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  createSpecialSchedule,
  deleteSpecialSchedule,
  getAssignableUsers,
  getSpecialSchedules,
  type AssignableUser,
  type SpecialSchedule,
} from "../services/scheduleService";

const { Title, Text } = Typography;

const SpecialSchedules = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [schedules, setSchedules] = useState<SpecialSchedule[]>([]);
  const [targets, setTargets] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isHrHead = user?.subRole === "hr_head";

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleData, userData] = await Promise.all([
        getSpecialSchedules(),
        getAssignableUsers(),
      ]);
      setSchedules(scheduleData);
      setTargets(userData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      await createSpecialSchedule({
        type: values.type,
        scope: values.scope,
        targetId: values.scope === "all" ? null : values.targetId,
        date: values.date.startOf("day").toISOString(),
        dateEnd: values.dateEnd ? values.dateEnd.endOf("day").toISOString() : null,
        reason: values.reason.trim(),
      });
      message.success("Special schedule created");
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to create special schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSpecialSchedule(id);
      message.success("Special schedule deleted");
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete special schedule");
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Title level={4} style={{ margin: 0 }}>
          Special Schedules
        </Title>
        <Text type="secondary">
          Manage WFH, holiday, and exemption schedules for your allowed workforce scope.
        </Text>
      </Card>

      <Card title="Create Special Schedule">
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "WFH", value: "wfh" },
                { label: "Holiday", value: "holiday" },
                { label: "Exemption", value: "exemption" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Scope" name="scope" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "All", value: "all" },
                { label: "Individual", value: "individual" },
                { label: "Department", value: "department" },
                { label: "College", value: "college" },
              ]}
            />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const scope = form.getFieldValue("scope");
              if (!scope || scope === "all") return null;

              const options =
                scope === "individual"
                  ? targets.map((target) => ({
                      label: `${target.firstName} ${target.surname} (${target.role}${target.subRole ? ` / ${target.subRole}` : ""})`,
                      value: target._id,
                    }))
                  : Array.from(
                      new Map<string, string>(
                        targets.reduce<Array<[string, string]>>((acc, target) => {
                          const value =
                            scope === "department"
                              ? target.departmentId
                              : target.collegeId;
                          const label =
                            scope === "department"
                              ? target.department
                              : target.college;

                          if (value && label) {
                            acc.push([value, label]);
                          }

                          return acc;
                        }, []),
                      ).entries(),
                    ).map(([value, label]) => ({
                      label: label as string,
                      value: value as string,
                    }));

              return (
                <Form.Item label="Target" name="targetId" rules={[{ required: true }]}>
                  <Select options={options} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item label="Start Date" name="date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="End Date" name="dateEnd">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Reason" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Save Special Schedule
          </Button>
        </Form>
      </Card>

      <Card title="Existing Special Schedules">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={schedules}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Type", dataIndex: "type", render: (value) => <Tag>{value}</Tag> },
            { title: "Scope", dataIndex: "scope" },
            { title: "Target", dataIndex: "targetId", render: (value) => value || "All" },
            { title: "Date", render: (_, record) => dayjs(record.date).format("MMM DD, YYYY") },
            {
              title: "Date End",
              render: (_, record) =>
                record.dateEnd ? dayjs(record.dateEnd).format("MMM DD, YYYY") : "-",
            },
            { title: "Reason", dataIndex: "reason" },
            {
              title: "Action",
              render: (_, record) =>
                isHrHead ? (
                  <Popconfirm
                    title="Delete special schedule?"
                    onConfirm={() => handleDelete(record._id)}
                  >
                    <Button danger size="small">
                      Delete
                    </Button>
                  </Popconfirm>
                ) : (
                  "-"
                ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default SpecialSchedules;
