import { redirect } from "next/navigation";

// El gate de middleware ya exige sesión; la raíz lleva al área activa.
export default function RootPage() {
  redirect("/areas");
}
