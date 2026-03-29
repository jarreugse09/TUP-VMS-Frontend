import { Modal, Avatar, Typography, Tag, Button } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Activity {
  reason: string;
  timeIn?: string;
  timeOut?: string;
  status: 'In TUP' | 'Checked Out';
}

interface LogItem {
  _id: string;
  date: string;
  user: {
    _id: string;
    qrString?: string;
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
    birthdate: string;
  };
  dailyStatus: 'In TUP' | 'Checked Out';
  attendance?: {
    timeIn?: string;
    timeOut?: string;
    status: 'In TUP' | 'Checked Out';
  } | null;
  activities: Activity[];
}

interface LogDetailsModalProps {
  open: boolean;
  onClose: () => void;
  log: LogItem | null;
  getTimeIn: (log: LogItem) => string | null;
  getTimeOut: (log: LogItem) => string | null;
}

const LogDetailsModal = ({
  open,
  onClose,
  log,
  getTimeIn,
  getTimeOut,
}: LogDetailsModalProps) => {
  if (!log) return null;

  const timeIn = getTimeIn(log);
  const timeOut = getTimeOut(log);
  const isIn = log.dailyStatus === 'In TUP';

  const ROLE_PILL: Record<
    string,
    { bg: string; color: string; border: string }
  > = {
    Staff: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    Student: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    Visitor: { bg: '#FAF5FF', color: '#6B21A8', border: '#E9D5FF' },
    TUP: { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
    Security: { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
  };
  const pill = ROLE_PILL[log.user.role] ?? {
    bg: '#F5F5F5',
    color: '#404040',
    border: '#E5E5E5',
  };

  const REASON_LABEL: Record<string, string> = {
    attendance: 'Attendance',
    checkin: 'Check in',
    checkout: 'Check out',
    break: 'Break',
    'go out': 'Went out',
    transaction: 'Transaction',
    Transaction: 'Transaction',
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="90%"
      style={{ maxWidth: 580 }}
      styles={{
        content: { padding: 0, overflow: 'hidden', borderRadius: 16 },
        mask: { backdropFilter: 'blur(2px)' },
      }}
      closeIcon={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.06)',
            color: '#595959',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          ✕
        </span>
      }
    >
      <div>
        {/* ── HEADER ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '24px 24px 20px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              size={52}
              src={log.user.photoURL}
              icon={<UserOutlined />}
              style={{
                background: '#f0f0f0',
                border: '2px solid #fff',
                outline: '1.5px solid #e8e8e8',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: isIn ? '#22c55e' : '#d1d5db',
                border: '2px solid #fff',
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 4,
              }}
            >
              <Text
                strong
                style={{
                  fontSize: 15,
                  color: '#141414',
                  lineHeight: 1.3,
                }}
              >
                {log.user.firstName} {log.user.surname}
              </Text>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '1px 7px',
                  borderRadius: 20,
                  letterSpacing: '0.2px',
                  background: pill.bg,
                  color: pill.color,
                  border: `1px solid ${pill.border}`,
                }}
              >
                {log.user.role}
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(log.date).format('dddd, MMMM D, YYYY')}
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 20,
              flexShrink: 0,
              background: isIn ? '#f0fdf4' : '#fafafa',
              border: `1px solid ${isIn ? '#bbf7d0' : '#e5e5e5'}`,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                flexShrink: 0,
                background: isIn ? '#16a34a' : '#9ca3af',
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: isIn ? '#15803d' : '#6b7280',
              }}
            >
              {log.dailyStatus}
            </Text>
          </div>
        </div>

        {/* ── TIME ROW ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {[
            { label: 'Time in', value: timeIn, dot: '#22c55e' },
            {
              label: 'Time out',
              value: timeOut,
              dot: '#f97316',
              divided: true,
            },
          ].map(({ label, value, dot, divided }) => (
            <div
              key={label}
              style={{
                padding: '16px 20px',
                borderLeft: divided ? '1px solid #f0f0f0' : undefined,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: dot,
                  }}
                />
                <Text
                  type="secondary"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase' as any,
                  }}
                >
                  {label}
                </Text>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: value ? '#141414' : '#d1d5db',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {value ? dayjs(value).format('h:mm') : '—'}
                </Text>
                {value && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(value).format('A')}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── ACTIVITIES ── */}
        <div style={{ padding: '20px 24px' }}>
          {log.activities.length > 0 ? (
            <>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase' as any,
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                Activity log · {log.activities.length}{' '}
                {log.activities.length === 1 ? 'entry' : 'entries'}
              </Text>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {log.activities.map((act, i) => {
                  const actIsIn = act.status === 'In TUP';
                  const accentClr = actIsIn ? '#16a34a' : '#dc2626';
                  const bgClr = actIsIn ? '#f0fdf4' : '#fff7f7';
                  const bdClr = actIsIn ? '#bbf7d0' : '#fecaca';

                  const targetPerson =
                    (act as any).wentTo || (act as any).scannedTarget;
                  const displayLabel = targetPerson
                    ? `Went to ${targetPerson.firstName} ${targetPerson.surname}`
                    : (REASON_LABEL[act.reason] ?? act.reason);

                  const subLabel = targetPerson
                    ? targetPerson.role
                    : act.timeIn || act.timeOut
                      ? `${act.timeIn ? dayjs(act.timeIn).format('h:mm A') : '—'}  →  ${act.timeOut ? dayjs(act.timeOut).format('h:mm A') : 'ongoing'}`
                      : null;

                  const total = log.activities.length;
                  const isFirst = i === 0;
                  const isLast = i === total - 1;
                  const radius =
                    isFirst && isLast
                      ? '8px'
                      : isFirst
                        ? '8px 8px 0 0'
                        : isLast
                          ? '0 0 8px 8px'
                          : '0';

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 14px',
                        background: '#fff',
                        border: '1px solid #f0f0f0',
                        borderLeft: `3px solid ${accentClr}`,
                        borderRadius: radius,
                        borderTop: i > 0 ? 'none' : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: bgClr,
                          border: `1px solid ${bdClr}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ClockCircleOutlined
                          style={{ fontSize: 13, color: accentClr }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          style={{
                            fontSize: 13,
                            display: 'block',
                            color: '#141414',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayLabel}
                        </Text>
                        {subLabel && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {subLabel}
                          </Text>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 9px',
                          borderRadius: 20,
                          flexShrink: 0,
                          background: bgClr,
                          color: accentClr,
                          border: `1px solid ${bdClr}`,
                        }}
                      >
                        {act.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 0',
                border: '1px dashed #e5e5e5',
                borderRadius: 8,
              }}
            >
              <Text type="secondary" style={{ fontSize: 13 }}>
                No activities recorded
              </Text>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '14px 24px',
            borderTop: '1px solid #f0f0f0',
            background: '#fafafa',
          }}
        >
          <Button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
              border: 'none',
              borderRadius: 8,
              height: 36,
              padding: '0 22px',
              fontWeight: 500,
              fontSize: 13,
              color: '#fff',
              boxShadow: '0 2px 6px rgba(255,77,79,0.3)',
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LogDetailsModal;
