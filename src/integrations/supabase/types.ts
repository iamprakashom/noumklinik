export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addon_discount_rules: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          main_service_id: string | null
          min_addons: number
          name: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          main_service_id?: string | null
          min_addons?: number
          name: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          main_service_id?: string | null
          min_addons?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_discount_rules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_discount_rules_main_service_id_fkey"
            columns: ["main_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          alternate_at: string | null
          appointment_id: string | null
          birth_date: string | null
          clinic_id: string
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          kind: string
          notes: string | null
          patient_id: string | null
          phone: string
          preferred_at: string
          provider_id: string | null
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alternate_at?: string | null
          appointment_id?: string | null
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          kind?: string
          notes?: string | null
          patient_id?: string | null
          phone: string
          preferred_at: string
          provider_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alternate_at?: string | null
          appointment_id?: string | null
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          kind?: string
          notes?: string | null
          patient_id?: string | null
          phone?: string
          preferred_at?: string
          provider_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          clinic_id: string
          confirmed_at: string | null
          created_at: string
          duration_min: number
          id: string
          notes: string | null
          patient_id: string
          previous_starts_at: string | null
          provider_id: string | null
          reschedule_count: number
          reschedule_reason: string | null
          room_id: string | null
          service_id: string | null
          source: string
          starts_at: string
          status: string
          temperature: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          confirmed_at?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id: string
          previous_starts_at?: string | null
          provider_id?: string | null
          reschedule_count?: number
          reschedule_reason?: string | null
          room_id?: string | null
          service_id?: string | null
          source?: string
          starts_at: string
          status?: string
          temperature?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          confirmed_at?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id?: string
          previous_starts_at?: string | null
          provider_id?: string | null
          reschedule_count?: number
          reschedule_reason?: string | null
          room_id?: string | null
          service_id?: string | null
          source?: string
          starts_at?: string
          status?: string
          temperature?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          channel: string
          clinic_id: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          offset_hours: number
          template_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          clinic_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          offset_hours?: number
          template_id?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          channel?: string
          clinic_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          offset_hours?: number
          template_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          clinic_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_profile: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          clinic_id: string
          created_at: string
          declaration: string
          email: string | null
          google_review_link: string | null
          gstin: string | null
          id: string
          invoice_prefix: string
          legal_name: string
          phone: string | null
          pincode: string | null
          singleton: boolean
          state: string
          state_code: string
          trade_name: string | null
          updated_at: string
          working_days: string[] | null
          open_time: string | null
          close_time: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          clinic_id?: string
          created_at?: string
          declaration?: string
          email?: string | null
          google_review_link?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          legal_name?: string
          phone?: string | null
          pincode?: string | null
          singleton?: boolean
          state?: string
          state_code?: string
          trade_name?: string | null
          updated_at?: string
          working_days?: string[] | null
          open_time?: string | null
          close_time?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          clinic_id?: string
          created_at?: string
          declaration?: string
          email?: string | null
          google_review_link?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          legal_name?: string
          phone?: string | null
          pincode?: string | null
          singleton?: boolean
          state?: string
          state_code?: string
          trade_name?: string | null
          updated_at?: string
          working_days?: string[] | null
          open_time?: string | null
          close_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_profile_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_templates: {
        Row: {
          active: boolean
          body: string
          clinic_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          body: string
          clinic_id?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          body?: string
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          cgst: number
          clinic_id: string
          created_at: string
          description: string
          gst_rate: number
          id: string
          igst: number
          invoice_id: string
          quantity: number
          sac_code: string
          sgst: number
          taxable_amount: number
          unit_price: number
        }
        Insert: {
          amount?: number
          cgst?: number
          clinic_id?: string
          created_at?: string
          description: string
          gst_rate?: number
          id?: string
          igst?: number
          invoice_id: string
          quantity?: number
          sac_code?: string
          sgst?: number
          taxable_amount?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          cgst?: number
          clinic_id?: string
          created_at?: string
          description?: string
          gst_rate?: number
          id?: string
          igst?: number
          invoice_id?: string
          quantity?: number
          sac_code?: string
          sgst?: number
          taxable_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          cgst: number
          clinic_id: string
          created_at: string
          discount: number
          doc_type: string
          id: string
          igst: number
          issued_at: string
          notes: string | null
          number: string
          original_invoice_id: string | null
          patient_id: string
          place_of_supply: string | null
          place_of_supply_code: string | null
          round_off: number
          seq: number | null
          sgst: number
          status: string
          subtotal: number
          supplier_gstin: string | null
          tax: number
          taxable_value: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          cgst?: number
          clinic_id?: string
          created_at?: string
          discount?: number
          doc_type?: string
          id?: string
          igst?: number
          issued_at?: string
          notes?: string | null
          number: string
          original_invoice_id?: string | null
          patient_id: string
          place_of_supply?: string | null
          place_of_supply_code?: string | null
          round_off?: number
          seq?: number | null
          sgst?: number
          status?: string
          subtotal?: number
          supplier_gstin?: string | null
          tax?: number
          taxable_value?: number
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          cgst?: number
          clinic_id?: string
          created_at?: string
          discount?: number
          doc_type?: string
          id?: string
          igst?: number
          issued_at?: string
          notes?: string | null
          number?: string
          original_invoice_id?: string | null
          patient_id?: string
          place_of_supply?: string | null
          place_of_supply_code?: string | null
          round_off?: number
          seq?: number | null
          sgst?: number
          status?: string
          subtotal?: number
          supplier_gstin?: string | null
          tax?: number
          taxable_value?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          clinic_id: string
          converted_patient_id: string | null
          created_at: string
          email: string | null
          external_id: string | null
          full_name: string
          id: string
          interest: string | null
          next_follow_up_at: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          service_id: string | null
          source: string
          source_group: string
          stage: string
          temperature: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          converted_patient_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          full_name: string
          id?: string
          interest?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          service_id?: string | null
          source?: string
          source_group?: string
          stage?: string
          temperature?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          converted_patient_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          full_name?: string
          id?: string
          interest?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          service_id?: string | null
          source?: string
          source_group?: string
          stage?: string
          temperature?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_patient_id_fkey"
            columns: ["converted_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          clinic_id: string
          created_at: string
          id: string
          name: string
          subject: string | null
          wa_category: string
          wa_language: string
          wa_status: string
          wa_template_name: string | null
          wa_variables: string[]
        }
        Insert: {
          body: string
          channel?: string
          clinic_id?: string
          created_at?: string
          id?: string
          name: string
          subject?: string | null
          wa_category?: string
          wa_language?: string
          wa_status?: string
          wa_template_name?: string | null
          wa_variables?: string[]
        }
        Update: {
          body?: string
          channel?: string
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string | null
          wa_category?: string
          wa_language?: string
          wa_status?: string
          wa_template_name?: string | null
          wa_variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_outbox: {
        Row: {
          appointment_id: string | null
          body: string
          channel: string
          clinic_id: string
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          patient_id: string | null
          provider_message_id: string | null
          recipient: string | null
          rule_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          appointment_id?: string | null
          body: string
          channel?: string
          clinic_id?: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          patient_id?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          rule_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          appointment_id?: string | null
          body?: string
          channel?: string
          clinic_id?: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          patient_id?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          rule_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_outbox_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_outbox_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_outbox_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_outbox_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_outbox_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          clinic_id: string
          connected_by: string | null
          created_at: string
          error_message: string | null
          id: string
          last_lead_at: string | null
          page_access_token: string | null
          page_id: string
          page_name: string
          page_picture_url: string | null
          singleton: boolean
          status: string
          updated_at: string
          user_access_token: string | null
        }
        Insert: {
          clinic_id?: string
          connected_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_lead_at?: string | null
          page_access_token?: string | null
          page_id: string
          page_name: string
          page_picture_url?: string | null
          singleton?: boolean
          status?: string
          updated_at?: string
          user_access_token?: string | null
        }
        Update: {
          clinic_id?: string
          connected_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_lead_at?: string | null
          page_access_token?: string | null
          page_id?: string
          page_name?: string
          page_picture_url?: string | null
          singleton?: boolean
          status?: string
          updated_at?: string
          user_access_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_lead_forms: {
        Row: {
          auto_apply: boolean
          clinic_id: string
          confirmed_keys: string[]
          connection_id: string
          created_at: string
          enabled: boolean
          field_confidence: Json
          field_map: Json
          form_id: string
          form_name: string
          id: string
          needs_review: boolean
          questions: Json
          updated_at: string
        }
        Insert: {
          auto_apply?: boolean
          clinic_id?: string
          confirmed_keys?: string[]
          connection_id: string
          created_at?: string
          enabled?: boolean
          field_confidence?: Json
          field_map?: Json
          form_id: string
          form_name: string
          id?: string
          needs_review?: boolean
          questions?: Json
          updated_at?: string
        }
        Update: {
          auto_apply?: boolean
          clinic_id?: string
          confirmed_keys?: string[]
          connection_id?: string
          created_at?: string
          enabled?: boolean
          field_confidence?: Json
          field_map?: Json
          form_id?: string
          form_name?: string
          id?: string
          needs_review?: boolean
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_lead_forms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lead_forms_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meta_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      package_items: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          package_id: string
          service_id: string
          sessions: number
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          package_id: string
          service_id: string
          sessions?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string
          sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      package_redemptions: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string
          id: string
          patient_id: string
          patient_package_id: string
          patient_package_item_id: string
          provider_id: string | null
          redeemed_at: string
          service_name: string
          value_recognised: number
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id: string
          patient_package_id: string
          patient_package_item_id: string
          provider_id?: string | null
          redeemed_at?: string
          service_name: string
          value_recognised?: number
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          patient_package_id?: string
          patient_package_item_id?: string
          provider_id?: string | null
          redeemed_at?: string
          service_name?: string
          value_recognised?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_redemptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_patient_package_id_fkey"
            columns: ["patient_package_id"]
            isOneToOne: false
            referencedRelation: "patient_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_patient_package_item_id_fkey"
            columns: ["patient_package_item_id"]
            isOneToOne: false
            referencedRelation: "patient_package_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          refundable: boolean
          updated_at: string
          validity_days: number
        }
        Insert: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          refundable?: boolean
          updated_at?: string
          validity_days?: number
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          refundable?: boolean
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          patient_id: string
          signature_data: string | null
          signature_name: string
          signed_at: string
          signed_via: string
          template_id: string | null
          template_name: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id: string
          signature_data?: string | null
          signature_name: string
          signed_at?: string
          signed_via?: string
          template_id?: string | null
          template_name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          signature_data?: string | null
          signature_name?: string
          signed_at?: string
          signed_via?: string
          template_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_feedback: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          comment: string | null
          created_at: string
          id: string
          is_complaint: boolean
          patient_id: string | null
          rating: number
          resolved_at: string | null
          resolved_by: string | null
          review_link_clicked: boolean
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_complaint?: boolean
          patient_id?: string | null
          rating: number
          resolved_at?: string | null
          resolved_by?: string | null
          review_link_clicked?: boolean
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_complaint?: boolean
          patient_id?: string | null
          rating?: number
          resolved_at?: string | null
          resolved_by?: string | null
          review_link_clicked?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_feedback_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_feedback_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_links: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          completed_at: string | null
          consent_template_id: string | null
          created_at: string
          expires_at: string
          id: string
          kind: string
          patient_id: string | null
          token: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string
          completed_at?: string | null
          consent_template_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          patient_id?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          completed_at?: string | null
          consent_template_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          patient_id?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_links_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_consent_template_id_fkey"
            columns: ["consent_template_id"]
            isOneToOne: false
            referencedRelation: "consent_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_package_items: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          patient_package_id: string
          service_id: string | null
          service_name: string
          sessions_total: number
          sessions_used: number
          unit_value: number
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          patient_package_id: string
          service_id?: string | null
          service_name: string
          sessions_total?: number
          sessions_used?: number
          unit_value?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          patient_package_id?: string
          service_id?: string | null
          service_name?: string
          sessions_total?: number
          sessions_used?: number
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_package_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_items_patient_package_id_fkey"
            columns: ["patient_package_id"]
            isOneToOne: false
            referencedRelation: "patient_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_packages: {
        Row: {
          clinic_id: string
          created_at: string
          expires_at: string
          extension_reason: string | null
          id: string
          invoice_id: string | null
          name: string
          package_id: string | null
          patient_id: string
          price_paid: number
          purchased_at: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          expires_at: string
          extension_reason?: string | null
          id?: string
          invoice_id?: string | null
          name: string
          package_id?: string | null
          patient_id: string
          price_paid?: number
          purchased_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          expires_at?: string
          extension_reason?: string | null
          id?: string
          invoice_id?: string | null
          name?: string
          package_id?: string | null
          patient_id?: string
          price_paid?: number
          purchased_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_packages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_photos: {
        Row: {
          caption: string | null
          clinic_id: string
          created_at: string
          id: string
          kind: string
          patient_id: string
          storage_path: string
          treatment_record_id: string | null
        }
        Insert: {
          caption?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          kind?: string
          patient_id: string
          storage_path: string
          treatment_record_id?: string | null
        }
        Update: {
          caption?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          kind?: string
          patient_id?: string
          storage_path?: string
          treatment_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_photos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_photos_treatment_record_id_fkey"
            columns: ["treatment_record_id"]
            isOneToOne: false
            referencedRelation: "treatment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          active: boolean
          alerts: string | null
          allergies: string | null
          birth_date: string | null
          clinic_id: string
          created_at: string
          email: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          preferred_channel: string
          source: string
          state: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          alerts?: string | null
          allergies?: string | null
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          preferred_channel?: string
          source?: string
          state?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          alerts?: string | null
          allergies?: string | null
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          preferred_channel?: string
          source?: string
          state?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_settings: {
        Row: {
          allow_emi: boolean
          allow_upi: boolean
          clinic_id: string
          created_at: string
          enabled: boolean
          id: string
          key_id: string | null
          key_secret: string | null
          mode: string
          provider: string
          singleton: boolean
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          allow_emi?: boolean
          allow_upi?: boolean
          clinic_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key_id?: string | null
          key_secret?: string | null
          mode?: string
          provider?: string
          singleton?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          allow_emi?: boolean
          allow_upi?: boolean
          clinic_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key_id?: string | null
          key_secret?: string | null
          mode?: string
          provider?: string
          singleton?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          id: string
          invoice_id: string
          paid_at: string | null
          provider: string
          provider_ref: string | null
          short_url: string | null
          status: string
        }
        Insert: {
          amount: number
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id: string
          paid_at?: string | null
          provider: string
          provider_ref?: string | null
          short_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          short_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_at: string
          status: string
        }
        Insert: {
          amount?: number
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          status?: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          active: boolean
          clinic_id: string
          color: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          title: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string
          color?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          title?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          color?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          addon_service_id: string
          clinic_id: string
          created_at: string
          id: string
          main_service_id: string
        }
        Insert: {
          addon_service_id: string
          clinic_id?: string
          created_at?: string
          id?: string
          main_service_id: string
        }
        Update: {
          addon_service_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          main_service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_addon_service_id_fkey"
            columns: ["addon_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addons_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addons_main_service_id_fkey"
            columns: ["main_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string
          clinic_id: string
          consent_template_id: string | null
          created_at: string
          default_device_settings: string | null
          default_product: string | null
          default_units: number | null
          duration_min: number
          followup_days: number | null
          gst_rate: number
          id: string
          name: string
          price: number
          sac_code: string
        }
        Insert: {
          active?: boolean
          category?: string
          clinic_id?: string
          consent_template_id?: string | null
          created_at?: string
          default_device_settings?: string | null
          default_product?: string | null
          default_units?: number | null
          duration_min?: number
          followup_days?: number | null
          gst_rate?: number
          id?: string
          name: string
          price?: number
          sac_code?: string
        }
        Update: {
          active?: boolean
          category?: string
          clinic_id?: string
          consent_template_id?: string | null
          created_at?: string
          default_device_settings?: string | null
          default_product?: string | null
          default_units?: number | null
          duration_min?: number
          followup_days?: number | null
          gst_rate?: number
          id?: string
          name?: string
          price?: number
          sac_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_consent_template_id_fkey"
            columns: ["consent_template_id"]
            isOneToOne: false
            referencedRelation: "consent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_records: {
        Row: {
          addendum: string | null
          addendum_at: string | null
          addendum_by: string | null
          appointment_id: string | null
          assessment: string | null
          clinic_id: string
          created_at: string
          device_settings: string | null
          id: string
          objective: string | null
          patient_id: string
          plan: string | null
          product: string | null
          provider_id: string | null
          service_name: string
          signed_at: string | null
          signed_by: string | null
          subjective: string | null
          units: number | null
          updated_at: string
        }
        Insert: {
          addendum?: string | null
          addendum_at?: string | null
          addendum_by?: string | null
          appointment_id?: string | null
          assessment?: string | null
          clinic_id?: string
          created_at?: string
          device_settings?: string | null
          id?: string
          objective?: string | null
          patient_id: string
          plan?: string | null
          product?: string | null
          provider_id?: string | null
          service_name: string
          signed_at?: string | null
          signed_by?: string | null
          subjective?: string | null
          units?: number | null
          updated_at?: string
        }
        Update: {
          addendum?: string | null
          addendum_at?: string | null
          addendum_by?: string | null
          appointment_id?: string | null
          assessment?: string | null
          clinic_id?: string
          created_at?: string
          device_settings?: string | null
          id?: string
          objective?: string | null
          patient_id?: string
          plan?: string | null
          product?: string | null
          provider_id?: string | null
          service_name?: string
          signed_at?: string | null
          signed_by?: string | null
          subjective?: string | null
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string
          clinic_id: string
          contact_name: string | null
          contact_wa_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          lead_id: string | null
          message_type: string
          patient_id: string | null
          provider_message_id: string | null
          read_at: string | null
          sent_at: string
          status: string
          updated_at: string
        }
        Insert: {
          body?: string
          clinic_id?: string
          contact_name?: string | null
          contact_wa_id: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          patient_id?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          clinic_id?: string
          contact_name?: string | null
          contact_wa_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          patient_id?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          access_token: string | null
          app_secret: string | null
          clinic_id: string
          created_at: string
          display_name: string | null
          enabled: boolean
          error_message: string | null
          id: string
          phone_number: string | null
          phone_number_id: string | null
          singleton: boolean
          status: string
          updated_at: string
          verify_token: string
          waba_id: string | null
        }
        Insert: {
          access_token?: string | null
          app_secret?: string | null
          clinic_id?: string
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          error_message?: string | null
          id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          singleton?: boolean
          status?: string
          updated_at?: string
          verify_token?: string
          waba_id?: string | null
        }
        Update: {
          access_token?: string | null
          app_secret?: string | null
          clinic_id?: string
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          error_message?: string | null
          id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          singleton?: boolean
          status?: string
          updated_at?: string
          verify_token?: string
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clinic_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_admin: { Args: { _clinic_id: string }; Returns: boolean }
      is_clinic_member: { Args: { _clinic_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "provider" | "front_desk"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "provider", "front_desk"],
    },
  },
} as const
