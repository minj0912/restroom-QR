import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firestore";

export type Inspection = {
  id: string;
  restroomId: string;
  date: string;
  inspector: string;
  results: Record<string, boolean>;
  createdAt?: any;
};

export async function saveInspection(params: {
  restroomId: string;
  date: string;
  inspector: string;
  results: Record<string, boolean>;
}) {
  await addDoc(collection(db, "inspections"), {
    restroomId: params.restroomId,
    date: params.date,
    inspector: params.inspector,
    results: params.results,
    createdAt: serverTimestamp(),
  });
}

export async function getInspectionByDate(restroomId: string, date: string) {
  const q = query(
    collection(db, "inspections"),
    where("restroomId", "==", restroomId),
    where("date", "==", date),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<Inspection, "id">),
  };
}