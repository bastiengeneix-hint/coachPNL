export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          password_hash: string;
          role: 'user' | 'admin';
          onboarding_complete: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          password_hash: string;
          role?: 'user' | 'admin';
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          password_hash?: string;
          role?: 'user' | 'admin';
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          projets: string[];
          patterns_sabotage: string[];
          barrieres_ulp: string[];
          croyances_limitantes: string[];
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          projets?: string[];
          patterns_sabotage?: string[];
          barrieres_ulp?: string[];
          croyances_limitantes?: string[];
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          projets?: string[];
          patterns_sabotage?: string[];
          barrieres_ulp?: string[];
          croyances_limitantes?: string[];
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          mode: string;
          messages: Json;
          insights: Json;
          themes: string[];
          exercice_propose: string | null;
          exercice_fait: boolean;
          summary: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          mode: string;
          messages?: Json;
          insights?: Json;
          themes?: string[];
          exercice_propose?: string | null;
          exercice_fait?: boolean;
          summary?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          mode?: string;
          messages?: Json;
          insights?: Json;
          themes?: string[];
          exercice_propose?: string | null;
          exercice_fait?: boolean;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      active_contexts: {
        Row: {
          id: string;
          user_id: string;
          summary: string;
          last_updated: string;
          recent_themes: string[];
          pending_exercice: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary?: string;
          last_updated?: string;
          recent_themes?: string[];
          pending_exercice?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          summary?: string;
          last_updated?: string;
          recent_themes?: string[];
          pending_exercice?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'active_contexts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      sources: {
        Row: {
          id: string;
          titre: string;
          auteur: string;
          domaine: string;
          active: boolean;
          uploaded_by: string;
          chunks_count: number;
          indexed_at: string;
        };
        Insert: {
          id?: string;
          titre: string;
          auteur: string;
          domaine: string;
          active?: boolean;
          uploaded_by: string;
          chunks_count?: number;
          indexed_at?: string;
        };
        Update: {
          id?: string;
          titre?: string;
          auteur?: string;
          domaine?: string;
          active?: boolean;
          uploaded_by?: string;
          chunks_count?: number;
          indexed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sources_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chunks: {
        Row: {
          id: string;
          source_id: string;
          content: string;
          page_start: number | null;
          page_end: number | null;
          chapitre: string | null;
          embedding: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          content: string;
          page_start?: number | null;
          page_end?: number | null;
          chapitre?: string | null;
          embedding: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          content?: string;
          page_start?: number | null;
          page_end?: number | null;
          chapitre?: string | null;
          embedding?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chunks_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          source_id: string;
          content: string;
          page_start: number | null;
          page_end: number | null;
          chapitre: string | null;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
