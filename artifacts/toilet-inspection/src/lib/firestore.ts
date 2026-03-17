import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Restroom } from "../types/restroom";
import type { InspectionRecord } from "../types/inspection";
import type { InspectionTemplate } from "../types/template";

export async function fetchRestrooms(): Promise<Restroom[]> {
  const q = query(
    collection(db, "restrooms"),
    where("enabled", "==", true),
    orderBy("sortOrder", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Restroom));
}

export async function fetchInspectionRecord(
  date: string,
  restroomId: string
): Promise<InspectionRecord | null> {
  const docId = `${date}_${restroomId}`;
  const ref = doc(db, "inspectionRecords", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as InspectionRecord;
}

export async function fetchTemplate(
  templateId: string
): Promise<InspectionTemplate | null> {
  const ref = doc(db, "templates", templateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as InspectionTemplate;
}

export async function saveInspectionRecord(
  record: Omit<InspectionRecord, "id">
): Promise<void> {
  const docId = `${record.date}_${record.restroomId}`;
  const ref = doc(db, "inspectionRecords", docId);
  await setDoc(ref, record, { merge: true });
}

export async function saveTemplate(
  template: InspectionTemplate
): Promise<void> {
  const { id, ...data } = template;
  const ref = doc(db, "templates", id);
  await setDoc(ref, data, { merge: true });
}

export async function saveRestroom(restroom: Restroom): Promise<void> {
  const { id, ...data } = restroom;
  const ref = doc(db, "restrooms", id);
  await setDoc(ref, data);
}

export async function deleteRestroom(restroomId: string): Promise<void> {
  const ref = doc(db, "restrooms", restroomId);
  await deleteDoc(ref);
}

export async function fetchAllRestrooms(): Promise<Restroom[]> {
  const snap = await getDocs(collection(db, "restrooms"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Restroom))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}