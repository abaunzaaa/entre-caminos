import { createAdminSchema } from "../src/validators/admin.validator.js";
import { loginSchema } from "../src/validators/auth.validator.js";

const email = "cabalgatamontaña@entrecaminos.com";
const created = createAdminSchema.safeParse({
  name: "Cabalgata",
  email,
  password: "Prueba123!",
  role: "ADMIN",
});
const login = loginSchema.safeParse({ email, password: "x" });
const rejected = createAdminSchema.safeParse({
  name: "Cabalgata",
  email: "no-es-correo",
  password: "Prueba123!",
  role: "ADMIN",
});
console.log(
  JSON.stringify({
    admin: created.success ? created.data.email : created.error.issues,
    login: login.success ? login.data.email : login.error.issues,
    rejected: rejected.success,
  }),
);
