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
          coach_summary: string | null;
          actions: Json;
          ended: boolean;
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
          coach_summary?: string | null;
          actions?: Json;
          ended?: boolean;
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
          coach_summary?: string | null;
          actions?: Json;
          ended?: boolean;
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
      exercise_results: {
        Row: {
          id: string;
          user_id: string;
          exercise_type: string;
          data: Json;
          insights: string[];
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_type: string;
          data: Json;
          insights?: string[];
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_type?: string;
          data?: Json;
          insights?: string[];
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_results_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_reminders: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          exercise_description: string;
          message: string | null;
          frequency: string;
          start_date: string;
          end_date: string;
          next_reminder_at: string;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          exercise_description: string;
          message: string | null;
          frequency: string;
          start_date?: string;
          end_date: string;
          next_reminder_at: string;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string | null;
          exercise_description?: string;
          message?: string | null;
          frequency?: string;
          start_date?: string;
          end_date?: string;
          next_reminder_at?: string;
          completed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_reminders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exercise_reminders_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      bilans: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          period_start: string;
          period_end: string;
          content: Json;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          period_start: string;
          period_end: string;
          content: Json;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          period_start?: string;
          period_end?: string;
          content?: Json;
          generated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bilans_user_id_fkey';
            columns: ['user_id'];
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
      programs: {
        Row: {
          id: string;
          user_id: string;
          objectif: string;
          pourquoi_maintenant: string | null;
          etat_present: string | null;
          etat_desire: string | null;
          criteres_reussite: string[];
          echeance: string | null;
          statut: string;
          started_at: string;
          closed_at: string | null;
          bilan_final: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          objectif: string;
          pourquoi_maintenant?: string | null;
          etat_present?: string | null;
          etat_desire?: string | null;
          criteres_reussite?: string[];
          echeance?: string | null;
          statut?: string;
          started_at?: string;
          closed_at?: string | null;
          bilan_final?: string | null;
        };
        Update: {
          objectif?: string;
          pourquoi_maintenant?: string | null;
          etat_present?: string | null;
          etat_desire?: string | null;
          criteres_reussite?: string[];
          echeance?: string | null;
          statut?: string;
          closed_at?: string | null;
          bilan_final?: string | null;
        };
        Relationships: [];
      };
      program_milestones: {
        Row: {
          id: string;
          program_id: string;
          user_id: string;
          label: string;
          ordre: number;
          target_date: string | null;
          done: boolean;
          done_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          user_id: string;
          label: string;
          ordre?: number;
          target_date?: string | null;
          done?: boolean;
          done_at?: string | null;
        };
        Update: {
          label?: string;
          ordre?: number;
          target_date?: string | null;
          done?: boolean;
          done_at?: string | null;
        };
        Relationships: [];
      };
      measures: {
        Row: {
          id: string;
          user_id: string;
          program_id: string | null;
          label: string;
          question: string | null;
          direction: string;
          baseline: number | null;
          cible: number | null;
          cadence_days: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id?: string | null;
          label: string;
          question?: string | null;
          direction?: string;
          baseline?: number | null;
          cible?: number | null;
          cadence_days?: number;
          active?: boolean;
        };
        Update: {
          label?: string;
          question?: string | null;
          direction?: string;
          baseline?: number | null;
          cible?: number | null;
          cadence_days?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      measure_entries: {
        Row: {
          id: string;
          measure_id: string;
          user_id: string;
          value: number;
          note: string | null;
          source: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          measure_id: string;
          user_id: string;
          value: number;
          note?: string | null;
          source?: string;
          recorded_at?: string;
        };
        Update: {
          value?: number;
          note?: string | null;
        };
        Relationships: [];
      };
      practices: {
        Row: {
          id: string;
          user_id: string;
          program_id: string | null;
          label: string;
          pourquoi: string | null;
          declencheur: string | null;
          cadence: string;
          target_per_week: number;
          protocol_id: string | null;
          active: boolean;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id?: string | null;
          label: string;
          pourquoi?: string | null;
          declencheur?: string | null;
          cadence?: string;
          target_per_week?: number;
          protocol_id?: string | null;
          active?: boolean;
        };
        Update: {
          label?: string;
          pourquoi?: string | null;
          declencheur?: string | null;
          cadence?: string;
          target_per_week?: number;
          active?: boolean;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      practice_logs: {
        Row: {
          id: string;
          practice_id: string;
          user_id: string;
          done_on: string;
          done: boolean;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          user_id: string;
          done_on?: string;
          done?: boolean;
          note?: string | null;
        };
        Update: {
          done?: boolean;
          note?: string | null;
        };
        Relationships: [];
      };
      protocol_runs: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          protocol_id: string;
          sujet: string | null;
          resultat: string | null;
          intensite_avant: number | null;
          intensite_apres: number | null;
          revisit_at: string | null;
          revisited: boolean;
          revisit_note: string | null;
          ran_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          protocol_id: string;
          sujet?: string | null;
          resultat?: string | null;
          intensite_avant?: number | null;
          intensite_apres?: number | null;
          revisit_at?: string | null;
          revisited?: boolean;
          revisit_note?: string | null;
          ran_at?: string;
        };
        Update: {
          resultat?: string | null;
          intensite_apres?: number | null;
          revisit_at?: string | null;
          revisited?: boolean;
          revisit_note?: string | null;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          moment: string;
          intention: string | null;
          wins: string[];
          frictions: string[];
          energie: number | null;
          note: string | null;
          coach_reply: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day?: string;
          moment: string;
          intention?: string | null;
          wins?: string[];
          frictions?: string[];
          energie?: number | null;
          note?: string | null;
          coach_reply?: string | null;
        };
        Update: {
          intention?: string | null;
          wins?: string[];
          frictions?: string[];
          energie?: number | null;
          note?: string | null;
          coach_reply?: string | null;
        };
        Relationships: [];
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
