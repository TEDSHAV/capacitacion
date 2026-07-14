import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

interface PortalNavbarProps {
  title: string;
  logoutAction: () => Promise<unknown>;
  loginPath: string;
}

export function PortalNavbar({ title, logoutAction, loginPath }: PortalNavbarProps) {
  return (
    <nav className="bg-white shadow-md z-50 sticky top-0">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-28">
          <div className="flex-1" />

          <div className="flex flex-col items-center">
            <Image
              src="/logo.png"
              alt="SHA de Venezuela"
              width={120}
              height={120}
              className="object-contain w-20 h-20 sm:w-28 sm:h-28"
            />
          </div>

          <div className="flex-1 flex justify-end">
            <form
              action={async () => {
                "use server";
                await logoutAction();
                redirect(loginPath);
              }}
            >
              <Button
                variant="outline"
                type="submit"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
