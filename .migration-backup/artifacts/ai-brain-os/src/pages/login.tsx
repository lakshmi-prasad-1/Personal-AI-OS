import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Brain } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type AuthValues = z.infer<typeof authSchema>;

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: AuthValues) => {
    if (isRegister) {
      registerMutation.mutate({ data }, {
        onSuccess: (res) => {
          setToken(res.token);
          setLocation("/");
        },
        onError: (err) => {
          toast({
            title: "Registration failed",
            description: err.data?.error || "An error occurred",
            variant: "destructive",
          });
        }
      });
    } else {
      loginMutation.mutate({ data }, {
        onSuccess: (res) => {
          setToken(res.token);
          setLocation("/");
        },
        onError: (err) => {
          toast({
            title: "Login failed",
            description: err.data?.error || "An error occurred",
            variant: "destructive",
          });
        }
      });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">AI Brain OS</h1>
          <p className="text-muted-foreground mt-2">Your cerebral command center</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary hover:underline"
            >
              {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
