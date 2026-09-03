import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

function convertTimestamps(data: DocumentData): DocumentData {
  const result: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      result[key] = (value as { toDate: () => Date }).toDate();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertTimestamps(value as DocumentData);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? convertTimestamps(item as DocumentData)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function docToData(docSnap: DocumentSnapshot<DocumentData>): (DocumentData & { id: string }) | null {
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamps(docSnap.data()!) };
}

function snapshotToArray(snapshot: QuerySnapshot<DocumentData>): DocumentData[] {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) }));
}

export function subscribeToFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  callback: (data: T[]) => void,
  ...constraints: QueryConstraint[]
): () => void {
  const colRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

  return onSnapshot(q, (snapshot) => {
    callback(snapshotToArray(snapshot) as T[]);
  });
}

export function subscribeToFirestoreDoc<T extends { id: string }>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): () => void {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(docRef, (docSnap) => {
    callback(docToData(docSnap) as T | null);
  });
}

export { where, orderBy, firestoreLimit as limit };
