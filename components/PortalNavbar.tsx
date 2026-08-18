import Image from "next/image";
import { LogoutButton } from "@/components/LogoutButton";

interface PortalNavbarProps {
  title: string;
  logoutAction: () => Promise<unknown>;
  loginPath: string;
}

export function PortalNavbar({ title, logoutAction, loginPath }: PortalNavbarProps) {
  return (
    <nav className="bg-white shadow-md z-50 sticky top-0 border-b border-gray-100">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left - Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="SHA de Venezuela"
              width={160}
              height={50}
              className="object-contain h-10 sm:h-12 w-auto"
              priority
            />
          </div>

          {/* Center - Portal title */}
          <div className="hidden md:block flex-1 text-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {title}
            </span>
          </div>

          {/* Right - Logout */}
          <div className="flex-shrink-0">
            <LogoutButton
              logoutAction={logoutAction}
              loginPath={loginPath}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
