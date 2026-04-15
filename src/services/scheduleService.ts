import api from "./api";

export type AssignableUser = {
  _id: string;
  firstName: string;
  surname: string;
  role: string;
  subRole?: string;
  departmentId?: string;
  department?: string;
  collegeId?: string;
  college?: string;
};

export type SpecialSchedule = {
  _id: string;
  type: "wfh" | "holiday" | "exemption" | string;
  scope: "all" | "individual" | "department" | "college" | string;
  targetId?: string | null;
  date: string;
  dateEnd?: string | null;
  reason?: string;
};

export type CreateSpecialScheduleInput = {
  type: string;
  scope: string;
  targetId?: string | null;
  date: string;
  dateEnd?: string | null;
  reason: string;
};

export const getAssignableUsers = async (): Promise<AssignableUser[]> => {
  const res = await api.get("/work-schedules/assignable-users");
  const data = res.data?.data ?? res.data ?? [];
  return Array.isArray(data) ? data : [];
};

export const getSpecialSchedules = async (): Promise<SpecialSchedule[]> => {
  const res = await api.get("/special-schedules");
  const data = res.data?.data ?? res.data ?? [];
  return Array.isArray(data) ? data : [];
};

export const createSpecialSchedule = async (
  payload: CreateSpecialScheduleInput,
): Promise<SpecialSchedule> => {
  const res = await api.post("/special-schedules", payload);
  return res.data?.data ?? res.data;
};

export const deleteSpecialSchedule = async (id: string): Promise<void> => {
  await api.delete(`/special-schedules/${id}`);
};
