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
  Avatar,
} from "antd";
import {
  ReloadOutlined,
  FilterOutlined,
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  getQRRequests,
  approveQRRequest,
  rejectQRRequest,
} from "../services/userService";
import dayjs from "dayjs";

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
        record.requestType === "PROFILE_PHOTO" ? (
          "-"
        ) : (
          <Text code>{record.oldQR || "-"}</Text>
        ),
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
        const imagePath =
          record.requestType === "PROFILE_PHOTO"
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
        open={!!selectedRequest}
        onCancel={() => setSelectedRequest(null)}
        footer={null}
        centered
        width={580}
        styles={{
          content: { padding: 0, overflow: "hidden", borderRadius: 16 },
          mask: { backdropFilter: "blur(2px)" },
        }}
        closeIcon={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.06)",
              color: "#595959",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            ✕
          </span>
        }
      >
        {selectedRequest &&
          (() => {
            const isPhotoReq = selectedRequest.requestType === "PROFILE_PHOTO";
            const status = selectedRequest.status;

            // Status color mapping
            const statusColors: Record<string, string> = {
              PENDING: "#faad14",
              APPROVED: "#52c41a",
              REJECTED: "#ff4d4f",
            };

            return (
              <div>
                {/* ── HEADER ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "24px 24px 20px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar
                      size={52}
                      src={selectedRequest.userId?.photoURL}
                      icon={<UserOutlined />}
                      style={{
                        background: "#f0f0f0",
                        border: "2px solid #fff",
                        outline: "1.5px solid #e8e8e8",
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        strong
                        style={{
                          fontSize: 15,
                          color: "#141414",
                          lineHeight: 1.3,
                        }}
                      >
                        {selectedRequest.userId?.firstName}{" "}
                        {selectedRequest.userId?.surname}
                      </Text>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "1px 7px",
                          borderRadius: 20,
                          letterSpacing: "0.2px",
                          background: "#f5f5f5",
                          color: "#595959",
                          border: "1px solid #d9d9d9",
                        }}
                      >
                        {selectedRequest.userId?.role || "User"}
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Requested on{" "}
                      {dayjs(selectedRequest.createdAt).format(
                        "MMM DD, YYYY • hh:mm A",
                      )}
                    </Text>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 11px",
                      borderRadius: 20,
                      flexShrink: 0,
                      background: "#fff",
                      border: `1px solid ${statusColors[status] || "#e5e5e5"}`,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: statusColors[status] || "#9ca3af",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusColors[status] || "#6b7280",
                      }}
                    >
                      {status}
                    </Text>
                  </div>
                </div>

                {/* ── COMPARISON SECTION (The "Change" Detail) ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    background: "#fafafa",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRight: "1px solid #f0f0f0",
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Current State
                    </Text>
                    {isPhotoReq ? (
                      <Avatar
                        shape="square"
                        size={64}
                        src={selectedRequest.userId?.photoURL}
                        style={{ borderRadius: 8, border: "1px solid #d9d9d9" }}
                      />
                    ) : (
                      <Text strong style={{ fontSize: 16, color: "#595959" }}>
                        {selectedRequest.userId?.qrString || "No QR Set"}
                      </Text>
                    )}
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Requested Change
                    </Text>
                    {isPhotoReq ? (
                      <a
                        href={toAssetUrl(selectedRequest.newPhotoImage)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div
                          style={{
                            position: "relative",
                            width: 64,
                            height: 64,
                          }}
                        >
                          <Avatar
                            shape="square"
                            size={64}
                            src={toAssetUrl(selectedRequest.newPhotoImage)}
                            style={{
                              borderRadius: 8,
                              border: "2px solid #ff4d4f",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: -5,
                              right: -5,
                              background: "#ff4d4f",
                              borderRadius: "50%",
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckCircleOutlined
                              style={{ color: "#fff", fontSize: 10 }}
                            />
                          </div>
                        </div>
                      </a>
                    ) : (
                      <Text strong style={{ fontSize: 16, color: "#ff4d4f" }}>
                        {selectedRequest.newQRString ||
                          selectedRequest.newQR ||
                          "N/A"}
                      </Text>
                    )}
                  </div>
                </div>

                {/* ── METADATA & REASON ── */}
                <div style={{ padding: "20px 24px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* Request Type Item */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px",
                        background: "#fff",
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#e6f7ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <EnvironmentOutlined style={{ color: "#1890ff" }} />
                      </div>
                      <div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 11, display: "block" }}
                        >
                          Request Type
                        </Text>
                        <Text strong>
                          {isPhotoReq
                            ? "Profile Photo Update"
                            : "QR Code Identification"}
                        </Text>
                      </div>
                    </div>

                    {/* Reason Item */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px",
                        background: "#fff7e6",
                        border: "1px solid #ffd591",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ClockCircleOutlined style={{ color: "#faad14" }} />
                      </div>
                      <div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 11, display: "block" }}
                        >
                          Reason for Request
                        </Text>
                        <Text style={{ color: "#874d00" }}>
                          {selectedRequest.reason || "No reason provided."}
                        </Text>
                      </div>
                    </div>

                    {/* Evidence Image Link (If QR update has an image attached) */}
                    {!isPhotoReq && selectedRequest.newQRImage && (
                      <div style={{ textAlign: "center", marginTop: 8 }}>
                        <a
                          href={toAssetUrl(selectedRequest.newQRImage)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#ff4d4f",
                            textDecoration: "underline",
                          }}
                        >
                          View Uploaded Proof Image
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── FOOTER ── */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "14px 24px",
                    borderTop: "1px solid #f0f0f0",
                    background: "#fafafa",
                  }}
                >
                  <button
                    onClick={() => setSelectedRequest(null)}
                    style={{
                      background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
                      border: "none",
                      borderRadius: 8,
                      height: 36,
                      padding: "0 22px",
                      fontWeight: 500,
                      fontSize: 13,
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(255,77,79,0.3)",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </Card>
  );
};

export default QRRequests;
