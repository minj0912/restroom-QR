import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firestore";

export type CheckItem = {
  id: string;
  restroomId: string;
  label: string;
  type: "OX";
  order?: number;
};

export async function addCheckItem(
  restroomId: string,
  label: string,
  order: number = 0
) {
  await addDoc(collection(db, "checkItems"), {
    restroomId,
    label,
    type: "OX",
    order,
  });
}

export async function getCheckItems(restroomId: string): Promise<CheckItem[]> {
  const q = query(
    collection(db, "checkItems"),
    where("restroomId", "==", restroomId),
    orderBy("order", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<CheckItem, "id">),
  }));
}

export async function updateCheckItem(itemId: string, data: Partial<CheckItem>) {
  await updateDoc(doc(db, "checkItems", itemId), data);
}

export async function deleteCheckItem(itemId: string) {
  await deleteDoc(doc(db, "checkItems", itemId));
}