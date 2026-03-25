import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Tag,
  Space,
  Button,
  Popconfirm,
  Image,
  message,
  Card,
  Input,
  Select,
  Typography,
  Modal,
  Descriptions,
} from "antd";
import {
  ReloadOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  getQRRequests,
  approveQRRequest,
  rejectQRRequest,
} from "../services/userService";

const { Title, Text } = Typography;
const { Option } = Select;

interface QRRequestItem {
  _id: string;
  requestType?: "QR" | "PROFILE_PHOTO";
  reason?: string;
  oldQR?: string;
  newQR?: string;
  newQRString?: string;
  newQRImage?: string;
  oldPhotoURL?: string;
  newPhotoImage?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  userId?: {
    _id?: string;
    firstName?: string;
    surname?: string;
    role?: string;
    qrString?: string | null;
    photoURL?: string | null;
  };
}

const toAssetUrl = (path?: string) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const base = import.meta.env.VITE_API_URL || "";
  if (!base) return path;

  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const QRRequests = () => {
  const [data, setData] = useState<QRRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QRRequestItem | null>(
    null,
  );

  const [filters, setFilters] = useState({
    name: "",
    role: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await getQRRequests();
      const normalized: QRRequestItem[] = Array.isArray(res)
        ? res.map((item: any) => ({
            ...item,
            // Support both backend keys while preserving current API shape.
            newQR: item?.newQR ?? item?.newQRString ?? "",
            newQRString: item?.newQRString ?? item?.newQR ?? "",
            requestType: item?.requestType || "QR",
            oldPhotoURL: item?.oldPhotoURL || item?.userId?.photoURL || "",
            newPhotoImage: item?.newPhotoImage || "",
            userId: {
              ...item?.userId,
              qrString: item?.userId?.qrString ?? null,
              photoURL: item?.userId?.photoURL ?? null,
            },
          }))
        : [];

      setData(normalized);
    } catch {
      message.error("Failed to load QR requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const onApprove = async (id: string) => {
    try {
      setActionLoading(id);
      await approveQRRequest(id);
      message.success("Request approved");
      fetch();
    } catch {
      message.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const onReject = async (id: string) => {
    try {
      setActionLoading(id);
      await rejectQRRequest(id);
      message.success("Request rejected");
      fetch();
    } catch {
      message.error("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= FILTER ================= */

  const filteredData = useMemo(() => {
    return data.filter((r) => {
      const fullName =
        `${r.userId?.firstName} ${r.userId?.surname}`.toLowerCase();

      const matchName = fullName.includes(filters.name.toLowerCase());
      const matchRole = !filters.role || r.userId?.role === filters.role;
      const matchStatus = !filters.status || r.status === filters.status;

      return matchName && matchRole && matchStatus;
    });
  }, [data, filters]);

  /* ================= TABLE COLUMNS ================= */

  const columns: any[] = [
    {
      title: "User",
      key: "user",
      render: (_: any, record: QRRequestItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.userId?.firstName} {record.userId?.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.userId?.qrString || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: ["userId", "role"],
      render: (role: string) => {
        const color =
          role === "Staff" ? "blue" : role === "Student" ? "cyan" : "purple";
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: "Type",
      dataIndex: "requestType",
      render: (value: "QR" | "PROFILE_PHOTO") => (
        <Tag color={value === "PROFILE_PHOTO" ? "magenta" : "geekblue"}>
          {value === "PROFILE_PHOTO" ? "Profile Photo" : "QR Change"}
        </Tag>
      ),
    },
    {
      title: "Old QR",
      dataIndex: "oldQR",
      render: (_: string, record: QRRequestItem) =>
        record.requestType === "PROFILE_PHOTO" ? "-" : <Text code>{record.oldQR || "-"}</Text>,
    },
    {
      title: "New QR String",
      dataIndex: "newQRString",
      render: (_: string, record: QRRequestItem) => {
        if (record.requestType === "PROFILE_PHOTO") return "-";
        const qrValue = record.newQRString || record.newQR;
        return qrValue ? <Text code>{qrValue}</Text> : "-";
      },
    },
    {
      title: "Uploaded Image",
      dataIndex: "newQRImage",
      render: (_: string, record: QRRequestItem) => {
        const imagePath = record.requestType === "PROFILE_PHOTO"
          ? record.newPhotoImage
          : record.newQRImage;

        return imagePath ? (
          <a href={toAssetUrl(imagePath)} target="_blank" rel="noreferrer">
            <Image src={toAssetUrl(imagePath)} width={80} />
          </a>
        ) : (
          "-"
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (s: string) => {
        const colors: Record<string, string> = {
          Pending: "gold",
          Approved: "green",
          Rejected: "red",
        };
        return <Tag color={colors[s]}>{s}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: QRRequestItem) => {
        // ⛔ Hide actions once resolved
        if (record.status !== "Pending") {
          return <Text type="secondary">—</Text>;
        }

        return (
          <Space>
            <Popconfirm
              title="Approve this request?"
              onConfirm={() => onApprove(record._id)}
            >
              <Button
                type="primary"
                loading={actionLoading === record._id}
                style={{
                  background: "linear-gradient(135deg, #52c41a, #73d13d)",
                  border: "none",
                }}
              >
                Approve
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Reject this request?"
              onConfirm={() => onReject(record._id)}
            >
              <Button danger loading={actionLoading === record._id}>
                Reject
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  /* ================= RENDER ================= */

  return (
    <Card
      style={{
        height: "100%",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
      title={
        <Space>
          <FilterOutlined style={{ color: "#1677ff" }} />
          <Title level={4} style={{ margin: 0 }}>
            Change Requests
          </Title>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          Refresh
        </Button>
      }
    >
      {/* Filters */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Input
          placeholder="Search name..."
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 250 }}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />

        <Select
          placeholder="Filter by Role"
          allowClear
          style={{ width: 160 }}
          onChange={(value) => setFilters({ ...filters, role: value })}
        >
          <Option value="Staff">Staff</Option>
          <Option value="Student">Student</Option>
          <Option value="Visitor">Visitor</Option>
        </Select>

        <Select
          placeholder="Status"
          allowClear
          style={{ width: 160 }}
          onChange={(value) => setFilters({ ...filters, status: value })}
        >
          <Option value="Pending">Pending</Option>
          <Option value="Approved">Approved</Option>
          <Option value="Rejected">Rejected</Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        bordered
        onRow={(record) => ({
          onClick: (event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button") || target.closest("a")) {
              return;
            }
            setSelectedRequest(record);
          },
          style: { cursor: "pointer" },
        })}
      />

      <Modal
        title="Request Details"
        open={!!selectedRequest}
        onCancel={() => setSelectedRequest(null)}
        footer={null}
      >
        {selectedRequest && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="User">
              {selectedRequest.userId?.firstName}{" "}
              {selectedRequest.userId?.surname}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              {selectedRequest.userId?.role || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {selectedRequest.requestType === "PROFILE_PHOTO"
                ? "Profile Photo Change"
                : "QR Change"}
            </Descriptions.Item>
            <Descriptions.Item label="Current QR String">
              {selectedRequest.requestType === "PROFILE_PHOTO"
                ? "-"
                : selectedRequest.userId?.qrString || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Requested New QR">
              {selectedRequest.requestType === "PROFILE_PHOTO"
                ? "-"
                : selectedRequest.newQRString || selectedRequest.newQR || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Reason">
              {selectedRequest.reason || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedRequest.status}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(selectedRequest.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Current Profile Photo">
              {selectedRequest.requestType === "PROFILE_PHOTO" &&
              selectedRequest.userId?.photoURL ? (
                <a
                  href={toAssetUrl(selectedRequest.userId.photoURL)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Current Profile Photo
                </a>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Requested Image">
              {(selectedRequest.requestType === "PROFILE_PHOTO"
                ? selectedRequest.newPhotoImage
                : selectedRequest.newQRImage) ? (
                <a
                  href={toAssetUrl(
                    selectedRequest.requestType === "PROFILE_PHOTO"
                      ? selectedRequest.newPhotoImage
                      : selectedRequest.newQRImage,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Uploaded Image
                </a>
              ) : (
                "-"
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default QRRequests;
