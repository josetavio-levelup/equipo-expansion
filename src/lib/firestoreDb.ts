import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { type Task, type Vacation, type TeamMember, type RouteCity, type TagType } from "../types";

// ── Default seed data ────────────────────────────────────────────────────────

export const DEFAULT_TASKS: Task[] = [
  {
    id: "f3b3b2b1-1234-4bc1-9abc-123456789001",
    title: "Inspección de local comercial Av. Francia",
    routeId: "valencia",
    assignedPair: "t_carlos-e_pablo",
    priority: "HIGH",
    status: "IN_PROGRESS",
    dueDate: "2026-06-05T12:00:00",
    tags: ["LOCAL", "CONTRATO"],
    subtasks: [
      { id: "sub-1-1", title: "Verificar instalación eléctrica", completed: true },
      { id: "sub-1-2", title: "Medición exacta de metros cuadrados públicos", completed: false },
      { id: "sub-1-3", title: "Consultar normativa municipal de ruidos", completed: false },
    ],
  },
  {
    id: "f3b3b2b1-1234-4bc1-9abc-123456789002",
    title: "Firma de Escrituras Madrid Norte",
    routeId: "madrid",
    assignedPair: "t_sofia-e_laura",
    priority: "CRITICAL",
    status: "URGENT",
    dueDate: "2026-06-12T12:00:00",
    tags: ["NOTARIA", "FINANZAS"],
    subtasks: [
      { id: "sub-2-1", title: "Revisar borrador del notario", completed: true },
      { id: "sub-2-2", title: "Confirmar transferencia bancaria de fianza", completed: true },
    ],
  },
  {
    id: "f3b3b2b1-1234-4bc1-9abc-123456789003",
    title: "Auditoría de Procesos de Formación",
    routeId: "barcelona",
    assignedPair: "t_carlos-e_jaime",
    priority: "MEDIUM",
    status: "PENDING",
    dueDate: "2026-06-20T12:00:00",
    tags: ["TRAINING", "AUDITORIA"],
    subtasks: [],
  },
];

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: "t_carlos", name: "Carlos Mendoza", role: "TRAINER", email: "carlos.mendoza@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "t_sofia", name: "Sofía Ruiz", role: "TRAINER", email: "sofia.ruiz@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "e_pablo", name: "Pablo Miralles", role: "EXPANSOR", email: "pablo.miralles@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations", "control"] },
  { id: "e_laura", name: "Laura Gómez", role: "EXPANSOR", email: "laura.gomez@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "e_jaime", name: "Jaime Torres", role: "EXPANSOR", email: "jaime.torres@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "o_marta", name: "Marta Alarcón", role: "OFICINA", email: "marta.alarcon@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations", "control"] },
];

export const DEFAULT_ROUTE_CITIES: RouteCity[] = [
  { id: "valencia", name: "Valencia Centro", region: "Comunidad Valenciana" },
  { id: "madrid", name: "Madrid Norte", region: "Madrid" },
  { id: "barcelona", name: "Barcelona Sur", region: "Cataluña" },
  { id: "zaragoza", name: "Zaragoza Hub", region: "Aragón" },
  { id: "sevilla", name: "Sevilla Expansión", region: "Andalucía" },
];

export const DEFAULT_TAGS_BANK: TagType[] = [
  { name: "LOCAL", color: "#06b6d4" },
  { name: "CONTRATO", color: "#10b981" },
  { name: "NOTARIA", color: "#ef4444" },
  { name: "FINANZAS", color: "#8b5cf6" },
  { name: "TRAINING", color: "#f59e0b" },
  { name: "AUDITORIA", color: "#ec4899" },
];

export const DEFAULT_VACATIONS: Vacation[] = [
  {
    id: "e5a5a2a1-1234-4bc1-9abc-111122223333",
    userId: "e_pablo",
    role: "EXPANSOR",
    startDate: "2026-06-01",
    endDate: "2026-06-08",
    status: "APPROVED",
    type: "vacaciones",
    comment: "Vacaciones de verano",
  },
  {
    id: "e5a5a2a1-1234-4bc1-9abc-111122224444",
    userId: "t_sofia",
    role: "TRAINER",
    startDate: "2026-06-15",
    endDate: "2026-06-22",
    status: "APPROVED",
    type: "curso",
    comment: "Curso Avanzado",
  },
  {
    id: "e5a5a2a1-1234-4bc1-9abc-111122225555",
    userId: "e_laura",
    role: "EXPANSOR",
    startDate: "2026-06-25",
    endDate: "2026-06-30",
    status: "PENDING",
    type: "otro",
    comment: "Asuntos Propios",
  },
];

// ── Vacation conflict check ──────────────────────────────────────────────────

