import { z } from 'zod';

export const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const StatusEnum = z.enum(['URGENT', 'IN_PROGRESS', 'REVIEW', 'PENDING', 'DONE']);
export const RoleEnum = z.enum(['OFICINA', 'EXPANSOR', 'TRAINER']);
export const VacationStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export type Priority = z.infer<typeof PriorityEnum>;
export type Status = z.infer<typeof StatusEnum>;
export type Role = z.infer<typeof RoleEnum>;
export type VacationStatus = z.infer<typeof VacationStatusEnum>;

/**
 * Contrato de datos estricto para Tareas Logísticas
 */
export const TaskSchema = z.object({
  id: z.string().uuid({ message: "El ID de la tarea debe ser un UUID v4 válido." }),
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100),
  routeId: z.string().min(1, { message: "La tarea debe estar vinculada a una ciudad logística (routeId)." }),
  assignedPair: z.string().min(1, { message: "Debes asignar un responsable para la tarea." }),
  priority: PriorityEnum,
  status: StatusEnum,
  dueDate: z.string(), // Fecha ISO o similar para el MVP
  tags: z.array(z.string().min(1)).default([]),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
  })).default([]),
});

/**
 * Contrato de datos estricto para Planificación de Vacaciones
 */
export const VacationSchema = z.object({
  id: z.string().uuid({ message: "El ID de vacaciones debe ser un UUID v4 válido." }),
  userId: z.string().min(1, { message: "El ID de usuario es obligatorio." }),
  role: RoleEnum,
  startDate: z.string(), // Formato YYYY-MM-DD
  endDate: z.string(), // Formato YYYY-MM-DD
  status: VacationStatusEnum,
  type: z.string().optional(),
  comment: z.string().optional(),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "La fecha de inicio no puede ser posterior a la fecha de fin.",
  path: ["endDate"],
});

// Tipos estáticos inferidos de los esquemas
export type Task = z.infer<typeof TaskSchema>;
export type Vacation = z.infer<typeof VacationSchema>;

// Estructuras auxiliares para el dominio de LevelUp Desarrollo
export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  email?: string;
  allowedViews?: string[];
}

export interface RouteCity {
  id: string;
  name: string;
  region: string;
}

export interface TagType {
  name: string;
  color: string;
}
