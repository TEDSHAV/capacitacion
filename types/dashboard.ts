import React from 'react';

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

export interface StatCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  time: string;
  user: string;
}
