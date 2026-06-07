import { LoginForm } from "./LoginForm";
import { getLineConfig } from "@/lib/line/config";

export default function LoginPage() {
  const { enabled: lineEnabled } = getLineConfig();
  return <LoginForm lineEnabled={lineEnabled} />;
}
