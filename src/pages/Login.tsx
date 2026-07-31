import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { rawTrpcCall } from "@/utils/raw-trpc";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (input: { name: string; password: string }) =>
      rawTrpcCall<{ success: boolean; message: string }>("auth.login", {
        method: "POST",
        input,
      }),
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.message);
      }
    },
    onError: (err) => {
      setError(err.message || "登录失败，请检查网络");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (input: { name: string; password: string }) =>
      rawTrpcCall<{ success: boolean; message: string }>("auth.register", {
        method: "POST",
        input,
      }),
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.message);
      }
    },
    onError: (err) => {
      setError(err.message || "注册失败，请检查网络");
    },
  });

  const handleSubmit = () => {
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入昵称");
      return;
    }
    if (trimmedName.length > 20) {
      setError("昵称最多20个字符");
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
        name: trimmedName,
        password,
      });
    } else {
      loginMutation.mutate({ name: trimmedName, password });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-6">
          <img
            src="/icon-192.png"
            alt="词音岛"
            className="mx-auto h-16 w-16 rounded-2xl shadow-lg"
          />
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "欢迎来到词音岛" : "注册新账号"}
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              {mode === "login"
                ? "听音、拼读、拼写，把课本单词真正学会"
                : "注册后即可同步课本和学习记录"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          {/* Nickname */}
          <div className="space-y-1.5">
            <Label className="text-sm">昵称</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, 20));
                  setError("");
                }}
                placeholder={mode === "register" ? "起一个唯一的昵称" : "请输入昵称"}
                className="h-11 pl-10"
                autoFocus
              />
            </div>
          </div>

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
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg"
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
          </form>

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
