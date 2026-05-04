"use client";

/** File: UI/application module for the dashboard project. */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
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
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Loader2, 
  ShieldCheck,
  Building2
} from "lucide-react";
import { toast } from "sonner";

/**
 * Zod validation schema for the company registration form.
 */
const formSchema = z.object({
  name: z.string().min(1, "Company Name is required"),
  ebsId: z.string().min(1, "EBS ID is required"),
  userName: z.string().min(1, "MRA Username is required"),
  password: z.string().min(1, "MRA Password is required"),
  areaCode: z.coerce.number().min(1, "Area Code is required"),
});

type FormOutputValues = z.output<typeof formSchema>;
type FormInputValues = z.input<typeof formSchema>;

interface CreateUserDialogProps {
  onSuccess: () => void;
}

/**
 * CreateUserDialog: A modal component for registering new companies.
 * Handles the multi-step flow of inputting credentials and displaying the generated API key.
 */
export function CreateUserDialog({ onSuccess }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormInputValues, unknown, FormOutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ebsId: "",
      userName: "",
      password: "",
      areaCode: 0,
    },
  });

  /**
   * Submits company registration data to the management API.
   */
  const onSubmit = async (values: FormOutputValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create user");
      }

      toast.success("Company registered successfully");
      
      // Capture the generated API key from the response
      const apiKey = data.apiKey || (data.apiKeys && data.apiKeys[0]?.key);
      
      if (apiKey) {
        setCreatedApiKey(apiKey);
      } else {
        // Close modal if no key is returned (unlikely based on spec)
        setOpen(false);
        form.reset();
        onSuccess();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Helper to copy text to clipboard with sensory feedback.
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API Key copied to clipboard");
  };

  /**
   * Resilience for closing the modal after showing the API key.
   */
  const handleClose = () => {
    setOpen(false);
    setCreatedApiKey(null);
    form.reset();
    if (createdApiKey) {
      onSuccess(); // Refresh the list
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isSubmitting) setOpen(val);
      if (!val) {
        setCreatedApiKey(null);
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 px-5">
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] bg-background text-foreground backdrop-blur-none p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {createdApiKey ? "API Credentials" : "Register Company"}
          </DialogTitle>
        </DialogHeader>

        {createdApiKey ? (
          /* SUCCESS STATE: Display the generated API Key once */
          <div className="space-y-6 py-4">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <ShieldCheck className="h-5 w-5" />
                Company Registered!
              </div>
              <p className="text-sm text-emerald-600/90 dark:text-emerald-500 leading-relaxed">
                Your company is now active. Please securely save this API key. For security reasons, **it will never be shown again**.
              </p>
              
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-500/60">API Key Header</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={createdApiKey} 
                    className="font-mono text-xs bg-background border-emerald-200/50"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="shrink-0 border-emerald-200/50"
                    onClick={() => copyToClipboard(createdApiKey)}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <Button className="w-full h-11 font-bold" onClick={handleClose}>
              I have saved the key
            </Button>
          </div>
        ) : (
          /* FORM STATE: Input company details */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} disabled={isSubmitting} className="h-10 bg-background border-input text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ebsId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EBS ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EBS-XXXXX" {...field} disabled={isSubmitting} className="h-10 bg-background border-input text-foreground" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="areaCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Code</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={isSubmitting}
                          className="h-10 bg-background border-input text-foreground"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                   <div className="h-px bg-border flex-1" />
                   <span className="text-xs font-medium text-muted-foreground">MRA Authentication</span>
                   <div className="h-px bg-border flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MRA Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter MRA username" {...field} disabled={isSubmitting} className="h-10 bg-background border-input text-foreground" />
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
                      <FormLabel>MRA Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Enter MRA password" 
                            {...field} 
                            disabled={isSubmitting} 
                            className="h-10 pr-10 bg-background border-input text-foreground"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-6">
                <Button 
                  variant="default"
                  type="submit" 
                  className="w-full sm:w-auto h-11 px-8 font-bold" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : "Register Company"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
