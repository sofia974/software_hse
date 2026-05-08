import { sql, pool, poolConnect } from "./db.js";
import bcrypt from "bcryptjs";

async function crearUsuarioAdmin() {
  try {
    // 1. Esperar conexión a la base de datos
    await poolConnect;
    console.log("✅ Conectado a la base de datos");

    const email = "administrador@gmail.com";
    const username = "administrador";
    const passwordPlano = "admin123"; // Esta será tu clave
    const idPersona = 5; // El ID que ya tienes

    // 2. Generar el Hash correctamente con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordPlano, salt);

    // 3. Insertar o Actualizar en la base de datos
    // Usamos un query que primero intenta actualizar y si no existe inserta
    const query = `
      IF EXISTS (SELECT 1 FROM usuarios_login WHERE email = @email)
      BEGIN
          UPDATE usuarios_login 
          SET password_hash = @hash, 
              is_active = 1, 
              is_verified = 1, 
              idPersona = @idPersona,
              updated_at = GETDATE()
          WHERE email = @email
          PRINT 'Usuario actualizado'
      END
      ELSE
      BEGIN
          INSERT INTO usuarios_login 
          (email, username, password_hash, is_active, is_verified, failed_login_attempts, created_at, updated_at, idPersona)
          VALUES 
          (@email, @username, @hash, 1, 1, 0, GETDATE(), GETDATE(), @idPersona)
          PRINT 'Usuario creado'
      END
    `;

    await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("username", sql.NVarChar, username)
      .input("hash", sql.NVarChar, hash)
      .input("idPersona", sql.Int, idPersona)
      .query(query);

    console.log("------------------------------------------");
    console.log("🚀 ¡PROCESO COMPLETADO!");
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Usuario: ${username}`);
    console.log(`🔑 Password: ${passwordPlano}`);
    console.log("------------------------------------------");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error generando el usuario:", err);
    process.exit(1);
  }
}

crearUsuarioAdmin();
