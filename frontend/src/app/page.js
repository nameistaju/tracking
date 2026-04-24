"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else {
        router.push(user.role === "Admin" ? "/admin" : "/intern");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/15 bg-white overflow-hidden">
        <Image src="/sharpkode.png" alt="SHARPKODE" width={64} height={64} className="object-contain" priority />
      </div>
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  );
}
