import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";
import { BookOpen, Smartphone, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const codeInputRef = useRef<HTMLInputElement>(null);

  const sendCodeMutation = trpc.auth.sendCode.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStep("code");
        setCountdown(60);
        setError("");
        // Auto-focus code input
        setTimeout(() => codeInputRef.current?.focus(), 100);
      } else {
        setError(data.message);
      }
    },
    onError: (err) => {
      setError(err.message || "发送失败，请重试");
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Refresh page after successful login
        window.location.reload();
      } else {
        setError(data.message || "登录失败");
      }
    },
    onError: (err) => {
      setError(err.message || "登录失败，请重试");
    },
  });

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的11位手机号");
      return;
    }
    setError("");
    sendCodeMutation.mutate({ phone });
  };

  const handleLogin = () => {
    if (code.length !== 6) {
      setError("请输入6位验证码");
      return;
    }
    setError("");
    loginMutation.mutate({ phone, code });
  };

  const handleBack = () => {
    setStep("phone");
    setCode("");
    setError("");
  };

  const formatPhone = (p: string) => {
    return p.replace(/(\d{3})(\d{4})(\d{4})/, "$1 **** $3");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {step === "phone" ? "欢迎使用 WordMind" : "输入验证码"}
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              {step === "phone"
                ? "登录后可跨设备同步单词数据"
                : `验证码已发送至 ${formatPhone(phone)}`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {step === "phone" ? (
            /* Phone Input Step */
            <div className="space-y-4">
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPhone(val);
                    setError("");
                  }}
                  placeholder="请输入手机号"
                  className="h-12 pl-10 text-base"
                  maxLength={11}
                />
              </div>
              <Button
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg text-base"
                size="lg"
                onClick={handleSendCode}
                disabled={phone.length !== 11 || sendCodeMutation.isPending}
              >
                {sendCodeMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    获取验证码
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Code Input Step */
            <div className="space-y-4">
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(val);
                    setError("");
                    // Auto-submit when 6 digits entered
                    if (val.length === 6) {
                      setTimeout(() => {
                        loginMutation.mutate({ phone, code: val });
                      }, 200);
                    }
                  }}
                  placeholder="请输入6位验证码"
                  className="h-12 pl-10 text-base tracking-[0.5em] font-mono text-center"
                  maxLength={6}
                />
              </div>

              <Button
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg text-base"
                size="lg"
                onClick={handleLogin}
                disabled={code.length !== 6 || loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "登录"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleBack}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  更换手机号
                </button>
                {countdown > 0 ? (
                  <span className="text-gray-400">{countdown}秒后重新获取</span>
                ) : (
                  <button
                    onClick={handleSendCode}
                    className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                    disabled={sendCodeMutation.isPending}
                  >
                    重新获取验证码
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-400">
              {step === "phone"
                ? "未注册手机号将自动创建账号"
                : "开发环境验证码：123456"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
