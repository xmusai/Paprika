export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'employee' | 'manager';
          hourly_wage: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'employee' | 'manager';
          hourly_wage?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'employee' | 'manager';
          hourly_wage?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          start_time: string;
          end_time: string;
          shift_role: 'kitchen' | 'delivery' | 'cashier' | 'manager';
          notes: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          start_time: string;
          end_time: string;
          shift_role: 'kitchen' | 'delivery' | 'cashier' | 'manager';
          notes?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          shift_role?: 'kitchen' | 'delivery' | 'cashier' | 'manager';
          notes?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: 'general' | 'hours' | 'emergency' | 'rules';
          priority: 'normal' | 'high' | 'urgent';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category: 'general' | 'hours' | 'emergency' | 'rules';
          priority?: 'normal' | 'high' | 'urgent';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: 'general' | 'hours' | 'emergency' | 'rules';
          priority?: 'normal' | 'high' | 'urgent';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      complaints: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: 'equipment' | 'supplies' | 'pos' | 'other';
          urgency: 'low' | 'medium' | 'high' | 'critical';
          status: 'open' | 'in_progress' | 'resolved';
          submitted_by: string;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: 'equipment' | 'supplies' | 'pos' | 'other';
          urgency: 'low' | 'medium' | 'high' | 'critical';
          status?: 'open' | 'in_progress' | 'resolved';
          submitted_by: string;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: 'equipment' | 'supplies' | 'pos' | 'other';
          urgency?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'open' | 'in_progress' | 'resolved';
          submitted_by?: string;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_settings: {
        Row: {
          id: string;
          daily_payroll_limit: number;
          updated_at: string;
          updated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          daily_payroll_limit?: number;
          updated_at?: string;
          updated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          daily_payroll_limit?: number;
          updated_at?: string;
          updated_by?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Schedule = Database['public']['Tables']['schedules']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type Complaint = Database['public']['Tables']['complaints']['Row'];
export type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
