import postgres from "postgres";

//conexion a la base de datos foodservice
const dbConnect = postgres('postgres://pablo:yAR65sPOmUqYV8mfdqA95PivvLSvUPvE@dpg-covo8hi1hbls73du8670-a.oregon-postgres.render.com/post_qhr1',{
   ssl: {
    // Habilitar SSL
      rejectUnauthorized: false // Configura para aceptar certificados autofirmados, en producción, usa certificados de confianza
    }
});

//const dbConnect = postgres ('postgres://postgres:pablo@localhost:5432/restaurante');

export default dbConnect;