export interface InspectionSlot {
  status: "PENDING" | "DONE";
  inspectorName: string;
  answers: Record<string, "O" | "X">;
  memo: string;
  checkedByRole: "INSPECTOR" | "ADMIN" | null;
}

export interface InspectionRecord {
  id: string;
  date: string;
  restroomId: string;
  restroomName: string;
  templateId: string;
  slots: Record<string, InspectionSlot>;
}
