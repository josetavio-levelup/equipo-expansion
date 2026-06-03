import { type Task, type Vacation, type TeamMember, type RouteCity, type TagType } from "../types";

// Helper to determine active conflicts (Vacation lock check)
export function checkVacationConflict(
  assignedPair: string,
  dueDateStr: string,
  currentVacations: Vacation[],
  currentTeam: TeamMember[]
): { hasConflict: boolean; message?: string } {
  if (!dueDateStr) {
    return { hasConflict: false };
  }
  const parts = assignedPair.split("-").filter(Boolean);
  if (parts.length === 0) {
    return { hasConflict: false };
  }
  const taskDate = new Date(dueDateStr);

  const activeVacations = currentVacations.filter(v => v.status === "APPROVED");

  for (const memberId of parts) {
    const memberVacations = activeVacations.filter(v => v.userId === memberId);
    for (const vac of memberVacations) {
      const vStart = new Date(vac.startDate + "T00:00:00");
      const vEnd = new Date(vac.endDate + "T23:59:59");
      if (taskDate >= vStart && taskDate <= vEnd) {
        const member = currentTeam.find(m => m.id === memberId);
        const memberName = member ? member.name : memberId;
        const memberRole = member ? member.role : "Socio";
        return {
          hasConflict: true,
          message: `Operación bloqueada: El ${memberRole} asignado (${memberName}) se encuentra en un periodo de vacaciones aprobado (Rango: ${vac.startDate} al ${vac.endDate}).`,
        };
      }
    }
  }

  return { hasConflict: false };
}

// Fetch all elements from Google Sheets
export async function fetchAllFromSheet(token: string, spreadsheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Tareas!A:I&ranges=Miembros de Equipo!A:E&ranges=Ciudades Logísticas!A:C&ranges=Etiquetas!A:B&ranges=Vacaciones!A:I`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API Error: ${res.statusText} - ${text}`);
  }
  const result = await res.json();
  const valueRanges = result.valueRanges || [];

  const getValues = (rangeIdx: number) => {
    return valueRanges[rangeIdx]?.values || [];
  };

  // 1. Tareas (Tasks)
  const taskRows = getValues(0);
  const tasksList: Task[] = [];
  if (taskRows.length > 1) {
    for (let i = 1; i < taskRows.length; i++) {
      const r = taskRows[i];
      if (!r[0] || !r[1]) continue;
      let subtasksParsed = [];
      try {
        subtasksParsed = r[8] ? JSON.parse(r[8]) : [];
      } catch (e) {}
      tasksList.push({
        id: r[0],
        title: r[1],
        routeId: r[2] || "",
        assignedPair: r[3] || "",
        priority: (r[4] || "LOW") as any,
        status: (r[5] || "PENDING") as any,
        dueDate: r[6] || "",
        tags: r[7] ? r[7].split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        subtasks: subtasksParsed,
      });
    }
  }

  // 2. Miembros de Equipo
  const memberRows = getValues(1);
  const membersList: TeamMember[] = [];
  if (memberRows.length > 1) {
    for (let i = 1; i < memberRows.length; i++) {
      const r = memberRows[i];
      if (!r[0] || !r[1]) continue;
      membersList.push({
        id: r[0],
        name: r[1],
        role: r[2] || "EXPANSOR",
        email: r[3] || "",
        allowedViews: r[4] ? r[4].split(",").map((s: string) => s.trim()).filter(Boolean) : ["tasks"],
      });
    }
  }

  // 3. Ciudades Logísticas
  const cityRows = getValues(2);
  const citiesList: RouteCity[] = [];
  if (cityRows.length > 1) {
    for (let i = 1; i < cityRows.length; i++) {
      const r = cityRows[i];
      if (!r[0] || !r[1]) continue;
      citiesList.push({
        id: r[0],
        name: r[1],
        region: r[2] || "",
      });
    }
  }

  // 4. Etiquetas
  const tagRows = getValues(3);
  const tagsList: TagType[] = [];
  if (tagRows.length > 1) {
    for (let i = 1; i < tagRows.length; i++) {
      const r = tagRows[i];
      if (!r[0]) continue;
      tagsList.push({
        name: r[0].toUpperCase(),
        color: r[1] || "#64748b",
      });
    }
  }

  // 5. Vacaciones
  const vacRows = getValues(4);
  const vacsList: Vacation[] = [];
  if (vacRows.length > 1) {
    for (let i = 1; i < vacRows.length; i++) {
      const r = vacRows[i];
      if (!r[0] || !r[1]) continue;
      vacsList.push({
        id: r[0],
        userId: r[1],
        role: r[2] || "EXPANSOR",
        startDate: r[3] || "",
        endDate: r[4] || "",
        status: (r[5] || "PENDING") as any,
        type: (r[6] || "otro") as any,
        comment: r[7] || "",
      });
    }
  }

  return {
    tasks: tasksList,
    teamMembers: membersList,
    routeCities: citiesList,
    tagsBank: tagsList,
    vacations: vacsList,
  };
}

