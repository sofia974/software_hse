// Script temporal para generar un hash bcrypt
// Uso: node backend/gen-hash.js tuContraseña
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) { console.error("Uso: node backend/gen-hash.js <contraseña>"); process.exit(1); }

const hash = await bcrypt.hash(password, 12);
console.log("\nHash bcrypt generado:");
console.log(hash);
console.log("\nEjecuta en SQL Server:");
console.log(`UPDATE usuarios_login SET password_hash = '${hash}' WHERE username = 'admin';`);
