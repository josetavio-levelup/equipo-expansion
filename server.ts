import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  TaskSchema, 
  VacationSchema, 
  type Task, 
  type Vacation, 
  type TeamMember, 
  type RouteCity,
  type TagType
} from "./src/types";

const app = express();
app.use(express.json());

const PORT = 3000;

// Centralized seed data
let TEAM_MEMBERS: TeamMember[] = [
  { id: "t_carlos", name: "Carlos Mendoza", role: "TRAINER", email: "carlos.mendoza@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "t_sofia", name: "Sofía Ruiz", role: "TRAINER", email: "sofia.ruiz@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "e_pablo", name: "Pablo Miralles", role: "EXPANSOR", email: "pablo.miralles@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations", "control"] },
  { id: "e_laura", name: "Laura Gómez", role: "EXPANSOR", email: "laura.gomez@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "e_jaime", name: "Jaime Torres", role: "EXPANSOR", email: "jaime.torres@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations"] },
  { id: "o_marta", name: "Marta Alarcón", role: "OFICINA", email: "marta.alarcon@levelupdesarrollo.com", allowedViews: ["tasks", "calendar", "vacations", "control"] },
];

let ROUTE_CITIES: RouteCity[] = [
  { id: "valencia", name: "Valencia Centro", region: "Comunidad Valenciana" },
  { id: "madrid", name: "Madrid Norte", region: "Madrid" },
  { id: "barcelona", name: "Barcelona Sur", region: "Cataluña" },
  { id: "zaragoza", name: "Zaragoza Hub", region: "Aragón" },
  { id: "sevilla", name: "Sevilla Expansión", region: "Andalucía" },
];

let TAGS_BANK: TagType[] = [
  { name: "LOCAL", color: "#06b6d4" },
  { name: "CONTRATO", color: "#10b981" },
  { name: "NOTARIA", color: "#ef4444" },
  { name: "FINANZAS", color: "#8b5cf6" },
  { name: "TRAINING", color: "#f59e0b" },
  { name: "AUDITORIA", color: "#ec4899" }
];

let tasks: Task[] = [
  {
    id: "f3b3b2b1-1234-4bc1-9abc-123456789001",
    title: "Inspección de local comercial Av. Francia",
    routeId: "valencia",
    assignedPair: ["t_carlos", "e_pablo"],
    priority: "HIGH",
    status: "IN_PROGRESS",
    dueDate: "2026-06-05T10:00:00.000Z",
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
    assignedPair: ["t_sofia", "e_laura"],
    priority: "CRITICAL",
    status: "URGENT",
    dueDate: "2026-06-12T12:00:00.000Z",
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
    assignedPair: ["t_carlos", "e_jaime"],
    priority: "MEDIUM",
    status: "PENDING",
    dueDate: "2026-06-20T09:00:00.000Z",
    tags: ["TRAINING", "AUDITORIA"],
    subtasks: [],
  },
];

