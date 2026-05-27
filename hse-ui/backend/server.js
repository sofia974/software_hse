import express from "express";
import cors from "cors";
import { sql, pool, poolConnect } from "./db.js";
import multer from "multer";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
const app = express();
dotenv.config();
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
const SECRET = process.env.JWT_SECRET;
// ─── LOGIN ────────────────────────────────────────────────────────────────────
const MAX_INTENTOS = 5;
const LOCK_MINUTOS = 30;

// ---------------- MIDDLEWARE ----------------
const verifyToken = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No autorizado" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    // CAMBIO: req.user ahora recibirá también el 'nivel' (SUPER_ADMIN / USER)
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Token inválido" });
  }
};

const isAdmin = (req, res, next) => {
  const esAdmin = req.user.rol?.toLowerCase() === "administrador";
  const esSuper = req.user.nivel === "SUPER_ADMIN";

  if (!esAdmin && !esSuper) {
    return res.status(403).json({ error: "Solo administradores" });
  }
  next();
};
/* ───────────────── LOGIN ───────────────── */
// --- RUTA: LOGIN CON LIMPIEZA DE SESIÓN ---
app.post("/api/login", async (req, res) => {
  const { usuario, password } = req.body;

  try {
    await poolConnect;

    // 1. Buscar usuario
    const result = await pool.request().input("usuario", sql.VarChar, usuario)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.email,
          u.password_hash, 
          u.is_active,
          u.idNivelAcceso,
          p.idPersona,
          p.idRol, 
          p.idEmpresa,    
          r.nombre AS rol
        FROM usuarios_login u
        LEFT JOIN Personas p ON u.idPersona = p.idPersona 
        LEFT JOIN Roles r ON p.idRol = r.idRol
        WHERE u.username = @usuario OR u.email = @usuario
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Usuario o correo no encontrado" });
    }

    const user = result.recordset[0];

    // 2. Usuario activo
    if (!user.is_active) {
      return res.status(401).json({ error: "Tu cuenta está desactivada." });
    }

    // 3. Password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 4. Cerrar sesiones activas anteriores
    await pool.request().input("idUsuario", sql.Int, user.id).query(`
        UPDATE SesionesUsuario 
        SET activo = 0 
        WHERE idUsuario = @idUsuario AND activo = 1
      `);

    // 5. DEFINIR NIVEL (IMPORTANTE)
    const isSuperAdmin = user.idNivelAcceso === 1;

    // 6. OBTENER MÓDULOS
    let modulos = [];

    if (isSuperAdmin) {
      const allModulos = await pool.request().query(`
          SELECT idModulo, nombre, ruta, icono 
          FROM Modulos
        `);

      modulos = allModulos.recordset;
    } else {
      const userModulos = await pool
        .request()
        .input("idRol", sql.Int, user.idRol).query(`
          SELECT m.idModulo, m.nombre, m.ruta, m.icono
          FROM Modulos m
          INNER JOIN RolesModulos rm ON m.idModulo = rm.idModulo
          WHERE rm.idRol = @idRol
        `);

      modulos = userModulos.recordset;
    }

    // 7. JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        idRol: user.idRol,
        idEmpresa: user.idEmpresa,
        idNivelAcceso: user.idNivelAcceso,
        rol: user.rol,
      },
      SECRET,
      { expiresIn: "8h" },
    );

    // 8. Registrar sesión
    await pool
      .request()
      .input("idUsuario", sql.Int, user.id)
      .input("token", sql.NVarChar, token)
      .input("dispositivo", sql.NVarChar, req.headers["user-agent"])
      .input("ip", sql.NVarChar, req.ip).query(`
        INSERT INTO SesionesUsuario (idUsuario, token, dispositivo, ip, activo)
        VALUES (@idUsuario, @token, @dispositivo, @ip, 1)
      `);

    // 9. RESPUESTA
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        idEmpresa: user.idEmpresa,
        idRol: user.idRol,
        rol: user.rol,
        idNivelAcceso: user.idNivelAcceso,
        permisos: modulos,
      },
    });
  } catch (err) {
    console.error("ERROR EN LOGIN:", err.message);
    res.status(500).json({
      error: "Error en el servidor",
      details: err.message,
    });
  }
});
// --- RUTA: LOGOUT (MANUAL O POR INACTIVIDAD) ---
app.post("/api/logout", verifyToken, async (req, res) => {
  try {
    await pool.request().input("idUsuario", sql.Int, req.user.id).query(`
        UPDATE SesionesUsuario 
        SET activo = 0 
        WHERE idUsuario = @idUsuario AND activo = 1
      `);
    res.json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al cerrar sesión" }, err);
  }
});

