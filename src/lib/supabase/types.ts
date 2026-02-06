export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      pd_users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: string;
          status: string;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          login_count: number;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          login_count?: number;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          login_count?: number;
        };
        Relationships: [];
      };
      pd_project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pd_projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          logo_url: string | null;
          github_owner: string | null;
          github_repo: string | null;
          github_label_filter: string | null;
          kanban_columns: { id: string; title: string; color: string }[] | null;
          phases: { id: string; name: string; color: string }[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          logo_url?: string | null;
          github_owner?: string | null;
          github_repo?: string | null;
          github_label_filter?: string | null;
          kanban_columns?: { id: string; title: string; color: string }[] | null;
          phases?: { id: string; name: string; color: string }[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          logo_url?: string | null;
          github_owner?: string | null;
          github_repo?: string | null;
          github_label_filter?: string | null;
          kanban_columns?: { id: string; title: string; color: string }[] | null;
          phases?: { id: string; name: string; color: string }[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pd_tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: string;
          priority: string | null;
          type: string;
          phase: string | null;
          assigned_to: string | null;
          deadline: string | null;
          github_issue_number: number | null;
          github_issue_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          last_modified_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string | null;
          type?: string;
          phase?: string | null;
          assigned_to?: string | null;
          deadline?: string | null;
          github_issue_number?: number | null;
          github_issue_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          last_modified_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: string | null;
          type?: string;
          phase?: string | null;
          assigned_to?: string | null;
          deadline?: string | null;
          github_issue_number?: number | null;
          github_issue_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          last_modified_by?: string | null;
        };
        Relationships: [];
      };
      pd_comments: {
        Row: {
          id: string;
          task_id: string;
          user_name: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_name: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_name?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pd_github_connections: {
        Row: {
          id: string;
          github_user_id: string;
          github_username: string;
          access_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          github_user_id: string;
          github_username: string;
          access_token: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          github_user_id?: string;
          github_username?: string;
          access_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pd_task_assignees: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Relationships: [];
      };
      pd_task_attachments: {
        Row: {
          id: string;
          task_id: string;
          url: string;
          filename: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          source: string;
          slack_file_id: string | null;
          slack_message_ts: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          url: string;
          filename: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          source?: string;
          slack_file_id?: string | null;
          slack_message_ts?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          url?: string;
          filename?: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          source?: string;
          slack_file_id?: string | null;
          slack_message_ts?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

export type Project = Database['public']['Tables']['pd_projects']['Row'];
export type Task = Database['public']['Tables']['pd_tasks']['Row'] & {
  assignees?: User[];
  attachment_count?: number;
};
export type Comment = Database['public']['Tables']['pd_comments']['Row'];
export type User = Database['public']['Tables']['pd_users']['Row'];

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  user?: User;
}
