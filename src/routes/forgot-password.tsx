import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  Bug,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Input } from "@/components/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/input-otp";
import { Label } from "@/components/label";
import {
  requestPasswordResetOtp,
  resetPassword,
  verifyPasswordResetOtp,
} from "@/lib/local-store";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

type Step = "email" | "otp" | "password";

const emailSchema = z.string().email("Enter a valid email");

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stepNumber = step === "email" ? 1 : step === "otp" ? 2 : 3;

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetOtp(email.trim().toLowerCase());
      toast.success("Verification code sent to your email");
      setStep("otp");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send OTP";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Enter the complete 6 digit OTP");
      return;
    }

    setLoading(true);
    try {
      await verifyPasswordResetOtp(email.trim().toLowerCase(), otp);
      toast.success("OTP verified successfully");
      setStep("password");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid or expired OTP";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), otp, newPassword);
      toast.success("Password reset successfully");
      navigate({ to: "/login" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reset password";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-5 text-center">
          <Link
            to="/login"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-label="Back to login"
          >
            <Bug className="h-5 w-5" />
          </Link>
          <div>
            <CardTitle className="text-2xl">Reset password</CardTitle>
            <CardDescription className="mt-2">Step {stepNumber} of 3</CardDescription>
          </div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    stepNumber >= num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepNumber > num ? <CheckCircle className="h-4 w-4" /> : num}
                </div>
                {num < 3 && (
                  <div
                    className={`mx-1 h-1 w-10 rounded-full transition-colors ${
                      stepNumber > num ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">Enter your email</h2>
                <p className="text-sm text-muted-foreground">
                  We will send you a 6 digit verification code.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send verification code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">Verify OTP</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the code sent to {email}.
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="h-11 w-11" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => void sendOtp()}
              >
                Resend code
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">Create new password</h2>
                <p className="text-sm text-muted-foreground">
                  Your new password must be at least 6 characters.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    className="px-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="px-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
