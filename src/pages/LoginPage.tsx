// M03.F01.I01 — 账号密码登录（独立布局：登录页绕过 AppShell）
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/state/tenant-context";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setTenant } = useTenant();
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTenant("00000000-0000-0000-0000-000000000001", "acme", "mock-jwt-token");
    navigate("/tenants");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-slate-900 flex items-center justify-center">
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-lg">SaaS IAM</CardTitle>
          </div>
          <CardDescription>使用账号密码登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice@acme.io"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" data-fn="M03.F01.I01">
              <LogIn className="h-4 w-4 mr-2" />
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