app.post(
  "/api/roles-modulos/toggle",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { idRol, idModulo } = req.body;
    try {
      const check = await pool
        .request()
        .input("r", sql.Int, idRol)
        .input("m", sql.Int, idModulo)
        .query("SELECT * FROM RolesModulos WHERE idRol = @r AND idModulo = @m");

      if (check.recordset.length > 0) {
        await pool
          .request()
          .input("r", sql.Int, idRol)
          .input("m", sql.Int, idModulo)
          .query("DELETE FROM RolesModulos WHERE idRol = @r AND idModulo = @m");
        return res.json({ action: "removed" });
      } else {
        await pool
          .request()
          .input("r", sql.Int, idRol)
          .input("m", sql.Int, idModulo)
          .query("INSERT INTO RolesModulos (idRol, idModulo) VALUES (@r, @m)");
        return res.json({ action: "added" });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
/* ───────────────── USUARIOS Y ROLES ───────────────── */
app.get("/api/usuarios", verifyToken, async (req, res) => {
  try {
    const { nivel, idEmpresa: idEmpresaToken } = req.user;
    await poolConnect;
    const request = pool.request();

    // Ajustamos los nombres de las columnas según tu base de datos
    let query = `
      SELECT 
        u.id, 
        u.username, 
        p.idRol, 
        r.nombre AS rol, 
        p.activo, 
        e.razonSocial AS nombreEmpresa, 
        e.idEmpresa
      FROM usuarios_login u
      INNER JOIN Personas p ON u.idPersona = p.idPersona
      INNER JOIN Roles r ON p.idRol = r.idRol
      INNER JOIN Empresas e ON p.idEmpresa = e.idEmpresa
    `;

    if (nivel !== "SUPER_ADMIN") {
      query += " WHERE p.idEmpresa = @idEmpresa";
      request.input("idEmpresa", sql.Int, idEmpresaToken);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Detalle del error:", err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

app.get("/api/usuarios-detalle", verifyToken, async (req, res) => {
  try {
    const { idNivelAcceso, idEmpresa: idEmpresaToken } = req.user;

    await poolConnect;

    const request = pool.request();

    // 🔥 SUPER ADMIN: ve todo
    if (idNivelAcceso === 1) {
      const result = await request.query(`
        SELECT 
          ul.id,
          ul.username, 
          ul.email, 
          p.activo as is_active,
          ul.idNivelAcceso,
          r.nombre as rol,
          e.razonSocial as empresa,
          e.idEmpresa,
          STRING_AGG(m.nombre, ', ') WITHIN GROUP (ORDER BY m.nombre) as modulos_nombres
        FROM usuarios_login ul
        INNER JOIN Personas p ON ul.idPersona = p.idPersona
        INNER JOIN Roles r ON p.idRol = r.idRol
        INNER JOIN Empresas e ON p.idEmpresa = e.idEmpresa
        LEFT JOIN RolesModulos rm ON r.idRol = rm.idRol
        LEFT JOIN Modulos m ON rm.idModulo = m.idModulo
        GROUP BY 
          ul.id,
          ul.username,
          ul.email,
          p.activo,
          ul.idNivelAcceso,
          r.nombre,
          e.razonSocial,
          e.idEmpresa
      `);

      return res.json(result.recordset);
    }

    // 🔥 ADMIN EMPRESA: obtiene empresa + subempresas
    const empresasResult = await request.input(
      "idEmpresa",
      sql.Int,
      idEmpresaToken,
    ).query(`
        SELECT idEmpresa
        FROM Empresas
        WHERE idEmpresa = @idEmpresa
           OR idEmpresaPadre = @idEmpresa
      `);

    const ids = empresasResult.recordset.map((e) => e.idEmpresa);

    if (ids.length === 0) {
      return res.json([]);
    }

    // 🔥 crear parámetros dinámicos IN (@id0,@id1,...)
    const inParams = ids.map((_, i) => `@id${i}`).join(",");

    ids.forEach((id, i) => {
      request.input(`id${i}`, sql.Int, id);
    });

    const query = `
      SELECT 
        ul.id,
        ul.username, 
        ul.email, 
        p.activo as is_active,
        ul.idNivelAcceso,
        r.nombre as rol,
        e.razonSocial as empresa,
        e.idEmpresa,
        STRING_AGG(m.nombre, ', ') WITHIN GROUP (ORDER BY m.nombre) as modulos_nombres
      FROM usuarios_login ul
      INNER JOIN Personas p ON ul.idPersona = p.idPersona
      INNER JOIN Roles r ON p.idRol = r.idRol
      INNER JOIN Empresas e ON p.idEmpresa = e.idEmpresa
      LEFT JOIN RolesModulos rm ON r.idRol = rm.idRol
      LEFT JOIN Modulos m ON rm.idModulo = m.idModulo
      WHERE p.idEmpresa IN (${inParams})
      GROUP BY 
        ul.id,
        ul.username,
        ul.email,
        p.activo,
        ul.idNivelAcceso,
        r.nombre,
        e.razonSocial,
        e.idEmpresa
    `;

    const result = await request.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error en /api/usuarios-detalle:", err);
    res.status(500).json({ error: "Error obteniendo detalle de usuarios" });
  }
});
// POST crear usuario (SOLO ADMIN)
app.post("/api/usuarios", verifyToken, isAdmin, async (req, res) => {
  const { username, password_hash, idRol, activo } = req.body;

  try {
    const hash = await bcrypt.hash(password_hash, 10);

    await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("password_hash", sql.VarChar, hash)
      .input("idRol", sql.Int, idRol)
      .input("activo", sql.Bit, activo).query(`
        INSERT INTO usuarios_login (username, password_hash, idRol, activo)
        VALUES (@username, @password_hash, @idRol, @activo)
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT cambiar rol usuario
app.put("/api/usuarios/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { idRol } = req.body;

  try {
    await pool.request().input("id", sql.Int, id).input("idRol", sql.Int, idRol)
      .query(`
        UPDATE usuarios_login SET idRol = @idRol WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ROLES ----------------

// GET roles
app.get("/api/roles", verifyToken, async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("SELECT idRol, nombre FROM Roles");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo roles", err });
  }
});
// POST Crear Rol con sus módulos (Transaccional)
app.post("/api/roles", verifyToken, async (req, res) => {
  const { nombre, modulos } = req.body; // modulos es un array de IDs: [1, 2, 3]
  const transaction = new sql.Transaction(pool);

  try {
    if (!nombre || !modulos || modulos.length === 0) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    await transaction.begin();

    // 1. Insertar el nuevo Rol y obtener su ID
    const rolResult = await transaction
      .request()
      .input("nombre", sql.VarChar(100), nombre)
      .query(
        "INSERT INTO Roles (nombre) OUTPUT INSERTED.idRol VALUES (@nombre)",
      );

    const idRol = rolResult.recordset[0].idRol;

    // 2. Insertar cada módulo en RolesModulos
    for (const idModulo of modulos) {
      await transaction
        .request()
        .input("idRol", sql.Int, idRol)
        .input("idModulo", sql.Int, idModulo)
        .query(
          "INSERT INTO RolesModulos (idRol, idModulo) VALUES (@idRol, @idModulo)",
        );
    }

    await transaction.commit();
    res.json({ ok: true, idRol, message: "Rol y permisos creados" });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al crear el rol y sus módulos" });
  }
});
// ---------------- MODULOS ----------------

// GET modulos
app.get("/api/modulos", verifyToken, async (req, res) => {
  try {
    const result = await pool.request().query("SELECT * FROM Modulos");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PERMISOS ----------------

// GET modulos por rol
app.get("/api/roles/:idRol/modulos", verifyToken, async (req, res) => {
  const { idRol } = req.params;

  try {
    const result = await pool.request().input("idRol", sql.Int, idRol).query(`
        SELECT idModulo FROM RolesModulos WHERE idRol = @idRol
      `);

    const ids = result.recordset.map((r) => r.idModulo);
    res.json(ids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST asignar modulo
app.post("/api/roles-modulos", verifyToken, isAdmin, async (req, res) => {
  const { idRol, idModulo } = req.body;

  try {
    await pool
      .request()
      .input("idRol", sql.Int, idRol)
      .input("idModulo", sql.Int, idModulo).query(`
        INSERT INTO RolesModulos (idRol, idModulo)
        VALUES (@idRol, @idModulo)
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE quitar modulo
app.delete("/api/roles-modulos", verifyToken, isAdmin, async (req, res) => {
  const { idRol, idModulo } = req.body;

  try {
    await pool
      .request()
      .input("idRol", sql.Int, idRol)
      .input("idModulo", sql.Int, idModulo).query(`
        DELETE FROM RolesModulos
        WHERE idRol = @idRol AND idModulo = @idModulo
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST crear Persona + Usuario (Registro Integral)
app.post("/api/usuarios-completo", verifyToken, isAdmin, async (req, res) => {
  const {
    nombre,
    idArea,
    idRol,
    username,
    email,
    password,
    activo,
    idEmpresa: idForm,
  } = req.body;

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const isSuperAdmin = Number(req.user.idNivelAcceso) === 1;

    // 🔥 1. Obtener empresas permitidas
    const empresasPermitidas = await pool
      .request()
      .input("idEmpresa", sql.Int, req.user.idEmpresa).query(`
        SELECT idEmpresa
        FROM Empresas
        WHERE idEmpresa = @idEmpresa
           OR idEmpresaPadre = @idEmpresa
      `);

    const idsPermitidos = empresasPermitidas.recordset.map((e) => e.idEmpresa);

    // 🔥 2. Definir empresa final
    const idEmpresaFinal = Number(idForm || req.user.idEmpresa);

    // 🔥 3. VALIDACIÓN CRÍTICA
    if (!isSuperAdmin && !idsPermitidos.includes(idEmpresaFinal)) {
      throw new Error("No tienes permisos para esta empresa");
    }

    // 🔥 4. LICENCIA
    const licencia = await transaction
      .request()
      .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
        SELECT * FROM Licencias
        WHERE idEmpresa = @idEmpresa
        AND activo = 1
        AND GETDATE() BETWEEN fechaInicio AND fechaFin
      `);

    if (licencia.recordset.length === 0) {
      throw new Error("Empresa sin licencia activa");
    }

    // 🔥 5. USUARIOS EXISTENTES
    const countUsuarios = await transaction
      .request()
      .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
        SELECT COUNT(*) as total
        FROM Personas
        WHERE idEmpresa = @idEmpresa
      `);

    if (
      countUsuarios.recordset[0].total >= licencia.recordset[0].cantidadUsuarios
    ) {
      throw new Error("Límite de usuarios alcanzado");
    }

    const hash = await bcrypt.hash(password, 10);

    // 🔥 6. CREAR PERSONA
    const personaRes = await transaction
      .request()
      .input("nombre", sql.VarChar, nombre)
      .input(
        "idArea",
        sql.Int,
        idArea && idArea !== "" ? parseInt(idArea) : null,
      )
      .input("idRol", sql.Int, idRol)
      .input("idEmpresa", sql.Int, idEmpresaFinal)
      .input("activo", sql.Bit, activo ? 1 : 0).query(`
        INSERT INTO Personas (nombre, idArea, idRol, idEmpresa, activo)
        VALUES (@nombre, @idArea, @idRol, @idEmpresa, @activo);
        SELECT SCOPE_IDENTITY() AS idPersona;
      `);

    const idPersona = personaRes.recordset[0].idPersona;

    // 🔥 7. CREAR LOGIN
    await transaction
      .request()
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .input("password_hash", sql.NVarChar, hash)
      .input("is_active", sql.Bit, activo ? 1 : 0)
      .input("idPersona", sql.Int, idPersona)
      .input("idNivelAcceso", sql.Int, 3).query(`
        INSERT INTO usuarios_login 
        (username, email, password_hash, is_active, is_verified, idPersona, idNivelAcceso, created_at)
        VALUES 
        (@username, @email, @password_hash, @is_active, 1, @idPersona, @idNivelAcceso, GETDATE())
      `);

    await transaction.commit();

    res.json({ ok: true, idPersona });
  } catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   ENDPOINTS PÚBLICOS (SIN AUTH)
============================ */

// GET: Listar empresas disponibles (para el formulario público)
app.get("/api/publico/empresas", async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query(
        `SELECT idEmpresa, razonSocial FROM Empresas ORDER BY razonSocial`,
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Registrar incidente público (sin autenticación)
app.post("/api/publico/incidentes", upload.array("fotos"), async (req, res) => {
  try {
    const {
      fecha,
      tipo,
      area,
      severidad,
      descripcion,
      responsable,
      tiempoParadaHoras,
      idEmpresa,
    } = req.body;

    if (!fecha || !area || !descripcion || !responsable) {
      return res.status(400).json({
        error: "Campos obligatorios: fecha, área, descripción y responsable.",
      });
    }

    await poolConnect;

    // Auto-generar código único
    const lastCode = await pool.request().query(`
      SELECT MAX(CAST(SUBSTRING(Codigo, 5, LEN(Codigo)) AS INT)) AS maxNum
      FROM Incidentes
      WHERE Codigo LIKE 'INC-%'
        AND ISNUMERIC(SUBSTRING(Codigo, 5, LEN(Codigo))) = 1
    `);
    const maxNum = lastCode.recordset[0].maxNum || 1000;
    const codigo = `INC-${maxNum + 1}`;

    const result = await pool
      .request()
      .input("Codigo", sql.NVarChar, codigo)
      .input("Fecha", sql.Date, fecha)
      .input("Tipo", sql.NVarChar, tipo || "Incidente")
      .input("Area", sql.NVarChar, area.trim())
      .input("Severidad", sql.NVarChar, severidad || "Baja")
      .input("Estado", sql.NVarChar, "Abierto")
      .input("Descripcion", sql.NVarChar, descripcion.trim())
      .input("Responsable", sql.NVarChar, responsable.trim())
      .input("TiempoParadaHoras", sql.Float, parseFloat(tiempoParadaHoras) || 0)
      .input("idEmpresa", sql.Int, idEmpresa ? parseInt(idEmpresa) : null)
      .query(`
        INSERT INTO Incidentes
          (Codigo, Fecha, Tipo, Area, Severidad, Estado, Descripcion, Responsable, TiempoParadaHoras, idEmpresa)
        OUTPUT INSERTED.Id
        VALUES
          (@Codigo, @Fecha, @Tipo, @Area, @Severidad, @Estado, @Descripcion, @Responsable, @TiempoParadaHoras, @idEmpresa)
      `);

    const incidenteId = result.recordset[0].Id;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = `/uploads/${file.filename}`;
        await pool
          .request()
          .input("IncidenteId", sql.Int, incidenteId)
          .input("Nombre", sql.NVarChar, file.originalname)
          .input("Url", sql.NVarChar, url).query(`
            INSERT INTO IncidenteFotos (IncidenteId, Nombre, Url)
            VALUES (@IncidenteId, @Nombre, @Url)
          `);
      }
    }

    res.json({ success: true, codigo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   INCIDENTES (MULTI-EMPRESA)
============================ */

// GET: Listar incidentes filtrados por empresa
// app.get("/api/incidentes", verifyToken, async (req, res) => {
//   try {
//     await poolConnect;

//     // 1. Traemos incidentes con el nombre de la empresa
//     const incidentes = await pool.request().query(`
//       SELECT i.*, e.razonSocial AS nombreEmpresa
//       FROM Incidentes i
//       LEFT JOIN Empresas e ON i.idEmpresa = e.idEmpresa
//       ORDER BY i.Codigo DESC
//     `);

//     // 2. Traemos todas las fotos (o podrías filtrarlas si fuera necesario)
//     const fotos = await pool.request().query(`SELECT * FROM IncidenteFotos`);

//     const resultado = incidentes.recordset.map((inc) => ({
//       ...inc,
//       fotos: fotos.recordset.filter((f) => f.IncidenteId === inc.Id),
//     }));

//     res.json(resultado);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
app.get("/api/incidentes", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idNivelAcceso, idEmpresa: idEmpresaToken } = req.user;

    const request = pool.request();

    let whereClause = "";

    // 🔥 SUPER ADMIN → VE TODO
    if (idNivelAcceso === 1) {
      whereClause = "";
    }

    // 🔥 ADMIN EMPRESA → EMPRESA + SUBEMPRESAS
    else if (idNivelAcceso === 2) {
      const empresasResult = await request.input(
        "idEmpresa",
        sql.Int,
        idEmpresaToken,
      ).query(`
          SELECT idEmpresa
          FROM Empresas
          WHERE idEmpresa = @idEmpresa
             OR idEmpresaPadre = @idEmpresa
        `);

      const ids = empresasResult.recordset.map((e) => e.idEmpresa);

      if (ids.length === 0) {
        return res.json([]);
      }

      const inParams = ids.map((_, i) => `@id${i}`).join(",");

      ids.forEach((id, i) => {
        request.input(`id${i}`, sql.Int, id);
      });

      whereClause = `WHERE i.idEmpresa IN (${inParams})`;
    }

    // 🔥 USUARIO NORMAL → SOLO SU EMPRESA
    else {
      request.input("idEmpresaUser", sql.Int, idEmpresaToken);

      whereClause = `WHERE i.idEmpresa = @idEmpresaUser`;
    }

    // 🔥 INCIDENTES
    const incidentes = await request.query(`
      SELECT 
        i.*, 
        e.razonSocial AS nombreEmpresa
      FROM Incidentes i
      LEFT JOIN Empresas e 
        ON i.idEmpresa = e.idEmpresa
      ${whereClause}
      ORDER BY i.Codigo DESC
    `);

    // 🔥 FOTOS
    const fotos = await pool.request().query(`
      SELECT * FROM IncidenteFotos
    `);

    const resultado = incidentes.recordset.map((inc) => ({
      ...inc,
      fotos: fotos.recordset.filter((f) => f.IncidenteId === inc.Id),
    }));

    res.json(resultado);
  } catch (err) {
    console.error("Error obteniendo incidentes:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// POST: Registrar incidente asignando automáticamente la empresa
app.post(
  "/api/incidentes",
  verifyToken,
  upload.array("fotos"),
  async (req, res) => {
    try {
      const {
        codigo,
        fecha,
        tipo,
        area,
        severidad,
        estado,
        descripcion,
        responsable,
        tiempoParadaHoras,
      } = req.body;

      const { idEmpresa } = req.user;

      await poolConnect;

      // Insertar incidente con idEmpresa
      const result = await pool
        .request()
        .input("Codigo", sql.NVarChar, codigo)
        .input("Fecha", sql.Date, fecha)
        .input("Tipo", sql.NVarChar, tipo)
        .input("Area", sql.NVarChar, area)
        .input("Severidad", sql.NVarChar, severidad)
        .input("Estado", sql.NVarChar, estado)
        .input("Descripcion", sql.NVarChar, descripcion)
        .input("Responsable", sql.NVarChar, responsable)
        .input("TiempoParadaHoras", sql.Int, tiempoParadaHoras)
        .input("idEmpresa", sql.Int, idEmpresa) // <--- Pasamos el parámetro
        .query(`
        INSERT INTO Incidentes
        (Codigo, Fecha, Tipo, Area, Severidad, Estado, Descripcion, Responsable, TiempoParadaHoras, idEmpresa)
        OUTPUT INSERTED.Id
        VALUES
        (@Codigo, @Fecha, @Tipo, @Area, @Severidad, @Estado, @Descripcion, @Responsable, @TiempoParadaHoras, @idEmpresa)
      `);

      const incidenteId = result.recordset[0].Id;

      // Guardar fotos (se mantiene igual, ya están ligadas al incidenteId)
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const url = `/uploads/${file.filename}`;

          await pool
            .request()
            .input("IncidenteId", sql.Int, incidenteId)
            .input("Nombre", sql.NVarChar, file.originalname)
            .input("Url", sql.NVarChar, url).query(`
            INSERT INTO IncidenteFotos (IncidenteId, Nombre, Url)
            VALUES (@IncidenteId, @Nombre, @Url)
          `);
        }
      }
      // Recuperar el incidente recién creado con el nombre de la empresa
      const incidentQuery = await pool
        .request()
        .input("Id", sql.Int, incidenteId).query(`
        SELECT i.*, e.razonSocial AS nombreEmpresa 
        FROM Incidentes i
        LEFT JOIN Empresas e ON i.idEmpresa = e.idEmpresa
        WHERE i.Id = @Id
    `);

      const finalIncident = incidentQuery.recordset[0];

      // Opcional: Recuperar sus fotos si necesitas verlas de inmediato
      const photosQuery = await pool
        .request()
        .input("Id", sql.Int, incidenteId)
        .query(`SELECT * FROM IncidenteFotos WHERE IncidenteId = @Id`);

      finalIncident.fotos = photosQuery.recordset;

      res.json(finalIncident);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

/* ============================
   OBTENER TODOS LOS RIESGOS
============================ */
app.get("/api/riesgos", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idNivelAcceso, idEmpresa: idEmpresaToken } = req.user;

    const request = pool.request();

    let whereClause = "";

    // 🔥 SUPER ADMIN
    if (idNivelAcceso === 1) {
      whereClause = "";
    }

    // 🔥 ADMIN EMPRESA
    else if (idNivelAcceso === 2) {
      const empresasResult = await request.input(
        "idEmpresa",
        sql.Int,
        idEmpresaToken,
      ).query(`
          SELECT idEmpresa
          FROM Empresas
          WHERE idEmpresa = @idEmpresa
             OR idEmpresaPadre = @idEmpresa
        `);

      const ids = empresasResult.recordset.map((e) => e.idEmpresa);

      if (ids.length === 0) {
        return res.json([]);
      }

      const inParams = ids.map((_, i) => `@id${i}`).join(",");

      ids.forEach((id, i) => {
        request.input(`id${i}`, sql.Int, id);
      });

      whereClause = `WHERE r.idEmpresa IN (${inParams})`;
    }

    // 🔥 USUARIO NORMAL
    else {
      request.input("idEmpresaUser", sql.Int, idEmpresaToken);

      whereClause = `WHERE r.idEmpresa = @idEmpresaUser`;
    }

    // 🔥 RIESGOS
    const riesgos = await request.query(`
      SELECT 
        r.*, 
        e.razonSocial AS nombreEmpresa
      FROM riesgos r
      LEFT JOIN Empresas e 
        ON r.idEmpresa = e.idEmpresa
      ${whereClause}
      ORDER BY r.id DESC
    `);

    // 🔥 DATOS RELACIONADOS
    const controles = await pool.request().query(`
      SELECT * FROM controles
    `);

    const acciones = await pool.request().query(`
      SELECT * FROM acciones
    `);

    const historial = await pool.request().query(`
      SELECT * FROM historial_riesgo
    `);

    const adjuntos = await pool.request().query(`
      SELECT * FROM adjuntos
    `);

    const result = riesgos.recordset.map((r) => {
      const controlesRiesgo = controles.recordset
        .filter((c) => Number(c.riesgo_id) === Number(r.id))
        .map((c) => ({
          ...c,
          adjuntos: adjuntos.recordset
            .filter((a) => Number(a.control_id) === Number(c.id))
            .map((a) => ({
              control_id: a.control_id,
              titulo: a.titulo,
              archivo: a.nombre_archivo,
            })),
        }));

      const adjuntosRiesgo = controlesRiesgo.flatMap((c) => c.adjuntos || []);

      return {
        ...r,
        controles: controlesRiesgo,

        acciones: acciones.recordset.filter(
          (a) => Number(a.riesgo_id) === Number(r.id),
        ),

        historial: historial.recordset
          .filter((h) => Number(h.riesgo_id) === Number(r.id))
          .map((h) => ({
            at: h.fecha,
            msg: h.mensaje,
          })),

        adjuntos: adjuntosRiesgo,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error obteniendo riesgos:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// Listar Matriz de Riesgos
app.get("/api/configuracion-riesgo", verifyToken, async (req, res) => {
  try {
    const idEmpresa = req.user.idEmpresa;

    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT * FROM ConfiguracionRiesgo
        WHERE idEmpresa = @idEmpresa
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "No hay configuración" });
    }

    const config = result.recordset[0];

    res.json({
      matrixSize: config.matrixSize,
      levels: JSON.parse(config.levels),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Editar Matriz de Riesgos
app.put("/api/configuracion-riesgo", verifyToken, async (req, res) => {
  try {
    const idEmpresa = req.user.idEmpresa;
    const { matrixSize, levels } = req.body;

    await poolConnect;

    await pool
      .request()
      .input("idEmpresa", sql.Int, idEmpresa)
      .input("matrixSize", sql.Int, matrixSize)
      .input("levels", sql.NVarChar(sql.MAX), JSON.stringify(levels)).query(`
        IF EXISTS (SELECT 1 FROM ConfiguracionRiesgo WHERE idEmpresa = @idEmpresa)
          UPDATE ConfiguracionRiesgo
          SET matrixSize = @matrixSize,
              levels = @levels,
              updated_at = GETDATE()
          WHERE idEmpresa = @idEmpresa
        ELSE
          INSERT INTO ConfiguracionRiesgo (idEmpresa, matrixSize, levels)
          VALUES (@idEmpresa, @matrixSize, @levels)
      `);

    res.json({ message: "Configuración guardada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// LISTAR PELIGROS
app.get("/api/riesgoPeligro", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user; // Token
    await poolConnect;
    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT idPeligro, tipoPeligro FROM riesgosPeligro WHERE idEmpresa = @idEmpresa ORDER BY tipoPeligro
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error obteniendo Peligro" });
  }
});
//LISTAR JERARQUIA
app.get("/api/riesgosJerarquia", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user; // Token
    await poolConnect;
    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT idJerarquia, tipoJerarquia FROM riesgosJerarquia WHERE idEmpresa = @idEmpresa ORDER BY tipoJerarquia
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error obteniendo Jerarquia" });
  }
});
/* ============================
   CREAR RIESGO
============================ */
app.post("/api/riesgos", verifyToken, async (req, res) => {
  try {
    const {
      peligro,
      area,
      ubicacion,
      proceso,
      tarea,
      puesto,
      prob_inh,
      sev_inh,
      prob_res,
      sev_res, // Estos vienen del frontend
      responsable,
      fecha_registro,
      fecha_revision,
      estado,
    } = req.body;
    const { idEmpresa } = req.user;
    await poolConnect;
    const insertResult = await pool
      .request()
      .input("peligro", sql.NVarChar(200), peligro)
      .input("area", sql.NVarChar(100), area)
      .input("ubicacion", sql.NVarChar(200), ubicacion)
      .input("proceso", sql.NVarChar(200), proceso)
      .input("tarea", sql.NVarChar(200), tarea)
      .input("puesto", sql.NVarChar(100), puesto)
      .input("prob_inh", sql.Int, parseInt(prob_inh)) // Forzamos entero
      .input("sev_inh", sql.Int, parseInt(sev_inh)) // Forzamos entero
      .input("prob_res", sql.Int, parseInt(prob_res)) // Forzamos entero
      .input("sev_res", sql.Int, parseInt(sev_res)) // Forzamos entero
      .input("responsable", sql.NVarChar(150), responsable)
      .input("fecha_registro", sql.Date, fecha_registro)
      .input("fecha_revision", sql.Date, fecha_revision || null)
      .input("estado", sql.NVarChar(50), estado)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        INSERT INTO riesgos (peligro, area, ubicacion, proceso, tarea, puesto, prob_inh, sev_inh, prob_res, sev_res, responsable, fecha_registro, fecha_revision, estado, idEmpresa)
        OUTPUT INSERTED.id
        VALUES (@peligro, @area, @ubicacion, @proceso, @tarea, @puesto, @prob_inh, @sev_inh, @prob_res, @sev_res, @responsable, @fecha_registro, @fecha_revision, @estado, @idEmpresa)
      `);
    const newId = insertResult.recordset[0].id;
    // CONSULTA FINAL: Ahora riesgo_inherente y riesgo_residual ya existen en r.*
    const result = await pool.request().input("newId", sql.Int, newId).query(`
      SELECT 
        r.*, 
        e.razonSocial as nombreEmpresa
      FROM riesgos r
      LEFT JOIN Empresas e ON r.idEmpresa = e.idEmpresa
      WHERE r.id = @newId
    `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ============================
   CERRAR ACCION (CON VALIDACION)
============================ */
app.put("/api/acciones/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const { idEmpresa } = req.user;

  try {
    // 1. Validar que la acción pertenezca a la empresa del usuario
    const check = await pool
      .request()
      .input("id", sql.Int, id)
      .input("idEmpresa", sql.Int, idEmpresa)
      .query(
        "SELECT a.control_id, a.riesgo_id FROM acciones a INNER JOIN riesgos r ON a.riesgo_id = r.id WHERE a.id = @id AND r.idEmpresa = @idEmpresa",
      );

    if (check.recordset.length === 0)
      return res.status(403).json({ error: "No autorizado" });

    const { control_id: controlId, riesgo_id: riesgoId } = check.recordset[0];

    // 2. Actualizar acción, control e historial
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.VarChar, estado)
      .query("UPDATE acciones SET estado = @estado WHERE id = @id");

    await pool
      .request()
      .input("controlId", sql.Int, controlId)
      .input(
        "estado",
        sql.VarChar,
        estado === "Cerrada" ? "Implementado" : "Pendiente",
      )
      .query("UPDATE controles SET estado = @estado WHERE id = @controlId");

    await pool
      .request()
      .input("riesgo_id", sql.Int, riesgoId)
      .input(
        "mensaje",
        sql.NVarChar(200),
        estado === "Cerrada" ? "Se cerró una acción" : "Se reabrió una acción",
      )
      .query(
        "INSERT INTO historial_riesgo (riesgo_id, mensaje) VALUES (@riesgo_id, @mensaje)",
      );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   AGREGAR CONTROL (PROTEGIDO)
============================ */
app.post(
  "/api/controles",
  verifyToken,
  upload.single("archivo"),
  async (req, res) => {
    try {
      const { riesgo_id, tipo, descripcion, responsable, fecha_compromiso } =
        req.body;
      const { idEmpresa } = req.user;
      const archivo = req.file ? req.file.filename : null;

      // VALIDAR que el riesgo_id pertenezca a la empresa
      const check = await pool
        .request()
        .input("id", sql.Int, riesgo_id)
        .input("e", sql.Int, idEmpresa)
        .query("SELECT id FROM riesgos WHERE id = @id AND idEmpresa = @e");
      if (check.recordset.length === 0)
        return res.status(403).json({ error: "Acceso denegado" });

      await poolConnect;
      const result = await pool
        .request()
        .input("riesgo_id", sql.Int, riesgo_id)
        .input("tipo", sql.NVarChar(100), tipo)
        .input("descripcion", sql.NVarChar(300), descripcion)
        .input("responsable", sql.NVarChar(150), responsable)
        .input("fecha_compromiso", sql.Date, fecha_compromiso)
        .query(
          "INSERT INTO controles (riesgo_id, descripcion, tipo, estado, responsable, fecha_compromiso, jerarquia) OUTPUT INSERTED.* VALUES (@riesgo_id, @descripcion, @tipo, 'Pendiente', @responsable, @fecha_compromiso, @tipo)",
        );
      const control = result.recordset[0];
      // Insertar Acción
      await pool
        .request()
        .input("r", sql.Int, riesgo_id)
        .input("d", sql.NVarChar(300), descripcion)
        .input("res", sql.NVarChar(150), responsable)
        .input("f", sql.Date, fecha_compromiso)
        .input("c", sql.Int, control.id)
        .query(
          "INSERT INTO acciones (riesgo_id, descripcion, responsable, fecha_compromiso, estado, control_id) VALUES (@r, @d, @res, @f, 'Pendiente', @c)",
        );

      // Adjuntos e Historial (se mantiene lógica pero ya protegida por el primer check)
      if (archivo) {
        await pool
          .request()
          .input("r", sql.Int, riesgo_id)
          .input("file", sql.NVarChar(300), archivo)
          .input("c", sql.Int, control.id)
          .input("t", sql.NVarChar(200), descripcion)
          .query(
            "INSERT INTO adjuntos (riesgo_id, nombre_archivo, ruta_archivo, control_id, titulo) VALUES (@r, @file, @file, @c, @t)",
          );
      }

      await pool
        .request()
        .input("r", sql.Int, riesgo_id)
        .input("m", sql.NVarChar(200), "Se agregó un control")
        .query(
          "INSERT INTO historial_riesgo (riesgo_id, mensaje) VALUES (@r, @m)",
        );

      res.json(control);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

/* ============================
   ELIMINAR CONTROL (CON VALIDACION)
============================ */
app.delete("/api/controles/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { idEmpresa } = req.user;

    const ctrl = await pool
      .request()
      .input("id", sql.Int, id)
      .input("e", sql.Int, idEmpresa)
      .query(
        "SELECT c.riesgo_id, c.descripcion FROM controles c JOIN riesgos r ON c.riesgo_id = r.id WHERE c.id = @id AND r.idEmpresa = @e",
      );

    if (!ctrl.recordset.length)
      return res.status(404).json({ error: "No encontrado o sin permiso" });

    const { riesgo_id, descripcion } = ctrl.recordset[0];

    await pool
      .request()
      .input("cid", sql.Int, id)
      .query("DELETE FROM adjuntos WHERE control_id = @cid");
    await pool
      .request()
      .input("cid", sql.Int, id)
      .query("DELETE FROM acciones WHERE control_id = @cid");
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM controles WHERE id = @id");

    await pool
      .request()
      .input("r", sql.Int, riesgo_id)
      .input("m", sql.NVarChar(200), `Se eliminó el control: "${descripcion}"`)
      .query(
        "INSERT INTO historial_riesgo (riesgo_id, mensaje) VALUES (@r, @m)",
      );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   ADJUNTOS (FILTRADOS)
============================ */
app.get("/api/adjuntos/:riesgoId", verifyToken, async (req, res) => {
  try {
    const { riesgoId } = req.params;
    const { idEmpresa } = req.user; // Obtenemos la empresa del token

    await poolConnect;

    // Validamos que el riesgo pertenezca a la empresa para poder ver sus adjuntos
    const result = await pool
      .request()
      .input("riesgo_id", sql.Int, riesgoId)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        SELECT a.id, a.riesgo_id, a.control_id, a.titulo, a.nombre_archivo, a.ruta_archivo
        FROM adjuntos a
        INNER JOIN riesgos r ON a.riesgo_id = r.id
        WHERE a.riesgo_id = @riesgo_id AND r.idEmpresa = @idEmpresa
        ORDER BY a.id DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error obteniendo adjuntos:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/adjuntos",
  verifyToken,
  upload.single("archivo"),
  async (req, res) => {
    try {
      const { control_id, riesgo_id, titulo } = req.body;
      const { idEmpresa } = req.user;
      const archivo = req.file ? req.file.filename : null;

      await poolConnect;

      // 1️⃣ SEGURIDAD: Verificar que el riesgo sea de la empresa
      const checkRiesgo = await pool
        .request()
        .input("id", sql.Int, riesgo_id)
        .input("idEmpresa", sql.Int, idEmpresa)
        .query(
          "SELECT id FROM riesgos WHERE id = @id AND idEmpresa = @idEmpresa",
        );

      if (checkRiesgo.recordset.length === 0) {
        return res.status(403).json({
          error: "No tienes permiso para subir archivos a este riesgo",
        });
      }

      // 2️⃣ Insertar adjunto
      const result = await pool
        .request()
        .input("riesgo_id", sql.Int, riesgo_id)
        .input("control_id", sql.Int, control_id)
        .input("titulo", sql.NVarChar(200), titulo)
        .input("nombre_archivo", sql.NVarChar(300), archivo)
        .input("ruta_archivo", sql.NVarChar(300), archivo).query(`
        INSERT INTO adjuntos (riesgo_id, control_id, titulo, nombre_archivo, ruta_archivo)
        OUTPUT INSERTED.*
        VALUES (@riesgo_id, @control_id, @titulo, @nombre_archivo, @ruta_archivo)
      `);

      const adjunto = result.recordset[0];

      // 3️⃣ Guardar en historial
      await pool
        .request()
        .input("riesgo_id", sql.Int, riesgo_id)
        .input("mensaje", sql.NVarChar(300), `Se adjuntó archivo "${titulo}"`)
        .query(
          "INSERT INTO historial_riesgo (riesgo_id, mensaje) VALUES (@riesgo_id, @mensaje)",
        );

      res.json(adjunto);
    } catch (err) {
      console.error("Error subiendo adjunto:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

/* ============================
   HISTORIAL (FILTRADO)
============================ */
app.get("/api/historial/:riesgoId", verifyToken, async (req, res) => {
  try {
    const { riesgoId } = req.params;
    const { idEmpresa } = req.user;

    await poolConnect;

    // Validamos que el historial pertenezca a un riesgo de la empresa
    const result = await pool
      .request()
      .input("riesgoId", sql.Int, riesgoId)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        SELECT h.*
        FROM historial_riesgo h
        INNER JOIN riesgos r ON h.riesgo_id = r.id
        WHERE h.riesgo_id = @riesgoId AND r.idEmpresa = @idEmpresa
        ORDER BY h.fecha DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   ACTUALIZAR EVALUACION (PROTEGIDO)
============================ */
app.put("/api/riesgos/:id/evaluacion", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { prob_inh, sev_inh, prob_res, sev_res } = req.body;
    const { idEmpresa } = req.user;

    await poolConnect;

    // SEGURIDAD: Validar que el riesgo a evaluar pertenezca a la empresa
    const check = await pool
      .request()
      .input("id", sql.Int, id)
      .input("idEmpresa", sql.Int, idEmpresa)
      .query(
        "SELECT id FROM riesgos WHERE id = @id AND idEmpresa = @idEmpresa",
      );

    if (check.recordset.length === 0) {
      return res
        .status(403)
        .json({ error: "No puedes editar la evaluación de un riesgo ajeno" });
    }

    // Actualizar evaluación
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("prob_inh", sql.Int, prob_inh)
      .input("sev_inh", sql.Int, sev_inh)
      .input("prob_res", sql.Int, prob_res)
      .input("sev_res", sql.Int, sev_res).query(`
        UPDATE riesgos
        SET prob_inh=@prob_inh, sev_inh=@sev_inh, prob_res=@prob_res, sev_res=@sev_res
        WHERE id=@id
      `);

    // Guardar en historial
    await pool
      .request()
      .input("riesgo_id", sql.Int, id)
      .input("mensaje", sql.NVarChar(200), "Se guardó la evaluación del riesgo")
      .query(
        "INSERT INTO historial_riesgo (riesgo_id, mensaje) VALUES (@riesgo_id, @mensaje)",
      );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

//! INSPECCIONES
/* ==========================================================================
   MÓDULO DE INSPECCIONES HSE (UNIFICADO Y MEJORADO)
   ========================================================================== */
// 1. CREAR NUEVA INSPECCIÓN (CON DETALLES AUTOMÁTICOS)
app.post("/api/inspections", verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const { fecha, idArea, idChecklist, responsable } = req.body;
    const { idEmpresa } = req.user;

    await transaction.begin();

    // Insertar cabecera de inspección
    const result = await transaction
      .request()
      .input("Fecha", sql.Date, fecha)
      .input("idArea", sql.Int, idArea)
      .input("idChecklist", sql.Int, idChecklist)
      .input("Responsable", sql.VarChar(200), responsable)
      .input("Estado", sql.VarChar(50), "Pendiente")
      .input("PorcentajeCumplimiento", sql.Int, 0)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        INSERT INTO Inspeccion (Fecha, idChecklist, Responsable, Estado, PorcentajeCumplimiento, idArea, idEmpresa)
        VALUES (@Fecha, @idChecklist, @Responsable, @Estado, @PorcentajeCumplimiento, @idArea, @idEmpresa);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
      `);

    const idInspeccion = result.recordset[0].id;

    // Obtener ítems del checklist para poblar el detalle
    const itemsResult = await transaction
      .request()
      .input("idChecklist", sql.Int, idChecklist)
      .query(
        `SELECT idItem FROM Checklist_Items WHERE idChecklist = @idChecklist ORDER BY Orden`,
      );

    const items = itemsResult.recordset;

    // Insertar detalles vacíos para cada ítem
    for (const item of items) {
      await transaction
        .request()
        .input("idInspeccion", sql.Int, idInspeccion)
        .input("idItem", sql.Int, item.idItem)
        .input("Resultado", sql.Bit, null)
        .input("Comentario", sql.VarChar(500), null).query(`
          INSERT INTO Inspeccion_Detalle (idInspeccion, idItem, Resultado, Comentario)
          VALUES (@idInspeccion, @idItem, @Resultado, @Comentario)
        `);
    }

    await transaction.commit();
    res.json({ success: true, idInspeccion });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("Error creando inspección:", err);
    res.status(500).json({ error: "Error creando inspección" });
  }
});

/* ============================
   CREAR CHECKLIST PERSONALIZADO
============================ */

app.post("/api/checklists", verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    // 1. Priorizar el idEmpresa que viene del Frontend (Modal)
    // Si no viene en el body, usamos el del token por defecto
    const { nombre, items, idEmpresa: idEmpresaBody } = req.body;
    const idEmpresa = idEmpresaBody || req.user.idEmpresa;

    if (!idEmpresa) {
      return res
        .status(400)
        .json({ error: "No se identificó la empresa para este checklist." });
    }

    if (!nombre?.trim())
      return res.status(400).json({ error: "El nombre es obligatorio." });

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "El checklist debe tener al menos una pregunta." });
    }

    await transaction.begin();

    // Insertar Cabecera
    const result = await transaction
      .request()
      .input("Nombre", sql.VarChar(200), nombre.trim())
      .input("idEmpresa", sql.Int, idEmpresa) // <--- Usará el ID correcto
      .query(
        `INSERT INTO Checklist (Nombre, idEmpresa) OUTPUT INSERTED.idChecklist VALUES (@Nombre, @idEmpresa)`,
      );

    const idChecklist = result.recordset[0].idChecklist;

    // Insertar Items
    for (let i = 0; i < items.length; i++) {
      await transaction
        .request()
        .input("idChecklist", sql.Int, idChecklist)
        .input("Pregunta", sql.VarChar(500), items[i].pregunta.trim())
        .input("Orden", sql.Int, i + 1)
        .query(
          `INSERT INTO Checklist_Items (idChecklist, Pregunta, Orden) VALUES (@idChecklist, @Pregunta, @Orden)`,
        );
    }

    await transaction.commit();
    res.json({ id: idChecklist, name: nombre.trim(), idEmpresa });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("Error creando checklist:", err);
    res.status(500).json({ error: err.message });
  }
});
// LISTAR CHECKLISTS
app.get("/api/checklists", verifyToken, async (req, res) => {
  try {
    // CAMBIO CLAVE: Primero busca en la URL (query), si no hay, usa el token
    // const idEmpresa = req.query.idEmpresa || req.user.idEmpresa;
    const idEmpresaUsuario = req.user.idEmpresa;

    const idEmpresaBase = await obtenerEmpresaBase(idEmpresaUsuario);

    if (!idEmpresaBase) {
      return res.status(400).json({ error: "No se especificó idEmpresa" });
    }

    await poolConnect;
    const result = await pool
      .request()
      // .input("idEmpresa", sql.Int, idEmpresa)
      .input("idEmpresa", sql.Int, idEmpresaBase)

      .query(
        `SELECT idChecklist as id, Nombre as nombre FROM Checklist WHERE idEmpresa = @idEmpresa ORDER BY Nombre`,
      );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LISTAR INSPECCIONES (RESUMEN)
// app.get("/api/inspections", verifyToken, async (req, res) => {
//   try {
//     await poolConnect;
//     const result = await pool.request().query(`
//         SELECT
//           i.idInspeccion AS id,
//           i.Fecha AS fecha,
//           a.Nombre AS area,
//           c.Nombre AS checklist,
//           i.Responsable AS responsable,
//           i.Estado AS status,
//           i.PorcentajeCumplimiento AS cumplimiento,
//           e.razonSocial AS nombreEmpresa,
//           (SELECT COUNT(*) FROM Hallazgos h WHERE h.idInspeccion = i.idInspeccion AND h.Estado <> 'Cerrado') AS openFindings
//         FROM Inspeccion i
//         JOIN Areas a ON i.idArea = a.idArea
//         JOIN Checklist c ON i.idChecklist = c.idChecklist
//         LEFT JOIN Empresas e ON i.idEmpresa = e.idEmpresa
//         ORDER BY i.idInspeccion DESC
//       `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("Error en inspecciones:", err);
//     res.status(500).json({ error: err.message });
//   }
// });
app.get("/api/inspections", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idNivelAcceso, idEmpresa: idEmpresaToken } = req.user;

    const request = pool.request();

    let whereClause = "";

    // 🔥 SUPER ADMIN
    if (idNivelAcceso === 1) {
      whereClause = "";
    }

    // 🔥 ADMIN EMPRESA
    else if (idNivelAcceso === 2) {
      const empresasResult = await request.input(
        "idEmpresa",
        sql.Int,
        idEmpresaToken,
      ).query(`
          SELECT idEmpresa
          FROM Empresas
          WHERE idEmpresa = @idEmpresa
             OR idEmpresaPadre = @idEmpresa
        `);

      const ids = empresasResult.recordset.map((e) => e.idEmpresa);

      if (ids.length === 0) {
        return res.json([]);
      }

      const inParams = ids.map((_, i) => `@id${i}`).join(",");

      ids.forEach((id, i) => {
        request.input(`id${i}`, sql.Int, id);
      });

      whereClause = `WHERE i.idEmpresa IN (${inParams})`;
    }

    // 🔥 USUARIO NORMAL
    else {
      request.input("idEmpresaUser", sql.Int, idEmpresaToken);

      whereClause = `WHERE i.idEmpresa = @idEmpresaUser`;
    }

    // 🔥 CONSULTA
    const result = await request.query(`
      SELECT 
        i.idInspeccion AS id, 
        i.Fecha AS fecha, 
        a.Nombre AS area, 
        c.Nombre AS checklist,
        i.Responsable AS responsable, 
        i.Estado AS status, 
        i.PorcentajeCumplimiento AS cumplimiento,
        e.razonSocial AS nombreEmpresa,

        (
          SELECT COUNT(*)
          FROM Hallazgos h
          WHERE h.idInspeccion = i.idInspeccion
            AND h.Estado <> 'Cerrado'
        ) AS openFindings

      FROM Inspeccion i

      JOIN Areas a
        ON i.idArea = a.idArea

      JOIN Checklist c
        ON i.idChecklist = c.idChecklist

      LEFT JOIN Empresas e
        ON i.idEmpresa = e.idEmpresa

      ${whereClause}

      ORDER BY i.idInspeccion DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error en inspecciones:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// LISTAR ÁREAS
app.get("/api/areas", verifyToken, async (req, res) => {
  try {
    // Empresa del usuario logueado
    const idEmpresaUsuario = req.user.idEmpresa;

    // Obtener empresa base (padre si existe)
    const idEmpresaBase = await obtenerEmpresaBase(idEmpresaUsuario);
    // const { idEmpresa } = req.user;

    await poolConnect;
    const result = await pool
      .request()
      // .input("idEmpresa", sql.Int, idEmpresa)
      .input("idEmpresa", sql.Int, idEmpresaBase)
      .query(
        `SELECT idArea, Nombre FROM Areas WHERE idEmpresa = @idEmpresa ORDER BY Nombre`,
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DETALLE COMPLETO DE INSPECCIÓN
app.get("/api/inspections/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { idEmpresa } = req.user;
  try {
    await poolConnect;

    // Datos generales (Filtro por idEmpresa para seguridad)
    const inspRes = await pool
      .request()
      .input("idInspeccion", sql.Int, id)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        SELECT i.idInspeccion as id, i.Fecha as fecha, i.Responsable as responsable, i.Estado as status,
               i.PorcentajeCumplimiento as cumplimiento, a.Nombre as area, c.Nombre as checklist
        FROM Inspeccion i
        JOIN Areas a ON a.idArea = i.idArea
        JOIN Checklist c ON c.idChecklist = i.idChecklist
        WHERE i.idInspeccion = @idInspeccion AND i.idEmpresa = @idEmpresa
      `);

    if (!inspRes.recordset[0])
      return res.status(404).json({ error: "Inspección no encontrada" });
    const selected = inspRes.recordset[0];

    // Items del detalle
    const itemsRes = await pool.request().input("idInspeccion", sql.Int, id)
      .query(`
        SELECT d.idDetalle as id, ci.Pregunta as q, d.Resultado as ok, d.Comentario as comentario
        FROM Inspeccion_Detalle d
        JOIN Checklist_Items ci ON ci.idItem = d.idItem
        WHERE d.idInspeccion = @idInspeccion
        ORDER BY ci.Orden
      `);
    selected.items = itemsRes.recordset.map((r) => ({
      ...r,
      ok: r.ok === null ? null : Boolean(r.ok),
    }));

    // Hallazgos
    const findingsRes = await pool.request().input("idInspeccion", sql.Int, id)
      .query(`SELECT idHallazgo as id, Titulo as titulo, Severidad as severidad, Categoria as categoria, AccionRecomendada as accionRecomendada, Estado as estado 
              FROM Hallazgos WHERE idInspeccion = @idInspeccion`);
    selected.findings = findingsRes.recordset;

    // Acciones CAPA
    const actionsRes = await pool.request().input("idInspeccion", sql.Int, id)
      .query(`SELECT idAccion as id, Titulo as titulo, Responsable as responsable, Estado as estado, FechaCompromiso as fechaCompromiso 
              FROM AccionesInspeccion WHERE idInspeccion = @idInspeccion ORDER BY id DESC`);

    res.json({ selected, actions: actionsRes.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR ITEM DE CHECKLIST Y RECALCULAR %
app.put("/api/inspections/:id/items/:itemId", verifyToken, async (req, res) => {
  try {
    const { ok, comentario } = req.body;
    const { id, itemId } = req.params;

    await poolConnect;
    await pool
      .request()
      .input("idDetalle", sql.Int, itemId)
      .input("Resultado", sql.Bit, ok)
      .input("Comentario", sql.VarChar(500), comentario)
      .query(
        `UPDATE Inspeccion_Detalle SET Resultado=@Resultado, Comentario=@Comentario WHERE idDetalle=@idDetalle`,
      );

    // Recalcular % cumplimiento
    await pool.request().input("idInspeccion", sql.Int, id).query(`
      UPDATE Inspeccion SET PorcentajeCumplimiento = (
        SELECT CAST(SUM(CASE WHEN Resultado = 1 THEN 1 ELSE 0 END)*100.0/COUNT(*) AS INT)
        FROM Inspeccion_Detalle WHERE idInspeccion = @idInspeccion
      ) WHERE idInspeccion = @idInspeccion
    `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR HALLAZGO DESDE ITEM
app.post(
  "/api/inspections/:id/items/:itemId/findings",
  verifyToken,
  async (req, res) => {
    try {
      const { titulo, severidad, categoria, accionRecomendada } = req.body;
      await poolConnect;
      const result = await pool
        .request()
        .input("idI", sql.Int, req.params.id)
        .input("idD", sql.Int, req.params.itemId)
        .input("T", sql.VarChar(300), titulo)
        .input("S", sql.VarChar(50), severidad)
        .input("C", sql.VarChar(100), categoria)
        .input("A", sql.VarChar(500), accionRecomendada).query(`
        INSERT INTO Hallazgos (idInspeccion, idDetalle, Titulo, Severidad, Categoria, AccionRecomendada, Estado)
        VALUES (@idI, @idD, @T, @S, @C, @A, 'Abierto');
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
      `);
      res.json({ success: true, idHallazgo: result.recordset[0].id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ACTUALIZAR HALLAZGO
app.put("/api/findings/:id", verifyToken, async (req, res) => {
  try {
    const { severidad, accionRecomendada, estado } = req.body;
    await pool
      .request()
      .input("idH", sql.Int, req.params.id)
      .input("S", sql.VarChar(50), severidad)
      .input("A", sql.VarChar(500), accionRecomendada)
      .input("E", sql.VarChar(50), estado)
      .query(
        `UPDATE Hallazgos SET Severidad=@S, AccionRecomendada=@A, Estado=@E WHERE idHallazgo=@idH`,
      );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR ACCIÓN CAPA DESDE HALLAZGO
app.post("/api/findings/:id/actions", verifyToken, async (req, res) => {
  try {
    const { titulo, responsable, fechaCompromiso } = req.body;
    await poolConnect;
    const result = await pool
      .request()
      .input("idH", sql.Int, req.params.id)
      .input("T", sql.VarChar(300), titulo)
      .input("R", sql.VarChar(200), responsable)
      .input("F", sql.Date, fechaCompromiso).query(`
        DECLARE @idI INT = (SELECT idInspeccion FROM Hallazgos WHERE idHallazgo = @idH);
        INSERT INTO AccionesInspeccion (idInspeccion, idHallazgo, Titulo, Responsable, FechaCompromiso, Estado)
        VALUES (@idI, @idH, @T, @R, @F, 'Pendiente');
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
      `);
    res.json({ success: true, idAccion: result.recordset[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR ACCIÓN CAPA
app.put("/api/actions/:id", verifyToken, async (req, res) => {
  try {
    await pool
      .request()
      .input("idA", sql.Int, req.params.id)
      .input("E", sql.VarChar(50), req.body.estado)
      .query(`UPDATE AccionesInspeccion SET Estado=@E WHERE idAccion=@idA`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OBTENER ACCIONES DE UNA INSPECCIÓN
app.get("/api/inspections/:id/actions", verifyToken, async (req, res) => {
  try {
    const result = await pool.request().input("idI", sql.Int, req.params.id)
      .query(`SELECT idAccion as id, Titulo as titulo, Responsable as responsable, Estado as estado, FechaCompromiso as fechaCompromiso 
              FROM AccionesInspeccion WHERE idInspeccion = @idI ORDER BY idAccion DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR ESTADO DE INSPECCIÓN
app.put("/api/inspections/:id/status", verifyToken, async (req, res) => {
  try {
    await pool
      .request()
      .input("idI", sql.Int, req.params.id)
      .input("E", sql.VarChar(50), req.body.estado)
      .query(`UPDATE Inspeccion SET Estado = @E WHERE idInspeccion = @idI`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// CAPACITACIONES
/* ==========================================================================
   MÓDULO DE CAPACITACIONES (HSE) - UNIFICADO Y MEJORADO
   ========================================================================== */

// 1. OBTENER PERSONAS (Filtrado por Empresa)
app.get("/api/personas", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT 
          p.idPersona, 
          p.nombre, 
          a.nombre as area, 
          r.nombre as rol
        FROM Personas p
        JOIN Areas a ON a.idArea = p.idArea
        JOIN Roles r ON r.idRol = p.idRol
        WHERE p.idEmpresa = @idEmpresa
        ORDER BY p.nombre
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error obteniendo personas" });
  }
});

// 2. OBTENER CURSOS Y SUS ROLES ASOCIADOS
app.get("/api/cursos", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT 
          c.idCurso, c.nombre, c.vigenciaMeses, c.obligatorio, r.nombre as rol
        FROM Cursos c
        LEFT JOIN CursosRoles cr ON cr.idCurso = c.idCurso
        LEFT JOIN Roles r ON r.idRol = cr.idRol
        WHERE c.idEmpresa = @idEmpresa
      `);

    const cursos = {};
    result.recordset.forEach((row) => {
      if (!cursos[row.idCurso]) {
        cursos[row.idCurso] = {
          idCurso: row.idCurso,
          nombre: row.nombre,
          vigenciaMeses: row.vigenciaMeses,
          obligatorio: row.obligatorio,
          aplicaRoles: [],
        };
      }
      if (row.rol) cursos[row.idCurso].aplicaRoles.push(row.rol);
    });

    res.json(Object.values(cursos));
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error obteniendo cursos" });
  }
});

// 3. CREAR CAPACITACIÓN Y ACCIÓN DE REENTRENAMIENTO (Transaccional)
app.post("/api/capacitaciones", verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    // Desestructuramos los nombres que vienen del JSON del frontend
    const { idPersona, idCurso, fecha, fechaVencimiento, nota, evidenciaURL } =
      req.body;
    const { idEmpresa } = req.user;

    await transaction.begin();

    const resCap = await transaction
      .request()
      .input("idP", sql.Int, idPersona)
      .input("idC", sql.Int, idCurso)
      .input("idE", sql.Int, idEmpresa)
      // Si fecha es opcional, llegará como null o string vacío
      .input("fec", sql.Date, fecha || null)
      .input("fecV", sql.Date, fechaVencimiento)
      .input("not", sql.Int, nota || null)
      .input("evid", sql.VarChar(sql.MAX), evidenciaURL || null).query(`
        INSERT INTO Capacitaciones (
          idPersona, 
          idCurso, 
          fechaRegistro, 
          idEmpresa, 
          fecha, 
          fechaVencimiento, 
          nota, 
          evidenciaURL
        )
        OUTPUT INSERTED.idCapacitacion
        VALUES (
          @idP, 
          @idC, 
          GETDATE(), 
          @idE, 
          @fec, 
          @fecV, 
          @not, 
          @evid
        )
      `);

    const idCapacitacion = resCap.recordset[0].idCapacitacion;

    if (fechaVencimiento) {
      await transaction
        .request()
        .input("idP", sql.Int, idPersona)
        .input("idC", sql.Int, idCurso)
        .input("fecV", sql.Date, fechaVencimiento)
        .input("idE", sql.Int, idEmpresa).query(`
          INSERT INTO AccionesCapacitacion (idPersona, idCurso, tipo, fechaVencimiento, estado, idEmpresa)
          VALUES (@idP, @idC, 'Reentrenamiento', @fecV, 'Pendiente', @idE)
        `);
    }

    await transaction.commit();
    res.json({ ok: true, idCapacitacion });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("Error SQL Detallado:", err.message);
    res
      .status(500)
      .json({ error: "Error creando capacitación", detail: err.message });
  }
});

// 4. ACTUALIZAR ESTADO DE ACCIÓN (Soporta formato ACT-XX)
app.put("/api/accionescapacitacion/:id", verifyToken, async (req, res) => {
  try {
    const { estado } = req.body;
    const { idEmpresa } = req.user;

    // Convertimos a string por si viene como número para que replace no falle
    let rawId = req.params.id.toString().replace("ACT-", "");
    const idAccion = parseInt(rawId);

    if (isNaN(idAccion)) {
      return res.status(400).json({ error: "ID de acción inválido" });
    }

    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, idAccion)
      .input("estado", sql.VarChar, estado)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        UPDATE AccionesCapacitacion 
        SET estado = @estado 
        WHERE idAccion = @id AND idEmpresa = @idEmpresa
      `);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error SQL:", err.message);
    res
      .status(500)
      .json({ error: "Error actualizando acción", detail: err.message });
  }
});

// 5. LISTAR HISTORIAL DE CAPACITACIONES
app.get("/api/capacitaciones", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT
          c.idCapacitacion, p.idPersona, p.nombre AS persona, a.nombre AS area,
          r.nombre AS rol, cu.nombre AS curso, c.fecha, c.fechaVencimiento,
          c.nota, c.evidenciaURL
        FROM Capacitaciones c
        JOIN Personas p ON p.idPersona = c.idPersona
        JOIN Areas a ON a.idArea = p.idArea
        JOIN Roles r ON r.idRol = p.idRol
        JOIN Cursos cu ON cu.idCurso = c.idCurso
        WHERE c.idEmpresa = @idEmpresa
        ORDER BY c.fecha DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error obteniendo capacitaciones" });
  }
});

// 6. DASHBOARD: CUMPLIMIENTO POR ÁREA
app.get("/api/cumplimiento-area", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT 
          a.Nombre AS area,
          SUM(CASE WHEN ca.fechaVencimiento >= GETDATE() THEN 1 ELSE 0 END) AS ok,
          SUM(CASE WHEN ca.fechaVencimiento BETWEEN GETDATE() AND DATEADD(day,30,GETDATE()) THEN 1 ELSE 0 END) AS warn,
          SUM(CASE WHEN ca.fechaVencimiento < GETDATE() OR ca.fechaVencimiento IS NULL THEN 1 ELSE 0 END) AS bad
        FROM Personas p
        LEFT JOIN Areas a ON p.idArea = a.idArea
        LEFT JOIN Capacitaciones ca ON ca.idPersona = p.idPersona
        WHERE p.idEmpresa = @idEmpresa
        GROUP BY a.Nombre
        ORDER BY a.Nombre
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error en reporte de cumplimiento" });
  }
});

// 7. LISTAR ACCIONES PENDIENTES (TAREAS)
app.get("/api/actions", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT
          ac.idAccion,
          'ACT-' + CAST(ac.idAccion AS VARCHAR) as id,
          p.nombre as persona,
          cu.nombre as curso,
          ac.tipo,
          ac.fechaVencimiento as vence,
          ac.estado
        FROM AccionesCapacitacion ac
        JOIN Personas p ON p.idPersona = ac.idPersona
        JOIN Cursos cu ON cu.idCurso = ac.idCurso
        WHERE ac.idEmpresa = @idEmpresa
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo acciones" });
  }
});

//AMBIENTAL
/* ============================
   MÓDULO AMBIENTAL (IMPORTACIÓN Y MONITOREO)
============================ */
app.post("/api/import", verifyToken, async (req, res) => {
  try {
    // 1. Priorizamos el idEmpresa que viene del modal del frontend
    const { muestras, nombreArchivo, idEmpresa: idEmpresaManual } = req.body;
    const idEmpresaToken = req.user.idEmpresa;

    // El ID final será el del modal o, en su defecto, el del usuario autenticado
    const idEmpresaFinal = idEmpresaManual || idEmpresaToken;

    if (!idEmpresaFinal) {
      return res
        .status(400)
        .json({ error: "No se especificó una empresa para la importación." });
    }

    await poolConnect;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 2. Crear registro en Env_Importaciones
      const resultImport = await transaction
        .request()
        .input(
          "nombreArchivo",
          sql.VarChar,
          nombreArchivo || `Import_${Date.now()}`,
        )
        .input("totalFilas", sql.Int, muestras.length)
        .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
          INSERT INTO Env_Importaciones (nombreArchivo, totalFilas, idEmpresa) 
          OUTPUT INSERTED.idImportacion 
          VALUES (@nombreArchivo, @totalFilas, @idEmpresa)
        `);

      const idImportacion = resultImport.recordset[0].idImportacion;

      // 3. Preparar tabla para BULK INSERT
      const table = new sql.Table("Env_Muestras_Staging");
      table.columns.add("idImportacion", sql.Int);
      table.columns.add("idExcel", sql.NVarChar(sql.MAX));
      table.columns.add("fecha", sql.NVarChar(sql.MAX));
      table.columns.add("tipo", sql.NVarChar(sql.MAX));
      table.columns.add("punto", sql.NVarChar(sql.MAX));
      table.columns.add("parametro", sql.NVarChar(sql.MAX));
      table.columns.add("laboratorio", sql.NVarChar(sql.MAX));
      table.columns.add("valor", sql.NVarChar(sql.MAX));
      table.columns.add("unidad", sql.NVarChar(sql.MAX));
      table.columns.add("preservante", sql.NVarChar(sql.MAX));
      table.columns.add("filtro", sql.NVarChar(sql.MAX));
      table.columns.add("sensor", sql.NVarChar(sql.MAX));
      table.columns.add("retenido_h", sql.NVarChar(sql.MAX));
      table.columns.add("duplicado_de", sql.NVarChar(sql.MAX));
      table.columns.add("idEmpresa", sql.Int);

      for (const m of muestras) {
        table.rows.add(
          idImportacion,
          String(m.id || ""),
          String(m.fecha || ""),
          String(m.tipo || ""),
          String(m.punto || ""),
          String(m.parametro || ""),
          String(m.laboratorio || ""),
          String(m.valor || ""),
          String(m.unidad || ""),
          String(m.preservante || ""),
          String(m.filtro || ""),
          String(m.sensor || ""),
          String(m.retenida_h || ""),
          String(m.duplicado_de || ""),
          idEmpresaFinal, // <--- Importante: Usar el ID seleccionado
        );
      }

      const bulkRequest = new sql.Request(transaction);
      await bulkRequest.bulk(table);

      // 4. Ejecutar procedimiento con los parámetros correctos
      await transaction
        .request()
        .input("idImportacion", sql.Int, idImportacion)
        .input("idEmpresa", sql.Int, idEmpresaFinal)
        .execute("sp_ProcesarImportacion");

      await transaction.commit();
      res.json({ ok: true, idImportacion });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error en /api/import:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. LISTAR TODAS LAS MUESTRAS (Filtrado por Empresa)
app.get("/api/muestras", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT i.*, e.razonSocial AS nombreEmpresa 
        FROM Env_Muestras i 
        LEFT JOIN Empresas e 
        ON i.idEmpresa = e.idEmpresa 
        ORDER BY i.idMuestra DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. OBTENER CATÁLOGOS (Puntos y Parámetros por Tipo)
app.get("/api/catalogs", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
        SELECT tipo, punto, parametro 
        FROM Env_Muestras 
        WHERE idEmpresa = @idEmpresa
      `);

    const puntosByTipo = {};
    const parametrosByTipo = {};

    result.recordset.forEach((r) => {
      if (r.tipo) {
        if (!puntosByTipo[r.tipo]) puntosByTipo[r.tipo] = new Set();
        if (r.punto) puntosByTipo[r.tipo].add(r.punto);

        if (!parametrosByTipo[r.tipo]) parametrosByTipo[r.tipo] = new Set();
        if (r.parametro) parametrosByTipo[r.tipo].add(r.parametro);
      }
    });

    // Convertir Sets a Arrays
    const response = { puntosByTipo: {}, parametrosByTipo: {} };
    for (const t in puntosByTipo) {
      response.puntosByTipo[t] = Array.from(puntosByTipo[t]);
      response.parametrosByTipo[t] = Array.from(parametrosByTipo[t]);
    }

    res.json(response);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Error obteniendo catálogos" });
  }
});

// 4. LISTAR HISTORIAL DE IMPORTACIONES (Filtrado por Empresa)
app.get("/api/importaciones", verifyToken, async (req, res) => {
  try {
    // Si viene por query usamos ese,
    // si no usamos el del usuario logueado
    const idEmpresa = req.query.idEmpresa || req.user.idEmpresa;

    await poolConnect;

    const request = pool.request();

    let query = `
      SELECT 
        i.*, 
        e.razonSocial AS nombreEmpresa
      FROM Env_Importaciones i
      LEFT JOIN Empresas e
        ON i.idEmpresa = e.idEmpresa
    `;

    // Aplicar filtro SOLO si existe idEmpresa
    if (idEmpresa) {
      request.input("idEmpresa", sql.Int, idEmpresa);

      query += `
        WHERE i.idEmpresa = @idEmpresa
      `;
    }

    query += `
      ORDER BY i.idImportacion DESC
    `;

    const result = await request.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error obteniendo importaciones:", err);

    res.status(500).json({
      error: "Error obteniendo importaciones",
    });
  }
});

// 5. OBTENER MUESTRAS DE UNA IMPORTACIÓN ESPECÍFICA
app.get("/api/muestras/:idImportacion", verifyToken, async (req, res) => {
  try {
    const { idImportacion } = req.params;
    // Quitamos req.user.idEmpresa de aquí para que permita ver la importación seleccionada
    // independientemente de quién esté logueado (o valídalo según tus reglas de negocio)

    await poolConnect;
    const result = await pool.request().input("idI", sql.Int, idImportacion)
      .query(`
        SELECT * FROM Env_Muestras 
        WHERE idImportacion = @idI
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo muestras", err });
  }
});

// 6. OBTENER CATÁLOGOS DE UNA IMPORTACIÓN ESPECÍFICA
app.get("/api/catalogs/:idImportacion", verifyToken, async (req, res) => {
  try {
    const { idImportacion } = req.params;
    const { idEmpresa } = req.user;

    await poolConnect;
    const result = await pool
      .request()
      .input("idI", sql.Int, idImportacion)
      .input("idE", sql.Int, idEmpresa).query(`
        SELECT tipo, punto, parametro 
        FROM Env_Muestras 
        WHERE idImportacion = @idI AND idEmpresa = @idE
      `);

    const puntosByTipo = {};
    const parametrosByTipo = {};

    result.recordset.forEach((r) => {
      if (r.tipo) {
        if (!puntosByTipo[r.tipo]) puntosByTipo[r.tipo] = new Set();
        if (r.punto) puntosByTipo[r.tipo].add(r.punto);

        if (!parametrosByTipo[r.tipo]) parametrosByTipo[r.tipo] = new Set();
        if (r.parametro) parametrosByTipo[r.tipo].add(r.parametro);
      }
    });

    const response = { puntosByTipo: {}, parametrosByTipo: {} };
    for (const t in puntosByTipo) {
      response.puntosByTipo[t] = Array.from(puntosByTipo[t]);
      response.parametrosByTipo[t] = Array.from(parametrosByTipo[t]);
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo catalogs" });
  }
});
/* ==========================================================================
   MÓDULO DE RESIDUOS Y DOCUMENTACIÓN (UNIFICADO)
   ========================================================================== */
// app.get("/api/residuos", verifyToken, async (req, res) => {
//   try {
//     await poolConnect;

//     const residuos = await pool.request().query(`
//           SELECT i.*, e.razonSocial AS nombreEmpresa FROM Residuos_Registros i LEFT JOIN Empresas e ON i.idEmpresa = e.idEmpresa ORDER BY i.id DESC
//         `);
//     res.json(residuos.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Error obteniendo residuos" });
//   }
// });

app.get("/api/residuos", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idEmpresa, idNivelAcceso } = req.user;

    console.log("USER RESIDUOS:", req.user);
    console.log("ID EMPRESA USADA:", idEmpresa);

    const request = pool.request();

    let query = "";

    // 🔐 SUPER ADMIN ve todo
    if (idNivelAcceso === 1) {
      query = `
        SELECT i.*, e.razonSocial AS nombreEmpresa
        FROM Residuos_Registros i
        INNER JOIN Empresas e ON i.idEmpresa = e.idEmpresa
        ORDER BY i.id DESC
      `;
    } else {
      // 🧠 ADMIN_EMPRESA / USER → solo su árbol
      query = `
        WITH EmpresasCTE AS (
          SELECT idEmpresa
          FROM Empresas
          WHERE idEmpresa = @idEmpresa

          UNION ALL

          SELECT e.idEmpresa
          FROM Empresas e
          INNER JOIN EmpresasCTE cte 
            ON e.idEmpresaPadre = cte.idEmpresa
        )
        SELECT i.*, e.razonSocial AS nombreEmpresa
        FROM Residuos_Registros i
        INNER JOIN Empresas e ON i.idEmpresa = e.idEmpresa
        WHERE i.idEmpresa IN (SELECT idEmpresa FROM EmpresasCTE)
        ORDER BY i.id DESC
      `;

      request.input("idEmpresa", sql.Int, idEmpresa);
    }

    const result = await request.query(query);

    console.log(
      "RESULTADOS SQL:",
      result.recordset.map((r) => ({
        id: r.id,
        idEmpresa: r.idEmpresa,
        nombreEmpresa: r.nombreEmpresa,
      })),
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR RESIDUOS:", err);
    res.status(500).json({ error: "Error obteniendo residuos" });
  }
});

// Guardar nuevo registro de residuo
app.post("/api/residuos", verifyToken, async (req, res) => {
  const { idEmpresa } = req.user;
  const {
    fecha,
    area_generadora,
    tipo_residuo,
    clasificacion,
    cantidad,
    unidad,
    empresa_transportista,
    nro_manifiesto,
    destino_final,
    observaciones,
  } = req.body || {};

  if (!fecha || !tipo_residuo || cantidad == null) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    await poolConnect;
    await pool
      .request()
      .input("fecha", sql.Date, fecha)
      .input("area_generadora", sql.NVarChar(100), area_generadora || null)
      .input("tipo_residuo", sql.NVarChar(100), tipo_residuo)
      .input("clasificacion", sql.NVarChar(60), clasificacion || null)
      .input("cantidad", sql.Decimal(10, 3), parseFloat(cantidad))
      .input("unidad", sql.NVarChar(20), unidad || "kg")
      .input(
        "empresa_transportista",
        sql.NVarChar(150),
        empresa_transportista || null,
      )
      .input("nro_manifiesto", sql.NVarChar(50), nro_manifiesto || null)
      .input("destino_final", sql.NVarChar(150), destino_final || null)
      .input("observaciones", sql.NVarChar(500), observaciones || null)
      .input("idEmpresa", sql.Int, idEmpresa) // Vínculo con la empresa
      .query(`
        INSERT INTO Residuos_Registros
        (fecha, area_generadora, tipo_residuo, clasificacion, cantidad, unidad,
         empresa_transportista, nro_manifiesto, destino_final, observaciones, idEmpresa)
        VALUES
        (@fecha, @area_generadora, @tipo_residuo, @clasificacion, @cantidad, @unidad,
         @empresa_transportista, @nro_manifiesto, @destino_final, @observaciones, @idEmpresa)
      `);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error guardando residuo" });
  }
});

// Eliminar residuo (Validando que pertenezca a la empresa)
app.delete("/api/residuos/:id", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, parseInt(req.params.id))
      .input("idEmpresa", sql.Int, idEmpresa)
      .query(
        "DELETE FROM Residuos_Registros WHERE id = @id AND idEmpresa = @idEmpresa",
      );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error eliminando residuo" });
  }
});

// ─── RESIDUOS: DOCUMENTOS ─────────────────────────────────────────────────────
// Listar documentos de la empresa (Ordenados por vencimiento)
// app.get("/api/residuos/documentos", verifyToken, async (req, res) => {
//   try {
//     const { idEmpresa } = req.user;
//     await poolConnect;
//     const documentos = await pool
//       .request()
//       .input("idEmpresa", sql.Int, idEmpresa).query(`
//         SELECT i.*, e.razonSocial AS nombreEmpresa FROM Residuos_Documentos i LEFT JOIN Empresas e ON i.idEmpresa = e.idEmpresa ORDER BY i.id DESC
//       `);

//     res.json(documentos.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Error obteniendo documentos" });
//   }
// });
app.get("/api/residuos/documentos", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idEmpresa, idNivelAcceso } = req.user;
    const request = pool.request();

    let query = "";

    // 🔐 SUPER ADMIN
    if (idNivelAcceso === 1) {
      query = `
        SELECT d.*, e.razonSocial AS nombreEmpresa
        FROM Residuos_Documentos d
        INNER JOIN Empresas e ON d.idEmpresa = e.idEmpresa
        ORDER BY d.id DESC
      `;
    } else {
      // 🧠 FILTRO POR EMPRESA + HIJAS
      query = `
        WITH EmpresasCTE AS (
          SELECT idEmpresa
          FROM Empresas
          WHERE idEmpresa = @idEmpresa

          UNION ALL

          SELECT e.idEmpresa
          FROM Empresas e
          INNER JOIN EmpresasCTE cte 
            ON e.idEmpresaPadre = cte.idEmpresa
        )
        SELECT d.*, e.razonSocial AS nombreEmpresa
        FROM Residuos_Documentos d
        INNER JOIN Empresas e ON d.idEmpresa = e.idEmpresa
        WHERE d.idEmpresa IN (SELECT idEmpresa FROM EmpresasCTE)
        ORDER BY d.id DESC
      `;

      request.input("idEmpresa", sql.Int, idEmpresa);
    }

    const result = await request.query(query);

    console.log(
      "DOCUMENTOS FILTRADOS:",
      result.recordset.map((d) => ({
        id: d.id,
        idEmpresa: d.idEmpresa,
        nombreEmpresa: d.nombreEmpresa,
      })),
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR DOCUMENTOS:", err);
    res.status(500).json({ error: "Error obteniendo documentos" });
  }
});

// Guardar nuevo documento (Manifiestos, autorizaciones, etc.)
app.post("/api/residuos/documentos", verifyToken, async (req, res) => {
  const { idEmpresa } = req.user;
  const {
    nombre,
    tipo,
    numero_doc,
    fecha_emision,
    fecha_vencimiento,
    entidad,
    observaciones,
  } = req.body || {};

  if (!nombre)
    return res.status(400).json({ error: "El nombre es obligatorio." });

  try {
    await poolConnect;
    await pool
      .request()
      .input("nombre", sql.NVarChar(200), nombre)
      .input("tipo", sql.NVarChar(100), tipo || null)
      .input("numero_doc", sql.NVarChar(100), numero_doc || null)
      .input("fecha_emision", sql.Date, fecha_emision || null)
      .input("fecha_vencimiento", sql.Date, fecha_vencimiento || null)
      .input("entidad", sql.NVarChar(150), entidad || null)
      .input("observaciones", sql.NVarChar(500), observaciones || null)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        INSERT INTO Residuos_Documentos
        (nombre, tipo, numero_doc, fecha_emision, fecha_vencimiento, entidad, observaciones, idEmpresa)
        VALUES
        (@nombre, @tipo, @numero_doc, @fecha_emision, @fecha_vencimiento, @entidad, @observaciones, @idEmpresa)
      `);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error guardando documento" });
  }
});

// Eliminar documento
app.delete("/api/residuos/documentos/:id", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.user;
    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, parseInt(req.params.id))
      .input("idEmpresa", sql.Int, idEmpresa)
      .query(
        "DELETE FROM Residuos_Documentos WHERE id = @id AND idEmpresa = @idEmpresa",
      );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error eliminando documento" });
  }
});

// EMPRESAS (NUEVO)
app.get("/api/admin/empresas", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    console.log("USER JWT:", req.user);

    const { idNivelAcceso, idEmpresa } = req.user;

    const isSuperAdmin = idNivelAcceso === 1;

    let request = pool.request();

    let query = `
      SELECT 
        e.idEmpresa,
        e.razonSocial,
        e.ruc,
        e.activo,
        e.fechaRegistro,
        e.direccion,
        e.idEmpresaPadre,

        ISNULL((
          SELECT SUM(l.cantidadUsuarios)
          FROM Licencias l
          WHERE l.idEmpresa = e.idEmpresa
            AND l.activo = 1
            AND GETDATE() BETWEEN l.fechaInicio AND l.fechaFin
        ), 0) AS cantidadLicencias,

       ISNULL((
            SELECT COUNT(*)
            FROM LicenciasUsuarios lu
            INNER JOIN usuarios_login ul
                ON ul.id = lu.idUsuario
            INNER JOIN Personas p
                ON p.idPersona = ul.idPersona

            WHERE p.idEmpresa = e.idEmpresa
              AND lu.activo = 1
        ), 0) AS licenciasUsadas

      FROM Empresas e
    `;

    if (!isSuperAdmin) {
      request.input("idEmpresa", sql.Int, idEmpresa);

      query += `
        WHERE e.idEmpresa = @idEmpresa
           OR e.idEmpresaPadre = @idEmpresa
      `;
    }

    query += ` ORDER BY e.razonSocial ASC`;

    const result = await request.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR ADMIN EMPRESAS:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dash/empresas", verifyToken, async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query(
        "SELECT idEmpresa, razonSocial as nombre, ruc, activo FROM Empresas ORDER BY razonSocial ASC",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo empresas" });
  }
});
//!FUNCIONANDO
app.get("/api/empresas", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idNivelAcceso, idEmpresa } = req.user;

    const request = pool.request();

    let query = `
      SELECT
        e.idEmpresa,
        e.razonSocial,
        e.ruc,
        e.activo,
        e.fechaRegistro,
        e.direccion,
        e.idEmpresaPadre,

        -- LICENCIAS TOTALES
        ISNULL((
          SELECT SUM(l.cantidadUsuarios)
          FROM Licencias l
          WHERE l.idEmpresa = e.idEmpresa
            AND l.activo = 1
            AND GETDATE() BETWEEN l.fechaInicio AND l.fechaFin
        ), 0) AS licenciasTotales,

        -- LICENCIAS USADAS REALES
ISNULL((
    SELECT COUNT(*)

    FROM LicenciasUsuarios lu

    INNER JOIN usuarios_login ul
        ON ul.id = lu.idUsuario

    INNER JOIN Personas p
        ON p.idPersona = ul.idPersona

    WHERE p.idEmpresa = e.idEmpresa
      AND lu.activo = 1

), 0) AS licenciasUsadas

      FROM Empresas e
    `;

    // SUPER ADMIN VE TODO
    if (idNivelAcceso === 1) {
      // sin filtro
    }

    // ADMIN EMPRESA VE SU GRUPO
    else if (idNivelAcceso === 2) {
      query += `
        WHERE e.idEmpresa = @idEmpresa
           OR e.idEmpresaPadre = @idEmpresa
      `;
      request.input("idEmpresa", sql.Int, idEmpresa);
    }

    // OTROS NO VEN NADA
    else {
      return res.status(403).json({
        error: "No autorizado para este recurso",
      });
    }

    query += ` ORDER BY e.razonSocial ASC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR EMPRESAS:", err);
    res.status(500).json({ error: "Error obteniendo empresas" });
  }
});

// USA ESTA RUTA PARA LA CONFIGURACIÓN
app.get("/api/empresas/:idEmpresa/areas", verifyToken, async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    await poolConnect;
    const result = await pool
      .request()
      .input("idEmpresa", sql.Int, idEmpresa)
      .query(
        `SELECT idArea, Nombre FROM Areas WHERE idEmpresa = @idEmpresa ORDER BY Nombre`,
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/licencias", verifyToken, async (req, res) => {
  const { idEmpresa, cantidadUsuarios, fechaInicio, fechaFin } = req.body;
  try {
    // Validaciones básicas
    if (!idEmpresa || !cantidadUsuarios || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Faltan datos: idEmpresa, cantidadUsuarios o fechas",
      });
    }
    await poolConnect;
    const result = await pool
      .request()
      .input("idEmpresa", sql.Int, idEmpresa)
      .input("cantidad", sql.Int, cantidadUsuarios)
      .input("fechaInicio", sql.Date, fechaInicio)
      .input("fechaFin", sql.Date, fechaFin)
      .execute("sp_AsignarLicenciasEmpresa");

    res.json({ ok: true, result });
    console.log("BODY LICENCIAS:", req.body);
  } catch (err) {
    console.error("ERROR LICENCIAS:", err);
    res.status(400).json({
      error: err.message,
    });
  }
});
// LICENCIAS DISTRIBUIDAS
app.post("/api/licencias/distribuir", verifyToken, async (req, res) => {
  const { idLicencia, distribucion } = req.body;

  // ✅ Validación básica
  if (!idLicencia || !Array.isArray(distribucion)) {
    return res.status(400).json({
      error: "Datos inválidos",
    });
  }

  try {
    await poolConnect;

    // 1. Obtener licencia
    const lic = await pool.request().input("idLicencia", sql.Int, idLicencia)
      .query(`
        SELECT cantidadUsuarios, idEmpresa
        FROM Licencias
        WHERE idLicencia = @idLicencia
      `);

    if (lic.recordset.length === 0) {
      return res.status(404).json({ error: "Licencia no encontrada" });
    }

    const total = lic.recordset[0].cantidadUsuarios;
    const empresaPadre = lic.recordset[0].idEmpresa;

    // 2. Validar ADMIN_EMPRESA
    if (req.user.idNivelAcceso === 2) {
      if (req.user.idEmpresa !== empresaPadre) {
        return res.status(403).json({
          error: "No autorizado para esta empresa",
        });
      }
    }

    // 3. Validar estructura de datos
    for (const d of distribucion) {
      if (!d.idEmpresa || typeof d.cantidad !== "number" || d.cantidad < 0) {
        return res.status(400).json({
          error: "Datos inválidos en distribución",
        });
      }
    }

    // 4. Validar que las empresas pertenezcan al padre
    const empresasValidas = await pool
      .request()
      .input("empresaPadre", sql.Int, empresaPadre).query(`
        SELECT idEmpresa
        FROM Empresas
        WHERE idEmpresa = @empresaPadre
           OR idEmpresaPadre = @empresaPadre
      `);

    const idsValidos = empresasValidas.recordset.map((e) => e.idEmpresa);

    for (const d of distribucion) {
      if (!idsValidos.includes(d.idEmpresa)) {
        return res.status(403).json({
          error: "Empresa no válida en la distribución",
        });
      }
    }

    // 5. Validar suma total
    const suma = distribucion.reduce((acc, d) => acc + d.cantidad, 0);

    if (suma > total) {
      return res.status(400).json({
        error: "La distribución excede el total de licencias",
      });
    }

    // 🔥 6. TRANSACTION (CLAVE)
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // limpiar anterior
      await new sql.Request(transaction).input(
        "idLicencia",
        sql.Int,
        idLicencia,
      ).query(`
          DELETE FROM LicenciasDistribucion
          WHERE idLicencia = @idLicencia
        `);

      // insertar nueva
      for (const d of distribucion) {
        await new sql.Request(transaction)
          .input("idLicencia", sql.Int, idLicencia)
          .input("idEmpresa", sql.Int, d.idEmpresa)
          .input("cantidad", sql.Int, d.cantidad).query(`
            INSERT INTO LicenciasDistribucion
            (idLicencia, idEmpresa, cantidadAsignada)
            VALUES (@idLicencia, @idEmpresa, @cantidad)
          `);
      }

      await transaction.commit();

      res.json({
        ok: true,
        message: "Distribución guardada correctamente",
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("ERROR DISTRIBUCIÓN:", err);
    res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});
app.get(
  "/api/licencias/distribucion/:idLicencia",
  verifyToken,
  async (req, res) => {
    const { idLicencia } = req.params;

    try {
      await poolConnect;

      const result = await pool
        .request()
        .input("idLicencia", sql.Int, idLicencia).query(`
        SELECT 
          ld.idEmpresa,
          e.razonSocial,
          ld.cantidadAsignada
        FROM LicenciasDistribucion ld
        JOIN Empresas e ON e.idEmpresa = ld.idEmpresa
        WHERE ld.idLicencia = @idLicencia
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener distribución" });
    }
  },
);
app.get(
  "/api/licencias/disponibles/:idEmpresa",
  verifyToken,
  async (req, res) => {
    const { idEmpresa } = req.params;

    try {
      await poolConnect;

      // 1. TRAER LICENCIA REAL
      const lic = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
        .query(`
          SELECT TOP 1 idLicencia, cantidadUsuarios
          FROM Licencias
          WHERE idEmpresa = @idEmpresa
            AND activo = 1
          ORDER BY fechaInicio DESC
        `);

      if (lic.recordset.length === 0) {
        return res.json({
          total: 0,
          distribuido: 0,
          usados: 0,
          disponibles: 0,
        });
      }

      const total = lic.recordset[0].cantidadUsuarios;
      const idLicencia = lic.recordset[0].idLicencia;

      // 2. DISTRIBUCIÓN (puede ser 0)
      const dist = await pool.request().input("idLicencia", sql.Int, idLicencia)
        .query(`
          SELECT ISNULL(SUM(cantidadAsignada),0) as distribuido
          FROM LicenciasDistribucion
          WHERE idLicencia = @idLicencia
        `);

      const distribuido = dist.recordset[0].distribuido;

      // 3. USO REAL
      const usados = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
        .query(`
          SELECT COUNT(*) as usados
          FROM usuarios_login u
          JOIN Personas p ON p.idPersona = u.idPersona
          WHERE p.idEmpresa = @idEmpresa
            AND u.is_active = 1
        `);

      const usadosCount = usados.recordset[0].usados;

      // 4. DISPONIBLE REAL
      const disponibles = total - distribuido;

      res.json({
        total,
        distribuido,
        usados: usadosCount,
        disponibles,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Error calculando licencias",
      });
    }
  },
);
app.get("/api/licencias/empresa/:idEmpresa", verifyToken, async (req, res) => {
  const { idEmpresa } = req.params;

  try {
    await poolConnect;

    const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
      .query(`
          SELECT TOP 1 *
          FROM Licencias
          WHERE idEmpresa = @idEmpresa
            AND activo = 1
          ORDER BY fechaInicio DESC
        `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: "No hay licencia activa para esta empresa",
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener licencia",
    });
  }
});
app.get(
  "/api/licencias/validar-uso/:idEmpresa",
  verifyToken,
  async (req, res) => {
    const { idEmpresa } = req.params;

    try {
      await poolConnect;

      // 1. Licencia directa
      let totalPermitido = 0;
      const distribucion = await pool
        .request()
        .input("idEmpresa", sql.Int, idEmpresa).query(`
    SELECT TOP 1
      ld.cantidadAsignada
    FROM LicenciasDistribucion ld

    INNER JOIN Licencias l
      ON l.idLicencia = ld.idLicencia

    WHERE ld.idEmpresa = @idEmpresa
      AND l.activo = 1
      AND GETDATE()
          BETWEEN l.fechaInicio AND l.fechaFin
  `);

      // 🔥 SI EXISTE DISTRIBUCIÓN
      if (distribucion.recordset.length > 0) {
        totalPermitido = distribucion.recordset[0].cantidadAsignada;
      } else {
        // 🔥 LICENCIA DIRECTA
        const licDirecta = await pool
          .request()
          .input("idEmpresa", sql.Int, idEmpresa).query(`
      SELECT TOP 1
        cantidadUsuarios
      FROM Licencias
      WHERE idEmpresa = @idEmpresa
        AND activo = 1
        AND GETDATE()
            BETWEEN fechaInicio AND fechaFin
    `);

        totalPermitido = licDirecta.recordset[0]?.cantidadUsuarios || 0;
      }
      const usuarios = await pool
        .request()
        .input("idEmpresa", sql.Int, idEmpresa).query(`
    SELECT COUNT(*) as total

    FROM LicenciasUsuarios lu

    INNER JOIN usuarios_login ul
      ON ul.id = lu.idUsuario

    INNER JOIN Personas p
      ON p.idPersona = ul.idPersona

    WHERE p.idEmpresa = @idEmpresa
      AND lu.activo = 1
`);

      const usados = usuarios.recordset[0].total;

      res.json({
        total: totalPermitido,
        usados,
        disponibles: totalPermitido - usados,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Error validando licencias",
      });
    }
  },
);
app.post("/api/usuarios-con-licencia", verifyToken, async (req, res) => {
  const {
    nombre,
    idArea,
    idRol,
    username,
    email,
    password,
    activo,
    idEmpresa,
  } = req.body;

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const idEmpresaFinal = Number(idEmpresa);

    // 🔥 1. VALIDAR LICENCIA
    let totalPermitido = 0;

    const licDirecta = await transaction
      .request()
      .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
        SELECT TOP 1 cantidadUsuarios
        FROM Licencias
        WHERE idEmpresa = @idEmpresa
          AND activo = 1
          AND GETDATE() BETWEEN fechaInicio AND fechaFin
      `);

    if (licDirecta.recordset.length > 0) {
      totalPermitido = licDirecta.recordset[0].cantidadUsuarios;
    } else {
      const licDistribuida = await transaction
        .request()
        .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
          SELECT ISNULL(SUM(ld.cantidadAsignada), 0) as total
          FROM LicenciasDistribucion ld
          JOIN Licencias l ON l.idLicencia = ld.idLicencia
          WHERE ld.idEmpresa = @idEmpresa
            AND l.activo = 1
            AND GETDATE() BETWEEN l.fechaInicio AND l.fechaFin
        `);

      totalPermitido = licDistribuida.recordset[0].total;
    }

    if (totalPermitido === 0) {
      throw new Error("Empresa sin licencias asignadas");
    }

    // 🔥 2. USUARIOS ACTUALES
    const usuarios = await transaction
      .request()
      .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
        SELECT COUNT(*) as total
        FROM Personas
        WHERE idEmpresa = @idEmpresa
          AND activo = 1
      `);

    const usados = usuarios.recordset[0].total;

    if (usados >= totalPermitido) {
      throw new Error("Límite de licencias alcanzado");
    }

    // 🔥 3. CREAR USUARIO
    const hash = await bcrypt.hash(password, 10);

    const personaRes = await transaction
      .request()
      .input("nombre", sql.VarChar, nombre)
      .input("idArea", sql.Int, idArea || null)
      .input("idRol", sql.Int, idRol)
      .input("idEmpresa", sql.Int, idEmpresaFinal)
      .input("activo", sql.Bit, activo ? 1 : 0).query(`
        INSERT INTO Personas (nombre, idArea, idRol, idEmpresa, activo)
        VALUES (@nombre, @idArea, @idRol, @idEmpresa, @activo);
        SELECT SCOPE_IDENTITY() AS idPersona;
      `);

    const idPersona = personaRes.recordset[0].idPersona;

    // await transaction
    //   .request()
    //   .input("username", sql.NVarChar, username)
    //   .input("email", sql.NVarChar, email)
    //   .input("password_hash", sql.NVarChar, hash)
    //   .input("is_active", sql.Bit, activo ? 1 : 0)
    //   .input("idPersona", sql.Int, idPersona)
    //   .input("idNivelAcceso", sql.Int, 3).query(`
    //     INSERT INTO usuarios_login
    //     (username, email, password_hash, is_active, is_verified, idPersona, idNivelAcceso, created_at)
    //     VALUES
    //     (@username, @email, @password_hash, @is_active, 1, @idPersona, @idNivelAcceso, GETDATE())
    //   `);
    const userRes = await transaction
      .request()
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .input("password_hash", sql.NVarChar, hash)
      .input("is_active", sql.Bit, activo ? 1 : 0)
      .input("idPersona", sql.Int, idPersona)
      .input("idNivelAcceso", sql.Int, 3).query(`
    INSERT INTO usuarios_login 
    (
      username,
      email,
      password_hash,
      is_active,
      is_verified,
      idPersona,
      idNivelAcceso,
      created_at
    )
    VALUES 
    (
      @username,
      @email,
      @password_hash,
      @is_active,
      1,
      @idPersona,
      @idNivelAcceso,
      GETDATE()
    );

    SELECT SCOPE_IDENTITY() AS idUsuario;
  `);

    const idUsuario = userRes.recordset[0].idUsuario;
    // 🔥 OBTENER LICENCIA DE LA EMPRESA

    let idLicencia = null;

    // LICENCIA DIRECTA
    const licDirectaUsuario = await transaction
      .request()
      .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
    SELECT TOP 1 idLicencia
    FROM Licencias
    WHERE idEmpresa = @idEmpresa
      AND activo = 1
      AND GETDATE() BETWEEN fechaInicio AND fechaFin
  `);

    if (licDirectaUsuario.recordset.length > 0) {
      idLicencia = licDirectaUsuario.recordset[0].idLicencia;
    } else {
      // LICENCIA DISTRIBUIDA
      const licDistribuidaUsuario = await transaction
        .request()
        .input("idEmpresa", sql.Int, idEmpresaFinal).query(`
      SELECT TOP 1 ld.idLicencia
      FROM LicenciasDistribucion ld
      JOIN Licencias l
        ON l.idLicencia = ld.idLicencia
      WHERE ld.idEmpresa = @idEmpresa
        AND l.activo = 1
        AND GETDATE() BETWEEN l.fechaInicio AND l.fechaFin
    `);

      if (licDistribuidaUsuario.recordset.length > 0) {
        idLicencia = licDistribuidaUsuario.recordset[0].idLicencia;
      }
    }

    // ASIGNAR LICENCIA AL USUARIO

    if (idLicencia) {
      await transaction
        .request()
        .input("idLicencia", sql.Int, idLicencia)
        .input("idUsuario", sql.Int, idUsuario)
        .input("activo", sql.Bit, 1).query(`
      INSERT INTO LicenciasUsuarios
      (
        idLicencia,
        idUsuario,
        fechaAsignacion,
        activo
      )
      VALUES
      (
        @idLicencia,
        @idUsuario,
        GETDATE(),
        @activo
      )
    `);
    }
    // 🔥 4. OBTENER DATOS PARA UI
    const empresaRes = await transaction
      .request()
      .input("idEmpresa", sql.Int, idEmpresaFinal)
      .query(`SELECT razonSocial FROM Empresas WHERE idEmpresa = @idEmpresa`);

    const rolRes = await transaction
      .request()
      .input("idRol", sql.Int, idRol)
      .query(`SELECT nombre FROM Roles WHERE idRol = @idRol`);

    await transaction.commit();

    res.json({
      ok: true,
      user: {
        idPersona,
        nombre,
        username,
        email,
        idEmpresa: idEmpresaFinal,
        empresa: empresaRes.recordset[0]?.razonSocial,
        rol: rolRes.recordset[0]?.nombre,
        activo: true,
      },
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
});

//!
//Registrar usuarios como SUPER_ADMIN
app.post("/api/admin/usuarios", verifyToken, async (req, res) => {
  const { username, password, email, idEmpresa, idRol, nombre } = req.body;

  try {
    // 🔐 SOLO SUPER ADMIN
    if (req.user.idNivelAcceso !== 1) {
      return res.status(403).json({ error: "No autorizado" });
    }

    // 🔒 Hash password
    const hash = await bcrypt.hash(password, 10);

    // 🧱 1. Crear PERSONA
    const personaResult = await pool
      .request()
      .input("nombre", sql.VarChar, nombre)
      .input("idEmpresa", sql.Int, idEmpresa)
      .input("idRol", sql.Int, idRol).query(`
        INSERT INTO Personas (nombre, idEmpresa, idRol, activo)
        OUTPUT INSERTED.idPersona
        VALUES (@nombre, @idEmpresa, @idRol, 1)
      `);

    const idPersona = personaResult.recordset[0].idPersona;

    // 🔐 2. Obtener idNivelAcceso ADMIN_EMPRESA
    const nivel = await pool.request().query(`
      SELECT idNivelAcceso 
      FROM niveles_acceso 
      WHERE nombre = 'ADMIN_EMPRESA'
    `);

    const idNivelAcceso = nivel.recordset[0].idNivelAcceso;

    // 👤 3. Crear USUARIO LOGIN
    await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("email", sql.VarChar, email)
      .input("password_hash", sql.VarChar, hash)
      .input("idPersona", sql.Int, idPersona)
      .input("idNivelAcceso", sql.Int, idNivelAcceso).query(`
        INSERT INTO usuarios_login 
        (username, email, password_hash, idPersona, idNivelAcceso, is_active, is_verified)
        VALUES 
        (@username, @email, @password_hash, @idPersona, @idNivelAcceso, 1, 1)
      `);

    res.json({ ok: true, message: "Admin empresa creado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// REGISTRAR ÁREA
app.post("/api/areas", verifyToken, async (req, res) => {
  try {
    const { Nombre, idEmpresa } = req.body;
    // Empresa usuario
    const idEmpresaUsuario = req.user.idEmpresa;

    // Obtener empresa base
    const idEmpresaBase = await obtenerEmpresaBase(idEmpresaUsuario);

    // Validación simple para evitar errores de SQL
    if (!Nombre || !idEmpresa) {
      return res
        .status(400)
        .json({ error: "Faltan datos: Nombre o idEmpresa" });
    }

    await poolConnect;
    await pool
      .request()
      // .input("idEmpresa", sql.Int, idEmpresa)
      .input("idEmpresa", sql.Int, idEmpresaBase)
      .input("Nombre", sql.NVarChar, Nombre)
      .query(
        "INSERT INTO Areas (Nombre, idEmpresa) VALUES (@Nombre, @idEmpresa)",
      );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// ELIMINAR ÁREA
app.delete(
  "/api/empresas/:idEmpresa/areas/:idArea",
  verifyToken,
  async (req, res) => {
    try {
      const { idEmpresa, idArea } = req.params;

      await poolConnect;
      await pool
        .request()
        .input("idEmpresa", sql.Int, idEmpresa)
        .input("idArea", sql.Int, idArea)
        .query(
          "DELETE FROM Areas WHERE idArea = @idArea AND idEmpresa = @idEmpresa",
        );

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
//REGISTRAR RIESGOS
// --- MATRIZ DE PELIGROS ---
app.get("/api/riesgos-peligro", verifyToken, async (req, res) => {
  try {
    const idEmpresaUsuario = req.user.idEmpresa;

    const idEmpresaBase = await obtenerEmpresaBase(idEmpresaUsuario);

    // const { idEmpresa } = req.query;
    await poolConnect; // Asegura la conexión
    const result = await pool
      .request()
      // .input("idEmpresa", sql.Int, idEmpresa)
      .input("idEmpresa", sql.Int, idEmpresaBase)
      // Cambio: tabla 'riesgosPeligro'
      .query("SELECT * FROM riesgosPeligro WHERE idEmpresa = @idEmpresa");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/riesgos-peligro", verifyToken, async (req, res) => {
  try {
    // CAMBIO: Sacarlo de req.body (lo que envía el frontend)
    const { Peligro, idEmpresa } = req.body;

    await poolConnect;
    await pool
      .request()
      .input("tipoPeligro", sql.VarChar, Peligro)
      .input("idEmpresa", sql.Int, idEmpresa) // Ahora sí usará el ID de la empresa elegida
      .query(
        "INSERT INTO riesgosPeligro (tipoPeligro, idEmpresa) VALUES (@tipoPeligro, @idEmpresa)",
      );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS PARA JERARQUÍA ---
app.get("/api/riesgos-jerarquia", verifyToken, async (req, res) => {
  try {
    // const { idEmpresa } = req.query;
    const idEmpresaUsuario = req.user.idEmpresa;

    const idEmpresaBase = await obtenerEmpresaBase(idEmpresaUsuario);
    await poolConnect;
    const result = await pool
      .request()
      // .input("idEmpresa", sql.Int, idEmpresa)
      .input("idEmpresa", sql.Int, idEmpresaBase)
      // Cambio: tabla 'riesgosJerarquia'
      .query(
        "SELECT * FROM riesgosJerarquia WHERE idEmpresa = @idEmpresa ORDER BY idJerarquia ASC",
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/riesgos-jerarquia", verifyToken, async (req, res) => {
  try {
    // CAMBIO: Sacamos idEmpresa del body, igual que en Peligros
    const { tipoJerarquia, idEmpresa } = req.body;

    await poolConnect;
    await pool
      .request()
      .input("tipoJerarquia", sql.VarChar, tipoJerarquia)
      .input("idEmpresa", sql.Int, idEmpresa) // <--- Ahora usará el que envías desde el frontend
      .query(
        "INSERT INTO riesgosJerarquia (tipoJerarquia, idEmpresa) VALUES (@tipoJerarquia, @idEmpresa)",
      );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear una nueva empresa
app.post("/api/admin/empresas", verifyToken, async (req, res) => {
  const { nombre, ruc, direccion, idUsuarioAdmin } = req.body;

  try {
    await poolConnect;

    // 🔒 SOLO SUPER ADMIN
    if (req.user.idNivelAcceso !== 1) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!nombre || !ruc) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    // 1. Crear empresa
    const result = await pool
      .request()
      .input("razonSocial", sql.NVarChar(200), nombre)
      .input("ruc", sql.NVarChar(20), ruc)
      .input("direccion", sql.NVarChar(200), direccion).query(`
        INSERT INTO Empresas (razonSocial, ruc, activo, fechaRegistro, direccion, idEmpresaPadre)
        OUTPUT INSERTED.idEmpresa
        VALUES (@razonSocial, @ruc, 1, GETDATE(), @direccion, NULL)
      `);

    const idEmpresa = result.recordset[0].idEmpresa;

    // 2. Asignar ADMIN_EMPRESA
    if (idUsuarioAdmin) {
      await pool.request().input("idUsuario", sql.Int, idUsuarioAdmin).query(`
          UPDATE u
          SET u.idNivelAcceso = 2
          FROM usuarios_login u
          WHERE u.id = @idUsuario
        `);

      await pool
        .request()
        .input("idUsuario", sql.Int, idUsuarioAdmin)
        .input("idEmpresa", sql.Int, idEmpresa).query(`
          UPDATE p
          SET p.idEmpresa = @idEmpresa
          FROM Personas p
          INNER JOIN usuarios_login u ON u.idPersona = p.idPersona
          WHERE u.id = @idUsuario
        `);
    }

    res.json({ ok: true, idEmpresa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/admin/usuarios", verifyToken, async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT id, email
      FROM usuarios_login
      WHERE nivel_acceso = 'ADMIN_EMPRESA'
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/empresas", verifyToken, async (req, res) => {
  const { nombre, ruc, direccion } = req.body; // 'nombre' viene del frontend como 'razonSocial'

  if (!nombre || !ruc || !direccion) {
    return res
      .status(400)
      .json({ error: "Razón Social y RUC son obligatorios." });
  }

  try {
    await poolConnect;
    await // Si tienes columna direccion, agrégala aquí, si no, omítela
    pool
      .request()
      .input("razonSocial", sql.NVarChar(200), nombre)
      .input("ruc", sql.NVarChar(20), ruc)
      .input("direccion", sql.NVarChar(200), direccion).query(`
        INSERT INTO Empresas (razonSocial, ruc, activo, fechaRegistro, direccion)
        VALUES (@razonSocial, @ruc, 1, GETDATE(),@direccion)
      `);

    res.json({ ok: true, message: "Empresa registrada con éxito" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Error al registrar la empresa en la base de datos" });
  }
});

// administradorEmpresa
app.post("/api/administrador/empresas", verifyToken, async (req, res) => {
  const { nombre, ruc, direccion } = req.body;

  if (!nombre || !ruc) {
    return res.status(400).json({
      error: "Razón Social y RUC son obligatorios.",
    });
  }

  try {
    await poolConnect;

    let idEmpresaPadre = null;

    // 🔐 ADMIN_EMPRESA → crear subempresa
    if (req.user.idNivelAcceso === 2) {
      idEmpresaPadre = req.user.idEmpresa;
    }

    await pool
      .request()
      .input("razonSocial", sql.NVarChar(200), nombre)
      .input("ruc", sql.NVarChar(20), ruc)
      .input("direccion", sql.NVarChar(200), direccion)
      .input("idEmpresaPadre", sql.Int, idEmpresaPadre).query(`
        INSERT INTO Empresas 
        (razonSocial, ruc, activo, fechaRegistro, direccion, idEmpresaPadre)
        VALUES 
        (@razonSocial, @ruc, 1, GETDATE(), @direccion, @idEmpresaPadre)
      `);

    res.json({ ok: true, message: "Empresa creada correctamente" });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//ADMINISTRADOR SUPERADMIN

app.get(
  "/api/admin/empresas/:idEmpresa/roles-modulos",
  verifyToken,
  async (req, res) => {
    const { idEmpresa } = req.params;

    try {
      const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
        .query(`
        SELECT 
          r.idRol,
          r.nombre AS rol,
          m.idModulo,
          m.nombre AS modulo,
          m.ruta,
          ISNULL(rme.activo, 0) AS activo
        FROM Roles r
        CROSS JOIN Modulos m
        LEFT JOIN RolesModulosEmpresa rme 
          ON rme.idRol = r.idRol 
          AND rme.idModulo = m.idModulo
          AND rme.idEmpresa = @idEmpresa
        ORDER BY r.nombre, m.nombre
      `);

      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.post("/api/admin/roles-modulos/toggle", verifyToken, async (req, res) => {
  const { idRol, idModulo, idEmpresa } = req.body;

  try {
    await pool
      .request()
      .input("idRol", sql.Int, idRol)
      .input("idModulo", sql.Int, idModulo)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        MERGE RolesModulosEmpresa AS target
        USING (SELECT @idRol idRol, @idModulo idModulo, @idEmpresa idEmpresa) AS source
        ON target.idRol = source.idRol 
          AND target.idModulo = source.idModulo
          AND target.idEmpresa = source.idEmpresa
        WHEN MATCHED THEN
          UPDATE SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
        WHEN NOT MATCHED THEN
          INSERT (idRol, idModulo, idEmpresa, activo)
          VALUES (@idRol, @idModulo, @idEmpresa, 1);
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(
  "/api/admin/empresas/:idEmpresa/usuarios-permisos",
  verifyToken,
  async (req, res) => {
    const { idEmpresa } = req.params;

    try {
      const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
        .query(`
        SELECT 
          p.idPersona,
          p.nombre,
          p.email,
          p.activo,

          r.idRol,
          r.nombre AS rol,

          -- MÓDULOS CALCULADOS
          STRING_AGG(
            CASE 
              WHEN rme.activo IS NOT NULL AND rme.activo = 1 THEN m.nombre
              WHEN rme.activo IS NULL AND rm.idModulo IS NOT NULL THEN m.nombre
            END, ', '
          ) AS modulos_nombres

        FROM Personas p

        LEFT JOIN Roles r ON r.idRol = p.idRol

        LEFT JOIN RolesModulos rm 
          ON rm.idRol = r.idRol

        LEFT JOIN Modulos m 
          ON m.idModulo = rm.idModulo

        LEFT JOIN RolesModulosEmpresa rme
          ON rme.idRol = r.idRol 
          AND rme.idModulo = m.idModulo
          AND rme.idEmpresa = @idEmpresa

        WHERE p.idEmpresa = @idEmpresa

        GROUP BY 
          p.idPersona,
          p.nombre,
          p.email,
          p.activo,
          r.idRol,
          r.nombre
      `);

      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.get(
  "/api/admin/empresas/:idEmpresa/personas-roles",
  verifyToken,
  async (req, res) => {
    const { idEmpresa } = req.params;

    try {
      const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
        .query(`
        SELECT 
          p.idPersona,
          p.nombre,
          r.idRol,
          r.nombre AS rol
        FROM PersonaEmpresaRol per
        JOIN Personas p ON p.idPersona = per.idPersona
        JOIN Roles r ON r.idRol = per.idRol
        WHERE per.idEmpresa = @idEmpresa
      `);

      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.post("/api/admin/persona-rol", verifyToken, async (req, res) => {
  const { idPersona, idEmpresa, idRol } = req.body;

  try {
    await pool
      .request()
      .input("idPersona", sql.Int, idPersona)
      .input("idEmpresa", sql.Int, idEmpresa)
      .input("idRol", sql.Int, idRol).query(`
        MERGE PersonaEmpresaRol AS target
        USING (SELECT @idPersona AS idPersona, @idEmpresa AS idEmpresa) AS source
        ON target.idPersona = source.idPersona AND target.idEmpresa = source.idEmpresa
        WHEN MATCHED THEN
          UPDATE SET idRol = @idRol
        WHEN NOT MATCHED THEN
          INSERT (idPersona, idEmpresa, idRol)
          VALUES (@idPersona, @idEmpresa, @idRol);
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/persona-rol/estado", async (req, res) => {
  const { idPersona, idEmpresa } = req.body;

  try {
    await pool
      .request()
      .input("idPersona", sql.Int, idPersona)
      .input("idEmpresa", sql.Int, idEmpresa).query(`
        UPDATE PersonaEmpresaRol
        SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
        WHERE idPersona = @idPersona AND idEmpresa = @idEmpresa
      `);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULO REPORTES (HSE)
function buildEmpresaFilter(idNivelAcceso) {
  if (idNivelAcceso === 1) {
    return {
      cte: "",
      filtro: "",
      useFilter: false,
    };
  }

  return {
    cte: `
      WITH EmpresasCTE AS (
        SELECT idEmpresa FROM Empresas WHERE idEmpresa = @idEmpresa
        UNION ALL
        SELECT e.idEmpresa
        FROM Empresas e
        INNER JOIN EmpresasCTE cte 
          ON e.idEmpresaPadre = cte.idEmpresa
      )
    `,
    filtro: `WHERE X.idEmpresa IN (SELECT idEmpresa FROM EmpresasCTE)`,
    useFilter: true,
  };
}
async function runQuery({
  table,
  alias,
  idEmpresa,
  useFilter,
  cte,
  filtro,
  orderBy = "id", // 👈 default
}) {
  const request = pool.request();

  if (useFilter) {
    request.input("idEmpresa", sql.Int, idEmpresa);
  }

  const result = await request.query(`
    ${cte}
    SELECT ${alias}.*, e.razonSocial AS nombreEmpresa
    FROM ${table} ${alias}
    LEFT JOIN Empresas e ON ${alias}.idEmpresa = e.idEmpresa
    ${filtro.replace("X", alias)}
    ORDER BY ${alias}.${orderBy} DESC
  `);

  return result.recordset;
}
app.get("/api/reportes/seguridad", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idEmpresa, idNivelAcceso } = req.user;
    const { cte, filtro, useFilter } = buildEmpresaFilter(idNivelAcceso);

    const incidentes = await runQuery({
      table: "Incidentes",
      alias: "i",
      idEmpresa,
      useFilter,
      cte,
      filtro,
      orderBy: "Id", // ⚠️ revisa si es Id o id
    });

    const riesgos = await runQuery({
      table: "Riesgos",
      alias: "r",
      idEmpresa,
      useFilter,
      cte,
      filtro,
      orderBy: "id",
    });

    const inspecciones = await runQuery({
      table: "Inspeccion",
      alias: "ins",
      idEmpresa,
      useFilter,
      cte,
      filtro,
      orderBy: "idInspeccion", // 🔥 FIX
    });

    const capacitaciones = await runQuery({
      table: "Capacitaciones",
      alias: "c",
      idEmpresa,
      useFilter,
      cte,
      filtro,
      orderBy: "idCapacitacion", // 🔥 FIX
    });

    res.json({ incidentes, riesgos, inspecciones, capacitaciones });
  } catch (err) {
    console.error("ERROR SEGURIDAD:", err);
    res.status(500).json({ error: "Error en reportes seguridad" });
  }
});
app.get("/api/reportes/ambiental", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idEmpresa, idNivelAcceso } = req.user;
    const { cte, filtro, useFilter } = buildEmpresaFilter(idNivelAcceso);

    const importaciones = await runQuery({
      table: "Env_Importaciones",
      alias: "i",
      idEmpresa,
      useFilter,
      cte,
      filtro,
      orderBy: "idImportacion", // 👈 FIX
    });

    const muestras = await runQuery({
      table: "Env_Muestras",
      alias: "m",
      idEmpresa,
      useFilter,
      cte,
      filtro,
      orderBy: "idMuestra", // 👈 FIX
    });

    res.json({ importaciones, muestras });
  } catch (err) {
    console.error("ERROR AMBIENTAL:", err);
    res.status(500).json({ error: "Error en reportes ambiental" });
  }
});
app.get("/api/reportes/residuos", verifyToken, async (req, res) => {
  try {
    await poolConnect;

    const { idEmpresa, idNivelAcceso } = req.user;
    const { cte, filtro, useFilter } = buildEmpresaFilter(idNivelAcceso);

    const registros = await runQuery({
      table: "Residuos_Registros",
      alias: "r",
      idEmpresa,
      useFilter,
      cte,
      filtro,
    });

    const documentos = await runQuery({
      table: "Residuos_Documentos",
      alias: "d",
      idEmpresa,
      useFilter,
      cte,
      filtro,
    });

    res.json({ registros, documentos });
  } catch (err) {
    console.error("ERROR RESIDUOS:", err);
    res.status(500).json({ error: "Error en reportes residuos" });
  }
});

// CONFIGURACION DEL ADMINISTRADOR EMPRESA
async function obtenerEmpresaBase(idEmpresa) {
  await poolConnect;

  const result = await pool.request().input("idEmpresa", sql.Int, idEmpresa)
    .query(`
      SELECT idEmpresaPadre
      FROM Empresas
      WHERE idEmpresa = @idEmpresa
    `);

  const empresa = result.recordset[0];

  // Si es subempresa -> usar padre
  if (empresa?.idEmpresaPadre) {
    return empresa.idEmpresaPadre;
  }

  // Si es empresa principal
  return idEmpresa;
}

/* ============================
   INICIO DEL SERVIDOR
============================ */

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
