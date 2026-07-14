export interface Department {
  id: string;
  nombre: string;
  color?: string;
}

export interface SidebarProps {
  departamentos: Department[];
}

export interface DashboardClientProps {
  user: any;
}

export interface User {
  user_metadata?: {
    name?: string;
  };
  email?: string;
}
