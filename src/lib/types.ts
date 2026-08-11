export type ReminderDTO = {
  id: string;
  text: string;
  remindAt: string; // ISO
  sentAt: string | null; // ISO o null
  groupName: string | null;
};