// Rewrite element tab
export async function writeSheetTab(
  token: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[],
  rows: any[][]
) {
  // 1. Clear tab from row 1 to 5000
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:Z5000:clear`;
  const clearRes = await fetch(clearUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!clearRes.ok) {
    const text = await clearRes.text();
    throw new Error(`Failed to clear tab ${tabName}: ${clearRes.statusText} - ${text}`);
  }

  // 2. Overwrite tab with headers & rows
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`;
  const body = {
    range: `${tabName}!A1`,
    majorDimension: "ROWS",
    values: [headers, ...rows]
  };

  const res = await fetch(writeUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write tab ${tabName}: ${res.statusText} - ${text}`);
  }
}



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
      { id: "sub-1-3", title: "Consultar normativa municipal de ruidos", completed: false }
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
      { id: "sub-2-2", title: "Confirmar transferencia bancaria de fianza", completed: true }
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
  { name: "AUDITORIA", color: "#ec4899" }
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

// Search or Setup Google Sheets
export async function setupGoogleSheet(token: string) {
  // 1. Search for existing sheet file
  const query = "name='Bunker de Datos de LevelUp (Logística & Vacaciones)' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Error al buscar la hoja en Drive: ${errText}`);
  }

  const searchData: any = await searchRes.json();
  const files = searchData.files || [];

  if (files.length > 0) {
    const fileId = files[0].id;
    return {
      success: true,
      spreadsheetId: fileId,
      name: files[0].name,
      isNew: false,
      message: "¡Base de datos de Google Sheets detectada y sincronizada exitosamente!"
    };
  }

  // 2. Create new Spreadsheet
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: {
        title: "Bunker de Datos de LevelUp (Logística & Vacaciones)"
      },
      sheets: [
        { properties: { title: "Tareas" } },
        { properties: { title: "Miembros de Equipo" } },
        { properties: { title: "Ciudades Logísticas" } },
        { properties: { title: "Etiquetas" } },
        { properties: { title: "Vacaciones" } }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear la hoja en Google Drive: ${errText}`);
  }

  const createData: any = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;

  // 3. Write default columns & seed data
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;

  const batchBody = {
    valueInputOption: "USER_ENTERED",
    data: [
      {
        range: "Tareas!A1",
        values: [
          ["ID", "Título", "ID Ciudad", "Binomio Asignado", "Prioridad", "Estado", "Fecha Límite", "Etiquetas (separadas por comas)", "Checklist Subtareas (JSON)"],
          ...DEFAULT_TASKS.map(t => [
            t.id,
            t.title,
            t.routeId,
            t.assignedPair,
            t.priority,
            t.status,
            t.dueDate,
            t.tags.join(","),
            JSON.stringify(t.subtasks || [])
          ])
        ]
      },
      {
        range: "Miembros de Equipo!A1",
        values: [
          ["ID", "Nombre", "Rol", "Email", "Vistas Permitidas (separadas por comas)"],
          ...DEFAULT_TEAM_MEMBERS.map(m => [
            m.id,
            m.name,
            m.role,
            m.email,
            m.allowedViews.join(",")
          ])
        ]
      },
      {
        range: "Ciudades Logísticas!A1",
        values: [
          ["ID", "Nombre", "Región"],
          ...DEFAULT_ROUTE_CITIES.map(c => [
            c.id,
            c.name,
            c.region
          ])
        ]
      },
      {
        range: "Etiquetas!A1",
        values: [
          ["Nombre", "Color"],
          ...DEFAULT_TAGS_BANK.map(t => [
            t.name,
            t.color
          ])
        ]
      },
      {
        range: "Vacaciones!A1",
        values: [
          ["ID", "ID Usuario", "Rol", "Fecha Inicio", "Fecha Fin", "Estado", "Tipo", "Comentario"],
          ...DEFAULT_VACATIONS.map(v => [
            v.id,
            v.userId,
            v.role,
            v.startDate,
            v.endDate,
            v.status,
            v.type,
            v.comment || ""
          ])
        ]
      }
    ]
  };

  const populateRes = await fetch(writeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(batchBody)
  });

  if (!populateRes.ok) {
    const errText = await populateRes.text();
    throw new Error(`Error al poblar datos por defecto en Sheets: ${errText}`);
  }

  return {
    success: true,
    spreadsheetId,
    name: "Bunker de Datos de LevelUp (Logística & Vacaciones)",
    isNew: true,
    message: "¡Se ha creado y configurado una nueva base de datos en tu Google Drive!",
  };
}