let vacations: Vacation[] = [
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

// Helper to determine active conflicts (Vacation lock check)
function checkVacationConflictDynamic(
  assignedPair: string | string[], 
  dueDateStr: string, 
  currentVacations: Vacation[], 
  currentTeam: TeamMember[]
): { hasConflict: boolean; message?: string } {
  if (!dueDateStr) {
    return { hasConflict: false };
  }
  const parts = Array.isArray(assignedPair)
    ? assignedPair
    : (assignedPair as string).split("-").filter(Boolean);
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

// Google Sheets Context
interface SheetsContext {
  token: string;
  sheetId: string;
}

function getSheetsCtx(req: any): SheetsContext | null {
  const auth = req.headers.authorization;
  const sheetId = req.headers["x-sheet-id"];
  if (auth && auth.startsWith("Bearer ") && sheetId) {
    return {
      token: auth.substring(7).trim(),
      sheetId: sheetId as string,
    };
  }
  return null;
}

// Fetch all elements from Google Sheets
async function fetchAllFromSheet(token: string, spreadsheetId: string) {
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
        assignedPair: r[3] ? r[3].split(",").map((s: string) => s.trim()).filter(Boolean) : [],
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
async function writeSheetTab(token: string, spreadsheetId: string, tabName: string, headers: string[], rows: any[][]) {
  // 1. Clear tab from row 1 to 5000
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:Z5000:clear`;
  await fetch(clearUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

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

// --- API Endpoints ---

app.post("/api/sheets/setup", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No autorizado. Token de Google requerido." });
  }
  const token = auth.substring(7);

  try {
    // 1. Search for existing sheet file
    const query = "name='Bunker de Datos de LevelUp (Logística & Vacaciones)' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(searchRes.status).json({ success: false, message: `Error al buscar la hoja en Drive: ${errText}` });
    }

    const searchData: any = await searchRes.json();
    const files = searchData.files || [];

    if (files.length > 0) {
      const fileId = files[0].id;
      return res.json({ 
        success: true, 
        spreadsheetId: fileId, 
        name: files[0].name,
        isNew: false,
        message: "¡Base de datos de Google Sheets detectada y sincronizada exitosamente!" 
      });
    }

    // 2. If not found, create new Spreadsheet
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
      return res.status(createRes.status).json({ success: false, message: `Error al crear hoja: ${errText}` });
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
            ...tasks.map(t => [
              t.id,
              t.title,
              t.routeId,
            t.assignedPair ? (Array.isArray(t.assignedPair) ? t.assignedPair.join(",") : t.assignedPair) : "",
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
            ...TEAM_MEMBERS.map(m => [
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
            ...ROUTE_CITIES.map(c => [
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
            ...TAGS_BANK.map(t => [
              t.name,
              t.color
            ])
          ]
        },
        {
          range: "Vacaciones!A1",
          values: [
            ["ID", "ID Usuario", "Rol", "Fecha Inicio", "Fecha Fin", "Estado", "Tipo", "Comentario"],
            ...vacations.map(v => [
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
      return res.status(populateRes.status).json({ success: false, message: `Error al poblar datos: ${errText}` });
    }

    return res.json({
      success: true,
      spreadsheetId,
      name: "Bunker de Datos de LevelUp (Logística & Vacaciones)",
      isNew: true,
      message: "¡Se ha creado y configurado una nueva base de datos en tu Google Drive!",
    });
  } catch (error: any) {
    console.error("Setup Sheets error:", error);
    res.status(500).json({ success: false, message: error?.message || "Error interno al inicializar Google Sheets." });
  }
});

app.get("/api/bootstrap", async (req, res) => {
  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      return res.json({
        teamMembers: data.teamMembers,
        routeCities: data.routeCities,
        tagsBank: data.tagsBank,
      });
    } catch (e: any) {
      console.warn("Retrying bootstrap to local state due to sheet fetch failure", e);
    }
  }

  res.json({
    teamMembers: TEAM_MEMBERS,
    routeCities: ROUTE_CITIES,
    tagsBank: TAGS_BANK,
  });
});

// Team Members
app.post("/api/team-members", async (req, res) => {
  const { id, name, role, email, allowedViews } = req.body;
  if (!id || !name || !role) {
    return res.status(400).json({ success: false, message: "ID, nombre y rol son obligatorios." });
  }

  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const exists = data.teamMembers.some(m => m.id === id);
      if (exists) {
        return res.status(400).json({ success: false, message: "Un usuario con este ID identificador ya existe." });
      }
      const newMember: TeamMember = {
        id,
        name,
        role,
        email: email || `${id}@levelupdesarrollo.com`,
        allowedViews: allowedViews || ["tasks"]
      };
      const updatedList = [...data.teamMembers, newMember];
      await writeSheetTab(
        ctx.token, 
        ctx.sheetId, 
        "Miembros de Equipo", 
        ["ID", "Nombre", "Rol", "Email", "Vistas Permitidas (separadas por comas)"],
        updatedList.map(m => [m.id, m.name, m.role, m.email, m.allowedViews?.join(",") || "tasks"])
      );
      return res.status(201).json({ success: true, member: newMember });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  const exists = TEAM_MEMBERS.some(m => m.id === id);
  if (exists) {
    return res.status(400).json({ success: false, message: "Un usuario con este ID identificador ya existe." });
  }
  const newMember: TeamMember = { 
    id, 
    name, 
    role, 
    email: email || `${id}@levelupdesarrollo.com`,
    allowedViews: allowedViews || ["tasks"]
  };
  TEAM_MEMBERS.push(newMember);
  res.status(201).json({ success: true, member: newMember });
});

app.delete("/api/team-members/:id", async (req, res) => {
  const { id } = req.params;
  const ctx = getSheetsCtx(req);
  
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const updatedList = data.teamMembers.filter(m => m.id !== id);
      await writeSheetTab(
        ctx.token, 
        ctx.sheetId, 
        "Miembros de Equipo", 
        ["ID", "Nombre", "Rol", "Email", "Vistas Permitidas (separadas por comas)"],
        updatedList.map(m => [m.id, m.name, m.role, m.email, m.allowedViews?.join(",") || "tasks"])
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  TEAM_MEMBERS = TEAM_MEMBERS.filter(m => m.id !== id);
  res.json({ success: true });
});

// Route cities
app.post("/api/route-cities", async (req, res) => {
  const { id, name, region } = req.body;
  if (!id || !name || !region) {
    return res.status(400).json({ success: false, message: "ID, nombre y región son obligatorios." });
  }

  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const exists = data.routeCities.some(c => c.id === id);
      if (exists) {
        return res.status(400).json({ success: false, message: "Ya existe una ciudad con ese ID." });
      }
      const newCity = { id, name, region };
      const updatedList = [...data.routeCities, newCity];
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Ciudades Logísticas",
        ["ID", "Nombre", "Región"],
        updatedList.map(c => [c.id, c.name, c.region])
      );
      return res.status(201).json({ success: true, city: newCity });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  const exists = ROUTE_CITIES.some(c => c.id === id);
  if (exists) {
    return res.status(400).json({ success: false, message: "Ya existe una ciudad con ese ID." });
  }
  const newCity = { id, name, region };
  ROUTE_CITIES.push(newCity);
  res.status(201).json({ success: true, city: newCity });
});

app.delete("/api/route-cities/:id", async (req, res) => {
  const { id } = req.params;
  const ctx = getSheetsCtx(req);

  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const updatedList = data.routeCities.filter(c => c.id !== id);
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Ciudades Logísticas",
        ["ID", "Nombre", "Región"],
        updatedList.map(c => [c.id, c.name, c.region])
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  ROUTE_CITIES = ROUTE_CITIES.filter(c => c.id !== id);
  res.json({ success: true });
});

// Tags
app.get("/api/tags", async (req, res) => {
  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      return res.json(data.tagsBank);
    } catch (e) {}
  }
  res.json(TAGS_BANK);
});

app.post("/api/tags", async (req, res) => {
  const { tag, color } = req.body;
  if (!tag || typeof tag !== "string") {
    return res.status(400).json({ success: false, message: "Etiqueta inválida." });
  }
  const normalized = tag.trim().toUpperCase();
  if (!normalized) {
    return res.status(400).json({ success: false, message: "La etiqueta no puede estar vacía." });
  }

  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const exists = data.tagsBank.some(t => t.name === normalized);
      if (exists) {
        return res.status(400).json({ success: false, message: "Esta etiqueta ya existe." });
      }
      const selectedColor = color || "#3b82f6";
      const newTag: TagType = { name: normalized, color: selectedColor };
      const updatedList = [...data.tagsBank, newTag];
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Etiquetas",
        ["Nombre", "Color"],
        updatedList.map(t => [t.name, t.color])
      );
      return res.status(201).json({ success: true, tag: newTag });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  const exists = TAGS_BANK.some(t => t.name === normalized);
  if (exists) {
    return res.status(400).json({ success: false, message: "Esta etiqueta ya existe." });
  }
  const selectedColor = color || "#3b82f6";
  const newTag: TagType = { name: normalized, color: selectedColor };
  TAGS_BANK.push(newTag);
  res.status(201).json({ success: true, tag: newTag });
});

app.delete("/api/tags/:tag", async (req, res) => {
  const { tag } = req.params;
  const normalized = tag.toUpperCase();
  const ctx = getSheetsCtx(req);

  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const exists = data.tagsBank.some(t => t.name === normalized);
      if (!exists) {
        return res.status(404).json({ success: false, message: "Etiqueta no encontrada." });
      }
      const updatedList = data.tagsBank.filter(t => t.name !== normalized);
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Etiquetas",
        ["Nombre", "Color"],
        updatedList.map(t => [t.name, t.color])
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  const exists = TAGS_BANK.some(t => t.name === normalized);
  if (!exists) {
    return res.status(404).json({ success: false, message: "Etiqueta no encontrada." });
  }
  TAGS_BANK = TAGS_BANK.filter(t => t.name !== normalized);
  res.json({ success: true });
});

// Tasks
app.get("/api/tasks", async (req, res) => {
  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      return res.json(data.tasks);
    } catch (e) {}
  }
  res.json(tasks);
});

app.post("/api/tasks", async (req, res) => {
  try {
    const parsedData = TaskSchema.parse(req.body);
    const ctx = getSheetsCtx(req);

    if (ctx) {
      const sheetData = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const conflict = checkVacationConflictDynamic(
        parsedData.assignedPair, 
        parsedData.dueDate, 
        sheetData.vacations, 
        sheetData.teamMembers
      );
      if (conflict.hasConflict) {
        return res.status(400).json({
          success: false,
          error: "CONFLICTO_LOGISTICO_VACACIONES",
          message: conflict.message,
        });
      }

      const updatedList = [...sheetData.tasks, parsedData];
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Tareas",
        ["ID", "Título", "ID Ciudad", "Binomio Asignado", "Prioridad", "Estado", "Fecha Límite", "Etiquetas (separadas por comas)", "Checklist Subtareas (JSON)"],
        updatedList.map(t => [
          t.id,
          t.title,
          t.routeId,
          t.assignedPair ? (Array.isArray(t.assignedPair) ? t.assignedPair.join(",") : t.assignedPair) : "",
          t.priority,
          t.status,
          t.dueDate,
          t.tags.join(","),
          JSON.stringify(t.subtasks || [])
        ])
      );
      return res.status(201).json({ success: true, task: parsedData });
    }

    const conflict = checkVacationConflictDynamic(parsedData.assignedPair, parsedData.dueDate, vacations, TEAM_MEMBERS);
    if (conflict.hasConflict) {
      return res.status(400).json({
        success: false,
        error: "CONFLICTO_LOGISTICO_VACACIONES",
        message: conflict.message,
      });
    }

    tasks.push(parsedData);
    res.status(201).json({ success: true, task: parsedData });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: error?.message || error });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const ctx = getSheetsCtx(req);

  try {
    const parsedData = TaskSchema.parse(req.body);

    if (ctx) {
      const sheetData = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const idx = sheetData.tasks.findIndex(t => t.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Tarea no encontrada." });
      }

      const conflict = checkVacationConflictDynamic(
        parsedData.assignedPair, 
        parsedData.dueDate, 
        sheetData.vacations, 
        sheetData.teamMembers
      );
      if (conflict.hasConflict) {
        return res.status(400).json({
          success: false,
          error: "CONFLICTO_LOGISTICO_VACACIONES",
          message: conflict.message,
        });
      }

      sheetData.tasks[idx] = parsedData;
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Tareas",
        ["ID", "Título", "ID Ciudad", "Binomio Asignado", "Prioridad", "Estado", "Fecha Límite", "Etiquetas (separadas por comas)", "Checklist Subtareas (JSON)"],
        sheetData.tasks.map(t => [
          t.id,
          t.title,
          t.routeId,
          t.assignedPair ? (Array.isArray(t.assignedPair) ? t.assignedPair.join(",") : t.assignedPair) : "",
          t.priority,
          t.status,
          t.dueDate,
          t.tags.join(","),
          JSON.stringify(t.subtasks || [])
        ])
      );
      return res.json({ success: true, task: parsedData });
    }

    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Tarea no encontrada." });
    }

    const conflict = checkVacationConflictDynamic(parsedData.assignedPair, parsedData.dueDate, vacations, TEAM_MEMBERS);
    if (conflict.hasConflict) {
      return res.status(400).json({
        success: false,
        error: "CONFLICTO_LOGISTICO_VACACIONES",
        message: conflict.message,
      });
    }

    tasks[idx] = parsedData;
    res.json({ success: true, task: parsedData });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: error?.message || error });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const ctx = getSheetsCtx(req);

  if (ctx) {
    try {
      const sheetData = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const updatedList = sheetData.tasks.filter(t => t.id !== id);
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Tareas",
        ["ID", "Título", "ID Ciudad", "Binomio Asignado", "Prioridad", "Estado", "Fecha Límite", "Etiquetas (separadas por comas)", "Checklist Subtareas (JSON)"],
        updatedList.map(t => [
          t.id,
          t.title,
          t.routeId,
          t.assignedPair ? (Array.isArray(t.assignedPair) ? t.assignedPair.join(",") : t.assignedPair) : "",
          t.priority,
          t.status,
          t.dueDate,
          t.tags.join(","),
          JSON.stringify(t.subtasks || [])
        ])
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  tasks = tasks.filter(t => t.id !== id);
  res.json({ success: true });
});

// Vacations
app.get("/api/vacations", async (req, res) => {
  const ctx = getSheetsCtx(req);
  if (ctx) {
    try {
      const data = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      return res.json(data.vacations);
    } catch (e) {}
  }
  res.json(vacations);
});

app.post("/api/vacations", async (req, res) => {
  try {
    const parsedData = VacationSchema.parse(req.body);
    const ctx = getSheetsCtx(req);

    if (ctx) {
      const sheetData = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const updatedList = [...sheetData.vacations, parsedData];
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Vacaciones",
        ["ID", "ID Usuario", "Rol", "Fecha Inicio", "Fecha Fin", "Estado", "Tipo", "Comentario"],
        updatedList.map(v => [
          v.id,
          v.userId,
          v.role,
          v.startDate,
          v.endDate,
          v.status,
          v.type,
          v.comment || ""
        ])
      );
      return res.status(201).json({ success: true, vacation: parsedData });
    }

    vacations.push(parsedData);
    res.status(201).json({ success: true, vacation: parsedData });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: error?.message || error });
  }
});

app.put("/api/vacations/:id", async (req, res) => {
  const { id } = req.params;
  const ctx = getSheetsCtx(req);

  try {
    const parsedData = VacationSchema.parse(req.body);

    if (ctx) {
      const sheetData = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const idx = sheetData.vacations.findIndex(v => v.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Petición no encontrada." });
      }

      sheetData.vacations[idx] = parsedData;
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Vacaciones",
        ["ID", "ID Usuario", "Rol", "Fecha Inicio", "Fecha Fin", "Estado", "Tipo", "Comentario"],
        sheetData.vacations.map(v => [
          v.id,
          v.userId,
          v.role,
          v.startDate,
          v.endDate,
          v.status,
          v.type,
          v.comment || ""
        ])
      );
      return res.json({ success: true, vacation: parsedData });
    }

    const idx = vacations.findIndex(v => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Petición no encontrada." });
    }

    vacations[idx] = parsedData;
    res.json({ success: true, vacation: parsedData });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: error?.message || error });
  }
});

app.delete("/api/vacations/:id", async (req, res) => {
  const { id } = req.params;
  const ctx = getSheetsCtx(req);

  if (ctx) {
    try {
      const sheetData = await fetchAllFromSheet(ctx.token, ctx.sheetId);
      const updatedList = sheetData.vacations.filter(v => v.id !== id);
      await writeSheetTab(
        ctx.token,
        ctx.sheetId,
        "Vacaciones",
        ["ID", "ID Usuario", "Rol", "Fecha Inicio", "Fecha Fin", "Estado", "Tipo", "Comentario"],
        updatedList.map(v => [
          v.id,
          v.userId,
          v.role,
          v.startDate,
          v.endDate,
          v.status,
          v.type,
          v.comment || ""
        ])
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `Error de Google Sheets: ${e.message}` });
    }
  }

  vacations = vacations.filter(v => v.id !== id);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bunker de Datos de LevelUp escuchando en el puerto ${PORT}`);
  });
}

startServer();
