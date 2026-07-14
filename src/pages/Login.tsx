import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { BookOpen, Smartphone, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      console.log("[Login] onSuccess:", data);
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.message);
      }
    },
    onError: (err) => {
      console.error("[Login] onError:", err);
      setError(err.message || "登录失败，请检查网络");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      console.log("[Register] onSuccess:", data);
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.message);
      }
    },
    onError: (err) => {
      console.error("[Register] onError:", err);
      setError(err.message || "注册失败，请检查网络");
    },
  });

  const handleSubmit = () => {
    setError("");

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的11位手机号");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (password.length < 6) {
      setError("密码至少6位字符");
      return;
    }

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      registerMutation.mutate({
        phone,
        password,
        name: name || undefined,
      });
    } else {
      loginMutation.mutate({ phone, password });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "欢迎使用 WordMind" : "注册新账号"}
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              {mode === "login"
                ? "登录后可跨设备同步单词数据"
                : "注册后即可开始记录单词"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm">手机号</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 11));
                  setError("");
                }}
                placeholder="请输入手机号"
                className="h-11 pl-10"
                maxLength={11}
              />
            </div>
          </div>

          {/* Nickname (register only) */}
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label className="text-sm">昵称（可选）</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="给自己起个名字"
                  className="h-11 pl-10"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-sm">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={mode === "register" ? "设置密码（至少6位）" : "请输入密码"}
                className="h-11 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label className="text-sm">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="再次输入密码"
                  className="h-11 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full h-11 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "login" ? (
              "登录"
            ) : (
              "注册"
            )}
          </Button>

          {/* Toggle mode */}
          <div className="text-center text-sm">
            {mode === "login" ? (
              <span className="text-gray-500">
                还没有账号？
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium ml-1"
                >
                  立即注册
                </button>
              </span>
            ) : (
              <span className="text-gray-500">
                已有账号？
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setConfirmPassword("");
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium ml-1"
                >
                  去登录
                </button>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
