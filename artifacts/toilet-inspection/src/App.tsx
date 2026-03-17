import { useState, useEffect, useCallback, type CSSProperties } from "react";
import type { Restroom } from "./types/restroom";
import type { InspectionRecord, InspectionSlot } from "./types/inspection";
import type { InspectionTemplate, TemplateItem } from "./types/template";
import {
  fetchRestrooms,
  fetchAllRestrooms,
  fetchInspectionRecord,
  fetchTemplate,
  saveInspectionRecord,
  saveTemplate,
  saveRestroom,
  deleteRestroom,
} from "./lib/firestore";

type Mode = "viewer" | "inspector" | "admin";

function getTodaySeoul(): string {
  return new Date()
    .toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(".", "");
}

function sanitizeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

function createEmptyTemplate(templateId: string): InspectionTemplate {
  return {
    id: templateId,
    name: "기본 점검표",
    slots: [
      { id: "morning", label: "오전 점검", order: 1 },
      { id: "afternoon", label: "오후 점검", order: 2 },
    ],
    items: [],
  };
}

const INSPECTOR_CODE = "6481";
const ADMIN_CODE = "6167";

const styles: Record<string, CSSProperties | ((...args: any[]) => CSSProperties)> = {
  body: {
    margin: 0,
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    background: "#f0f4f8",
    minHeight: "100vh",
    color: "#1a2332",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a2332",
    margin: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: (color: string) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: color,
    color: "#fff",
  }),
  btn: (variant: "primary" | "secondary" | "danger" | "ghost" | "success") => {
    const map = {
      primary: { bg: "#3b82f6", color: "#fff", border: "#3b82f6" },
      secondary: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
      danger: { bg: "#ef4444", color: "#fff", border: "#ef4444" },
      ghost: { bg: "transparent", color: "#64748b", border: "#e2e8f0" },
      success: { bg: "#22c55e", color: "#fff", border: "#22c55e" },
    };
    const v = map[variant];
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "6px 14px",
      borderRadius: 8,
      border: `1px solid ${v.border}`,
      background: v.bg,
      color: v.color,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      transition: "opacity 0.15s",
    } as CSSProperties;
  },
  btnSm: (variant: "primary" | "secondary" | "danger" | "ghost" | "success") => {
    const map = {
      primary: { bg: "#3b82f6", color: "#fff", border: "#3b82f6" },
      secondary: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
      danger: { bg: "#ef4444", color: "#fff", border: "#ef4444" },
      ghost: { bg: "transparent", color: "#64748b", border: "#e2e8f0" },
      success: { bg: "#22c55e", color: "#fff", border: "#22c55e" },
    };
    const v = map[variant];
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 10px",
      borderRadius: 6,
      border: `1px solid ${v.border}`,
      background: v.bg,
      color: v.color,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    } as CSSProperties;
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 16,
    color: "#0f172a",
  },
  main: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  filterRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    background: "#fff",
    color: "#1a2332",
    outline: "none",
  },
  select: {
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    background: "#fff",
    color: "#1a2332",
    outline: "none",
    cursor: "pointer",
  },
  slotSection: {
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  slotHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  slotBody: {
    padding: "16px",
  },
  statusBadge: (status: "DONE" | "PENDING") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: status === "DONE" ? "#dcfce7" : "#fef9c3",
    color: status === "DONE" ? "#15803d" : "#92400e",
    border: `1px solid ${status === "DONE" ? "#bbf7d0" : "#fde68a"}`,
  }),
  oxBadge: (val: "O" | "X" | null) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    background:
      val === "O" ? "#dbeafe" : val === "X" ? "#fee2e2" : "#f1f5f9",
    color:
      val === "O" ? "#1d4ed8" : val === "X" ? "#dc2626" : "#94a3b8",
    border: `1px solid ${
      val === "O" ? "#bfdbfe" : val === "X" ? "#fecaca" : "#e2e8f0"
    }`,
  }),
  oxBtn: (active: boolean, type: "O" | "X") => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    border: active
      ? `2px solid ${type === "O" ? "#2563eb" : "#dc2626"}`
      : "2px solid #e2e8f0",
    background: active
      ? type === "O"
        ? "#dbeafe"
        : "#fee2e2"
      : "#f8fafc",
    color: active
      ? type === "O"
        ? "#1d4ed8"
        : "#dc2626"
      : "#94a3b8",
    transition: "all 0.1s",
  }),
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    padding: "8px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#374151",
    fontSize: 14,
  },
  alert: (type: "success" | "error") => ({
    padding: "12px 16px",
    borderRadius: 10,
    background: type === "success" ? "#f0fdf4" : "#fef2f2",
    border: `1px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
    color: type === "success" ? "#15803d" : "#dc2626",
    fontSize: 14,
    fontWeight: 500,
  }),
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
    display: "block",
    marginBottom: 6,
  },
  formGroup: {
    marginBottom: 14,
  },
  divider: {
    height: 1,
    background: "#e2e8f0",
    margin: "16px 0",
  },
};

export default function App() {
  const [mode, setMode] = useState<Mode>("viewer");
  const [codeInput, setCodeInput] = useState("");
  const [showCodeModal, setShowCodeModal] = useState<"inspector" | "admin" | null>(null);
  const [codeError, setCodeError] = useState("");

  const [selectedDate, setSelectedDate] = useState(getTodaySeoul());
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [selectedRestroomId, setSelectedRestroomId] = useState("");
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [record, setRecord] = useState<InspectionRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [draftSlots, setDraftSlots] = useState<Record<string, InspectionSlot>>({});

  const [adminAllRestrooms, setAdminAllRestrooms] = useState<Restroom[]>([]);
  const [restroomForm, setRestroomForm] = useState<Restroom>({
    id: "",
    name: "",
    code: "",
    locationLabel: "",
    enabled: true,
    templateId: "default_template",
    sortOrder: 0,
  });
  const [editingNewRestroom, setEditingNewRestroom] = useState(false);

  const [adminTemplateDraft, setAdminTemplateDraft] = useState<InspectionTemplate | null>(null);
  const [adminTemplateLoading, setAdminTemplateLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const loadRestrooms = useCallback(async () => {
    try {
      const list = await fetchRestrooms();
      setRestrooms(list);
      if (list.length > 0 && !selectedRestroomId) {
        setSelectedRestroomId(list[0].id);
      }
    } catch (e) {
      setError("화장실 목록을 불러오지 못했습니다.");
    }
  }, [selectedRestroomId]);

  useEffect(() => {
    loadRestrooms();
  }, [loadRestrooms]);

  useEffect(() => {
    if (!selectedRestroomId) return;
    const restroom = restrooms.find((r) => r.id === selectedRestroomId);
    if (!restroom) return;

    setLoading(true);
    setError("");
    setRecord(null);
    setTemplate(null);

    Promise.all([
      fetchTemplate(restroom.templateId),
      fetchInspectionRecord(selectedDate, selectedRestroomId),
    ])
      .then(([tmpl, rec]) => {
        const safeTemplate = tmpl ?? createEmptyTemplate(restroom.templateId);
        setTemplate(safeTemplate);
        setRecord(rec);

        if (rec) {
          setDraftSlots(JSON.parse(JSON.stringify(rec.slots)));
        } else {
          const empty: Record<string, InspectionSlot> = {};
          safeTemplate.slots.forEach((s) => {
            empty[s.id] = {
              status: "PENDING",
              inspectorName: "",
              answers: {},
              memo: "",
              checkedByRole: null,
            };
          });
          setDraftSlots(empty);
        }
      })
      .catch(() => setError("데이터를 불러오는 중 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [selectedDate, selectedRestroomId, restrooms]);

  useEffect(() => {
    if (mode !== "admin") return;

    fetchAllRestrooms()
      .then((list) => {
        setAdminAllRestrooms(list);

        if (!editingNewRestroom && !restroomForm.id && list.length > 0) {
          setRestroomForm({ ...list[0] });
        }
      })
      .catch(() => {});
  }, [mode, editingNewRestroom, restroomForm.id]);

  useEffect(() => {
    if (mode !== "admin") return;
    if (!restroomForm.templateId) {
      setAdminTemplateDraft(null);
      return;
    }

    let cancelled = false;
    setAdminTemplateLoading(true);

    fetchTemplate(restroomForm.templateId)
      .then((tmpl) => {
        if (cancelled) return;
        setAdminTemplateDraft(tmpl ?? createEmptyTemplate(restroomForm.templateId));
      })
      .catch(() => {
        if (cancelled) return;
        setAdminTemplateDraft(createEmptyTemplate(restroomForm.templateId));
      })
      .finally(() => {
        if (!cancelled) setAdminTemplateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, restroomForm.templateId]);

  const handleModeSwitch = (target: "inspector" | "admin") => {
    setShowCodeModal(target);
    setCodeInput("");
    setCodeError("");
  };

  const confirmCode = () => {
    if (!showCodeModal) return;
    const correct = showCodeModal === "inspector" ? INSPECTOR_CODE : ADMIN_CODE;

    if (codeInput === correct) {
      setMode(showCodeModal);
      setShowCodeModal(null);
      setCodeInput("");
      setCodeError("");
    } else {
      setCodeError("코드가 올바르지 않습니다.");
    }
  };

  const handleSaveSlot = async (slotId: string) => {
    if (!template || !selectedRestroomId) return;

    const slot = draftSlots[slotId];
    if (!slot) return;

    if (!slot.inspectorName.trim()) {
      alert("점검자명을 입력해주세요.");
      return;
    }

    const enabledItems = template.items.filter((i) => i.enabled);
    for (const item of enabledItems) {
      if (!slot.answers[item.id]) {
        alert(`'${item.label}' 항목을 선택해주세요.`);
        return;
      }
    }

    const restroom = restrooms.find((r) => r.id === selectedRestroomId);

    const newSlots = {
      ...draftSlots,
      [slotId]: {
        ...slot,
        status: "DONE" as const,
        checkedByRole: mode === "admin" ? ("ADMIN" as const) : ("INSPECTOR" as const),
      },
    };

    try {
      await saveInspectionRecord({
        date: selectedDate,
        restroomId: selectedRestroomId,
        restroomName: restroom?.name ?? "",
        templateId: restroom?.templateId ?? "default_template",
        slots: newSlots,
      });

      setDraftSlots(newSlots);
      const updated = await fetchInspectionRecord(selectedDate, selectedRestroomId);
      setRecord(updated);

      showSuccess(
        `${template.slots.find((s) => s.id === slotId)?.label ?? "선택한 시간"} 점검이 저장되었습니다.`
      );
    } catch (e) {
      setError("저장 중 오류가 발생했습니다.");
    }
  };

  const handleSaveTemplate = async () => {
    if (!adminTemplateDraft) return;

    if (!adminTemplateDraft.id.trim()) {
      alert("템플릿 ID가 비어 있습니다.");
      return;
    }

    try {
      await saveTemplate(adminTemplateDraft);
      showSuccess("선택한 화장실의 점검 항목이 저장되었습니다.");

      if (selectedRestroom?.templateId === adminTemplateDraft.id) {
        setTemplate(JSON.parse(JSON.stringify(adminTemplateDraft)));
      }
    } catch (e) {
      setError("템플릿 저장 중 오류가 발생했습니다.");
    }
  };

  const handleSaveRestroom = async () => {
    const id = editingNewRestroom ? sanitizeId(restroomForm.id) : restroomForm.id;

    if (!id) {
      alert("화장실 ID를 입력해주세요.");
      return;
    }

    try {
      await saveRestroom({ ...restroomForm, id });

      if (adminTemplateDraft) {
        await saveTemplate({
          ...adminTemplateDraft,
          id: restroomForm.templateId,
        });
      }

      showSuccess("화장실 정보가 저장되었습니다.");

      const updated = await fetchAllRestrooms();
      setAdminAllRestrooms(updated);
      await loadRestrooms();

      setEditingNewRestroom(false);
      setRestroomForm((prev) => ({ ...prev, id }));

      if (!selectedRestroomId) {
        setSelectedRestroomId(id);
      }
    } catch (e) {
      setError("화장실 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteRestroom = async () => {
    if (!confirm(`'${restroomForm.name}' 화장실을 삭제하시겠습니까?`)) return;

    try {
      await deleteRestroom(restroomForm.id);
      showSuccess("화장실이 삭제되었습니다.");

      const updated = await fetchAllRestrooms();
      setAdminAllRestrooms(updated);
      await loadRestrooms();

      setRestroomForm({
        id: "",
        name: "",
        code: "",
        locationLabel: "",
        enabled: true,
        templateId: "default_template",
        sortOrder: 0,
      });
      setAdminTemplateDraft(null);
    } catch (e) {
      setError("화장실 삭제 중 오류가 발생했습니다.");
    }
  };

  const modeBadgeColor =
    mode === "viewer" ? "#94a3b8" : mode === "inspector" ? "#3b82f6" : "#a855f7";

  const modeLabel =
    mode === "viewer" ? "일반모드" : mode === "inspector" ? "점검자모드" : "관리자모드";

  const canInput = mode === "inspector" || mode === "admin";
  const isAdmin = mode === "admin";

  const selectedRestroom = restrooms.find((r) => r.id === selectedRestroomId);

  return (
    <div style={styles.body as CSSProperties}>
      <header style={styles.header as CSSProperties}>
        <h1 style={styles.headerTitle as CSSProperties}>🚽 화장실 위생점검표</h1>
        <div style={styles.headerRight as CSSProperties}>
          <span style={(styles.badge as (color: string) => CSSProperties)(modeBadgeColor)}>
            {modeLabel}
          </span>
          {mode === "viewer" ? (
            <>
              <button
                style={(styles.btn as any)("secondary")}
                onClick={() => handleModeSwitch("inspector")}
              >
                점검자모드
              </button>
              <button
                style={(styles.btn as any)("ghost")}
                onClick={() => handleModeSwitch("admin")}
              >
                관리자모드
              </button>
            </>
          ) : (
            <button
              style={(styles.btn as any)("secondary")}
              onClick={() => {
                setMode("viewer");
                setEditingNewRestroom(false);
              }}
            >
              ← 일반모드
            </button>
          )}
        </div>
      </header>

      {showCodeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 320,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
              {showCodeModal === "inspector" ? "점검자" : "관리자"} 인증
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              코드를 입력해주세요.
            </p>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmCode()}
              placeholder="코드 입력"
              style={{ ...(styles.input as CSSProperties), width: "100%", boxSizing: "border-box" }}
              autoFocus
            />
            {codeError && (
              <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{codeError}</p>
            )}
            <div
              style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}
            >
              <button
                style={(styles.btn as any)("secondary")}
                onClick={() => setShowCodeModal(null)}
              >
                취소
              </button>
              <button style={(styles.btn as any)("primary")} onClick={confirmCode}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={styles.main as CSSProperties}>
        {error && <div style={(styles.alert as any)("error")}>{error}</div>}
        {successMsg && <div style={(styles.alert as any)("success")}>{successMsg}</div>}

        <div style={styles.card as CSSProperties}>
          <div style={styles.filterRow as CSSProperties}>
            <div>
              <label style={styles.label as CSSProperties}>날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.input as CSSProperties}
              />
            </div>
            <div>
              <label style={styles.label as CSSProperties}>화장실</label>
              <select
                value={selectedRestroomId}
                onChange={(e) => setSelectedRestroomId(e.target.value)}
                style={styles.select as CSSProperties}
              >
                {restrooms.length === 0 && <option value="">화장실 없음</option>}
                {restrooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 20, color: "#94a3b8", fontSize: 13 }}>
              {selectedDate} · {selectedRestroom?.name ?? "-"}
            </div>
          </div>
        </div>

        {loading && (
          <div
            style={{
              ...(styles.card as CSSProperties),
              textAlign: "center",
              color: "#94a3b8",
              padding: 40,
            }}
          >
            불러오는 중...
          </div>
        )}

        {!loading && template && (
          <div style={styles.card as CSSProperties}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <p style={{ ...(styles.cardTitle as CSSProperties), marginBottom: 0 }}>
                {selectedRestroom?.name} 위생점검표
              </p>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{template.name}</span>
            </div>

            {template.items.filter((i) => i.enabled).length === 0 && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                아직 등록된 점검 항목이 없습니다. 관리자모드에서 화장실별 항목을 추가해주세요.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {template.slots.map((slot) => {
                const slotData = draftSlots[slot.id] ?? {
                  status: "PENDING",
                  inspectorName: "",
                  answers: {},
                  memo: "",
                  checkedByRole: null,
                };

                const isDone = slotData.status === "DONE";
                const enabledItems = template.items
                  .filter((i) => i.enabled)
                  .sort((a, b) => a.order - b.order);

                return (
                  <div key={slot.id} style={styles.slotSection as CSSProperties}>
                    <div style={styles.slotHeader as CSSProperties}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                        {slot.label}
                      </span>
                      <span style={(styles.statusBadge as any)(slotData.status)}>
                        {isDone ? "✓ 점검 완료" : "미점검"}
                      </span>
                    </div>

                    <div style={styles.slotBody as CSSProperties}>
                      <div style={{ marginBottom: 14 }}>
                        <label style={styles.label as CSSProperties}>점검자명</label>
                        {canInput && !isDone ? (
                          <input
                            type="text"
                            value={slotData.inspectorName}
                            onChange={(e) =>
                              setDraftSlots((prev) => ({
                                ...prev,
                                [slot.id]: {
                                  ...prev[slot.id],
                                  inspectorName: e.target.value,
                                },
                              }))
                            }
                            placeholder="점검자명 입력"
                            style={{ ...(styles.input as CSSProperties), width: 200 }}
                          />
                        ) : (
                          <span style={{ fontSize: 14, color: "#374151" }}>
                            {slotData.inspectorName || "-"}
                          </span>
                        )}
                      </div>

                      <table style={styles.table as CSSProperties}>
                        <thead>
                          <tr>
                            <th style={styles.th as CSSProperties}>점검 항목</th>
                            <th style={{ ...(styles.th as CSSProperties), width: 80 }}>결과</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enabledItems.map((item) => {
                            const ans = slotData.answers[item.id] ?? null;

                            return (
                              <tr key={item.id}>
                                <td style={styles.td as CSSProperties}>{item.label}</td>
                                <td style={styles.td as CSSProperties}>
                                  {canInput && !isDone ? (
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button
                                        style={(styles.oxBtn as any)(ans === "O", "O")}
                                        onClick={() =>
                                          setDraftSlots((prev) => ({
                                            ...prev,
                                            [slot.id]: {
                                              ...prev[slot.id],
                                              answers: {
                                                ...prev[slot.id].answers,
                                                [item.id]: ans === "O" ? undefined : "O",
                                              },
                                            },
                                          }))
                                        }
                                      >
                                        O
                                      </button>
                                      <button
                                        style={(styles.oxBtn as any)(ans === "X", "X")}
                                        onClick={() =>
                                          setDraftSlots((prev) => ({
                                            ...prev,
                                            [slot.id]: {
                                              ...prev[slot.id],
                                              answers: {
                                                ...prev[slot.id].answers,
                                                [item.id]: ans === "X" ? undefined : "X",
                                              },
                                            },
                                          }))
                                        }
                                      >
                                        X
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={(styles.oxBadge as any)(ans as "O" | "X" | null)}>
                                      {ans ?? "-"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {canInput && !isDone && (
                        <div style={{ marginTop: 12 }}>
                          <label style={styles.label as CSSProperties}>메모 (선택)</label>
                          <input
                            type="text"
                            value={slotData.memo}
                            onChange={(e) =>
                              setDraftSlots((prev) => ({
                                ...prev,
                                [slot.id]: {
                                  ...prev[slot.id],
                                  memo: e.target.value,
                                },
                              }))
                            }
                            placeholder="특이사항 입력"
                            style={{
                              ...(styles.input as CSSProperties),
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}

                      {isDone && slotData.memo && (
                        <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>
                          메모: {slotData.memo}
                        </div>
                      )}

                      {canInput && !isDone && (
                        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                          <button
                            style={(styles.btn as any)("success")}
                            onClick={() => handleSaveSlot(slot.id)}
                          >
                            저장
                          </button>
                        </div>
                      )}

                      {isDone && slotData.checkedByRole && (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "#94a3b8",
                            textAlign: "right",
                          }}
                        >
                          {slotData.checkedByRole === "ADMIN" ? "관리자" : "점검자"} 저장
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isAdmin && (
          <div style={styles.card as CSSProperties}>
            <p style={styles.cardTitle as CSSProperties}>📋 선택 화장실 점검 항목 관리</p>

            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 13,
                color: "#475569",
              }}
            >
              현재 편집 대상: <b>{restroomForm.name || "선택된 화장실 없음"}</b>
              <br />
              템플릿 ID: <b>{restroomForm.templateId || "-"}</b>
            </div>

            {adminTemplateLoading ? (
              <div style={{ color: "#94a3b8", fontSize: 14 }}>점검 항목 불러오는 중...</div>
            ) : !adminTemplateDraft ? (
              <div style={{ color: "#94a3b8", fontSize: 14 }}>
                화장실을 먼저 선택해주세요.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label as CSSProperties}>점검표 이름</label>
                  <input
                    type="text"
                    value={adminTemplateDraft.name}
                    onChange={(e) =>
                      setAdminTemplateDraft((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev
                      )
                    }
                    style={{
                      ...(styles.input as CSSProperties),
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <table style={styles.table as CSSProperties}>
                  <thead>
                    <tr>
                      <th style={styles.th as CSSProperties}>ID</th>
                      <th style={styles.th as CSSProperties}>항목명</th>
                      <th style={{ ...(styles.th as CSSProperties), width: 60 }}>순서</th>
                      <th style={{ ...(styles.th as CSSProperties), width: 70 }}>사용</th>
                      <th style={{ ...(styles.th as CSSProperties), width: 60 }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminTemplateDraft.items
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((item) => {
                        const realIndex = adminTemplateDraft.items.findIndex((x) => x.id === item.id);

                        return (
                          <tr key={item.id}>
                            <td style={styles.td as CSSProperties}>
                              <input
                                type="text"
                                value={item.id}
                                onChange={(e) =>
                                  setAdminTemplateDraft((prev) => {
                                    if (!prev) return prev;
                                    const items = [...prev.items];
                                    items[realIndex] = { ...item, id: sanitizeId(e.target.value) };
                                    return { ...prev, items };
                                  })
                                }
                                style={{
                                  ...(styles.input as CSSProperties),
                                  width: 110,
                                  padding: "4px 8px",
                                }}
                              />
                            </td>
                            <td style={styles.td as CSSProperties}>
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) =>
                                  setAdminTemplateDraft((prev) => {
                                    if (!prev) return prev;
                                    const items = [...prev.items];
                                    items[realIndex] = { ...item, label: e.target.value };
                                    return { ...prev, items };
                                  })
                                }
                                style={{
                                  ...(styles.input as CSSProperties),
                                  width: 180,
                                  padding: "4px 8px",
                                }}
                              />
                            </td>
                            <td style={styles.td as CSSProperties}>
                              <input
                                type="number"
                                value={item.order}
                                onChange={(e) =>
                                  setAdminTemplateDraft((prev) => {
                                    if (!prev) return prev;
                                    const items = [...prev.items];
                                    items[realIndex] = {
                                      ...item,
                                      order: parseInt(e.target.value) || 0,
                                    };
                                    return { ...prev, items };
                                  })
                                }
                                style={{
                                  ...(styles.input as CSSProperties),
                                  width: 55,
                                  padding: "4px 8px",
                                }}
                              />
                            </td>
                            <td style={styles.td as CSSProperties}>
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={(e) =>
                                  setAdminTemplateDraft((prev) => {
                                    if (!prev) return prev;
                                    const items = [...prev.items];
                                    items[realIndex] = { ...item, enabled: e.target.checked };
                                    return { ...prev, items };
                                  })
                                }
                              />
                            </td>
                            <td style={styles.td as CSSProperties}>
                              <button
                                style={(styles.btnSm as any)("danger")}
                                onClick={() =>
                                  setAdminTemplateDraft((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      items: prev.items.filter((x) => x.id !== item.id),
                                    };
                                  })
                                }
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 16,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    style={(styles.btn as any)("secondary")}
                    onClick={() =>
                      setAdminTemplateDraft((prev) => {
                        if (!prev) return prev;
                        const maxOrder = Math.max(0, ...prev.items.map((i) => i.order)) + 1;
                        return {
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              id: `item_${Date.now()}`,
                              label: "새 항목",
                              type: "OX",
                              order: maxOrder,
                              enabled: true,
                            } as TemplateItem,
                          ],
                        };
                      })
                    }
                  >
                    + 항목 추가
                  </button>

                  <button
                    style={(styles.btn as any)("primary")}
                    onClick={handleSaveTemplate}
                  >
                    점검 항목 저장
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {isAdmin && (
          <div style={styles.card as CSSProperties}>
            <p style={styles.cardTitle as CSSProperties}>🚽 화장실 관리</p>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {adminAllRestrooms.map((r) => (
                  <button
                    key={r.id}
                    style={{
                      ...(styles.btnSm as any)(
                        restroomForm.id === r.id && !editingNewRestroom
                          ? "primary"
                          : "secondary"
                      ),
                    }}
                    onClick={() => {
                      setRestroomForm({ ...r });
                      setEditingNewRestroom(false);
                    }}
                  >
                    {r.name}
                  </button>
                ))}

                <button
                  style={(styles.btnSm as any)(editingNewRestroom ? "primary" : "ghost")}
                  onClick={() => {
                    setEditingNewRestroom(true);
                    setRestroomForm({
                      id: "",
                      name: "",
                      code: "",
                      locationLabel: "",
                      enabled: true,
                      templateId: `template_${Date.now()}`,
                      sortOrder: 0,
                    });
                    setAdminTemplateDraft(createEmptyTemplate(`template_${Date.now()}`));
                  }}
                >
                  + 새 화장실
                </button>
              </div>
            </div>

            <div style={styles.divider as CSSProperties} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 24px",
              }}
            >
              <div style={styles.formGroup as CSSProperties}>
                <label style={styles.label as CSSProperties}>화장실 ID</label>
                <input
                  type="text"
                  value={restroomForm.id}
                  readOnly={!editingNewRestroom}
                  onChange={(e) =>
                    setRestroomForm((p) => ({
                      ...p,
                      id: sanitizeId(e.target.value),
                    }))
                  }
                  placeholder="예: restroom_10f_m"
                  style={{
                    ...(styles.input as CSSProperties),
                    width: "100%",
                    boxSizing: "border-box",
                    background: !editingNewRestroom ? "#f8fafc" : "#fff",
                  }}
                />
                {editingNewRestroom && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    영문/숫자/언더스코어만 허용
                  </span>
                )}
              </div>

              <div style={styles.formGroup as CSSProperties}>
                <label style={styles.label as CSSProperties}>이름</label>
                <input
                  type="text"
                  value={restroomForm.name}
                  onChange={(e) =>
                    setRestroomForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="예: 10층 남자화장실"
                  style={{
                    ...(styles.input as CSSProperties),
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={styles.formGroup as CSSProperties}>
                <label style={styles.label as CSSProperties}>코드</label>
                <input
                  type="text"
                  value={restroomForm.code}
                  onChange={(e) =>
                    setRestroomForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="예: 10F-M"
                  style={{
                    ...(styles.input as CSSProperties),
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={styles.formGroup as CSSProperties}>
                <label style={styles.label as CSSProperties}>위치</label>
                <input
                  type="text"
                  value={restroomForm.locationLabel}
                  onChange={(e) =>
                    setRestroomForm((p) => ({
                      ...p,
                      locationLabel: e.target.value,
                    }))
                  }
                  placeholder="예: 10F"
                  style={{
                    ...(styles.input as CSSProperties),
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={styles.formGroup as CSSProperties}>
                <label style={styles.label as CSSProperties}>정렬 순서</label>
                <input
                  type="number"
                  value={restroomForm.sortOrder}
                  onChange={(e) =>
                    setRestroomForm((p) => ({
                      ...p,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                  style={{
                    ...(styles.input as CSSProperties),
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={styles.formGroup as CSSProperties}>
                <label style={styles.label as CSSProperties}>템플릿 ID</label>
                <input
                  type="text"
                  value={restroomForm.templateId}
                  onChange={(e) =>
                    setRestroomForm((p) => ({
                      ...p,
                      templateId: sanitizeId(e.target.value),
                    }))
                  }
                  placeholder="default_template"
                  style={{
                    ...(styles.input as CSSProperties),
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  ...(styles.formGroup as CSSProperties),
                  gridColumn: "1/3",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  id="restroomEnabled"
                  checked={restroomForm.enabled}
                  onChange={(e) =>
                    setRestroomForm((p) => ({
                      ...p,
                      enabled: e.target.checked,
                    }))
                  }
                />
                <label htmlFor="restroomEnabled" style={{ fontSize: 14, color: "#374151" }}>
                  활성화 (목록에 표시)
                </label>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              {!editingNewRestroom && restroomForm.id && (
                <button
                  style={(styles.btn as any)("danger")}
                  onClick={handleDeleteRestroom}
                >
                  삭제
                </button>
              )}
              <button style={(styles.btn as any)("primary")} onClick={handleSaveRestroom}>
                저장
              </button>
            </div>
          </div>
        )}

        {!loading && !template && !error && (
          <div
            style={{
              ...(styles.card as CSSProperties),
              textAlign: "center",
              padding: 48,
              color: "#94a3b8",
            }}
          >
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>🚽</p>
            <p style={{ margin: 0, fontSize: 15 }}>
              {restrooms.length === 0
                ? "등록된 화장실이 없습니다. 관리자 모드에서 화장실을 추가해주세요."
                : "화장실을 선택하면 점검표가 표시됩니다."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}