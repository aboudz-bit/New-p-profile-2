import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Login() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedEntryRole, login, user } = useAuth();

  // Redirect if no role selected
  if (!selectedEntryRole) {
      setLocation("/role");
      return null;
  }

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) {
        toast({ title: "Invalid Phone", description: "Please enter a valid phone number", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    // Simulate API delay
    setTimeout(() => {
        setIsLoading(false);
        setStep("otp");
        toast({ title: "OTP Sent", description: "Use code 1234" });
    }, 1000);
  };

  const handleVerifyOtp = async (val: string) => {
      setOtp(val);
      if (val.length === 4) {
          setIsLoading(true);
          // Simulate API check
          setTimeout(() => {
              const result = login(phone, val);
              setIsLoading(false);
              
              if (result.success) {
                  toast({ title: "Welcome back!", description: "Successfully logged in." });
                  // Routing Logic
                  if (selectedEntryRole === 'customer') {
                      setLocation("/");
                  } else {
                      setLocation("/merchant/dashboard");
                  }
              } else {
                  setOtp(""); // clear otp
                  toast({ title: "Login Failed", description: result.error, variant: "destructive" });
              }
          }, 800);
      }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-8">
        
        <div className="space-y-2">
            <button 
                onClick={() => step === 'otp' ? setStep('phone') : setLocation('/role')} 
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm mb-4"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold font-display text-slate-900">
                {selectedEntryRole === 'customer' ? "Sign in to Loom" : "Store / Staff Sign in"}
            </h1>
            <p className="text-muted-foreground">
                {step === 'phone' 
                    ? `Enter your mobile number to continue as ${selectedEntryRole}` 
                    : `Enter the code sent to ${phone}`
                }
            </p>
        </div>

        {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase">Phone Number</label>
                    <Input 
                        placeholder="555 123 456" 
                        type="tel" 
                        className="h-12 text-lg"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoFocus
                    />
                </div>
                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </Button>
                
                {/* DEV HELPER */}
                <div className="mt-8 p-4 bg-slate-50 rounded text-xs text-slate-400">
                    <p className="font-bold mb-1">DEV CHEAT SHEET:</p>
                    <p>Customer: 555123456</p>
                    <p>Owner: 555987654</p>
                    <p>Staff: 555111222</p>
                    <p>OTP: 1234</p>
                </div>
            </form>
        ) : (
            <div className="space-y-6">
                 <div className="flex justify-center py-4">
                    <InputOTP maxLength={4} value={otp} onChange={handleVerifyOtp}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
                            <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
                            <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
                            <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
                        </InputOTPGroup>
                    </InputOTP>
                 </div>
                 
                 {isLoading && (
                     <div className="flex justify-center text-primary">
                         <Loader2 className="w-6 h-6 animate-spin" />
                     </div>
                 )}

                 <p className="text-center text-sm text-muted-foreground">
                    Didn't receive code? <button className="text-primary font-medium">Resend</button>
                 </p>
            </div>
        )}

      </div>
    </div>
  );
}