export function checkVacationConflict(
  assignedPair: string,
  dueDateStr: string,
  currentVacations: Vacation[],
  currentTeam: TeamMember[]
): { hasConflict: boolean; message?: string } {
  if (!dueDateStr) return { hasConflict: false };
  const parts = assignedPair.split("-").filter(Boolean);
  if (!parts.length) return { hasConflict: false };

  const taskDate = new Date(dueDateStr);
  const approved = currentVacations.filter(v => v.status === "APPROVED");

  for (const memberId of parts) {
    for (const vac of approved.filter(v => v.userId === memberId)) {
      const vStart = new Date(vac.startDate + "T00:00:00");
      const vEnd = new Date(vac.endDate + "T23:59:59");
      if (taskDate >= vStart && taskDate <= vEnd) {
        const member = currentTeam.find(m => m.id === memberId);
        const memberName = member ? member.name : memberId;
        const memberRole = member ? member.role : "Socio";
        return {
          hasConflict: true,
          message: `Operación bloqueada: El ${memberRole} asignado (${memberName}) se encuentra en vacaciones aprobadas (${vac.startDate} al ${vac.endDate}).`,
        };
      }
    }
  }
  return { hasConflict: false };
}

// ── Seed default data (only if collections are empty) ───────────────────────

export async function seedDefaultData(): Promise<void> {
  const batch = writeBatch(db);
  let needsSeed = false;

  const tasksSnap = await getDocs(collection(db, "tasks"));
  if (tasksSnap.empty) {
    needsSeed = true;
    for (const task of DEFAULT_TASKS) {
      batch.set(doc(db, "tasks", task.id), task);
    }
  }

  const membersSnap = await getDocs(collection(db, "teamMembers"));
  if (membersSnap.empty) {
    needsSeed = true;
    for (const m of DEFAULT_TEAM_MEMBERS) {
      batch.set(doc(db, "teamMembers", m.id), m);
    }
  }

  const citiesSnap = await getDocs(collection(db, "routeCities"));
  if (citiesSnap.empty) {
    needsSeed = true;
    for (const c of DEFAULT_ROUTE_CITIES) {
      batch.set(doc(db, "routeCities", c.id), c);
    }
  }

  const tagsSnap = await getDocs(collection(db, "tagsBank"));
  if (tagsSnap.empty) {
    needsSeed = true;
    for (const t of DEFAULT_TAGS_BANK) {
      batch.set(doc(db, "tagsBank", t.name), t);
    }
  }

  const vacsSnap = await getDocs(collection(db, "vacations"));
  if (vacsSnap.empty) {
    needsSeed = true;
    for (const v of DEFAULT_VACATIONS) {
      batch.set(doc(db, "vacations", v.id), v);
    }
  }

  if (needsSeed) await batch.commit();
}

// ── Real-time subscriptions ──────────────────────────────────────────────────

export interface SubscriptionCallbacks {
  onTasks: (tasks: Task[]) => void;
  onVacations: (vacations: Vacation[]) => void;
  onTeamMembers: (members: TeamMember[]) => void;
  onRouteCities: (cities: RouteCity[]) => void;
  onTagsBank: (tags: TagType[]) => void;
}

export function subscribeToAll(callbacks: SubscriptionCallbacks): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(query(collection(db, "tasks")), snap => {
      callbacks.onTasks(snap.docs.map(d => d.data() as Task));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "vacations")), snap => {
      callbacks.onVacations(snap.docs.map(d => d.data() as Vacation));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "teamMembers")), snap => {
      callbacks.onTeamMembers(snap.docs.map(d => d.data() as TeamMember));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "routeCities")), snap => {
      callbacks.onRouteCities(snap.docs.map(d => d.data() as RouteCity));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "tagsBank")), snap => {
      callbacks.onTagsBank(snap.docs.map(d => d.data() as TagType));
    })
  );

  return () => unsubs.forEach(u => u());
}

// ── Tasks CRUD ───────────────────────────────────────────────────────────────

export async function addTask(task: Task): Promise<void> {
  await setDoc(doc(db, "tasks", task.id), task);
}

export async function updateTask(task: Task): Promise<void> {
  await setDoc(doc(db, "tasks", task.id), task);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, "tasks", id));
}

// ── Vacations CRUD ───────────────────────────────────────────────────────────

export async function addVacation(vacation: Vacation): Promise<void> {
  await setDoc(doc(db, "vacations", vacation.id), vacation);
}

export async function updateVacation(vacation: Vacation): Promise<void> {
  await setDoc(doc(db, "vacations", vacation.id), vacation);
}

export async function deleteVacation(id: string): Promise<void> {
  await deleteDoc(doc(db, "vacations", id));
}

// ── Team Members CRUD ────────────────────────────────────────────────────────

export async function addTeamMember(member: TeamMember): Promise<void> {
  await setDoc(doc(db, "teamMembers", member.id), member);
}

export async function deleteTeamMember(id: string): Promise<void> {
  await deleteDoc(doc(db, "teamMembers", id));
}

// ── Route Cities CRUD ────────────────────────────────────────────────────────

export async function addRouteCity(city: RouteCity): Promise<void> {
  await setDoc(doc(db, "routeCities", city.id), city);
}

export async function deleteRouteCity(id: string): Promise<void> {
  await deleteDoc(doc(db, "routeCities", id));
}

// ── Tags Bank CRUD ───────────────────────────────────────────────────────────

export async function addTag(tag: TagType): Promise<void> {
  await setDoc(doc(db, "tagsBank", tag.name), tag);
}

export async function deleteTag(name: string): Promise<void> {
  await deleteDoc(doc(db, "tagsBank", name));
}
