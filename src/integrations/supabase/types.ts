export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          address: string
          city: string
          country: string
          createdat: string | null
          email: string
          id: string
          name: string
          phone: string
          taxid: string
          updatedat: string | null
        }
        Insert: {
          address: string
          city: string
          country: string
          createdat?: string | null
          email: string
          id?: string
          name: string
          phone: string
          taxid: string
          updatedat?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          createdat?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          taxid?: string
          updatedat?: string | null
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address: string
          business_name: string
          commerce_reg_number: string
          created_at: string | null
          email: string
          id: string
          phone: string
          tax_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          business_name: string
          commerce_reg_number: string
          created_at?: string | null
          email: string
          id?: string
          phone: string
          tax_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          business_name?: string
          commerce_reg_number?: string
          created_at?: string | null
          email?: string
          id?: string
          phone?: string
          tax_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_note_items: {
        Row: {
          deliverynoteid: string
          itemid: string
        }
        Insert: {
          deliverynoteid: string
          itemid: string
        }
        Update: {
          deliverynoteid?: string
          itemid?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_deliverynoteid_fkey"
            columns: ["deliverynoteid"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          clientid: string
          created_by_userid: string | null
          createdat: string | null
          delivery_company: string | null
          deliverydate: string | null
          drivername: string | null
          finalinvoiceid: string | null
          id: string
          issuedate: string
          notes: string | null
          number: string
          bc: string | null
          status: string
          truck_id: string | null
          updatedat: string | null
        }
        Insert: {
          clientid: string
          created_by_userid?: string | null
          createdat?: string | null
          delivery_company?: string | null
          deliverydate?: string | null
          drivername?: string | null
          finalinvoiceid?: string | null
          id?: string
          issuedate: string
          notes?: string | null
          number: string
          bc?: string | null
          status: string
          truck_id?: string | null
          updatedat?: string | null
        }
        Update: {
          clientid?: string
          created_by_userid?: string | null
          createdat?: string | null
          delivery_company?: string | null
          deliverydate?: string | null
          drivername?: string | null
          finalinvoiceid?: string | null
          id?: string
          issuedate?: string
          notes?: string | null
          number?: string
          bc?: string | null
          status?: string
          truck_id?: string | null
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_clientid_fkey"
            columns: ["clientid"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_finalinvoiceid_fkey"
            columns: ["finalinvoiceid"]
            isOneToOne: false
            referencedRelation: "final_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      final_invoice_items: {
        Row: {
          finalinvoiceid: string
          itemid: string
        }
        Insert: {
          finalinvoiceid: string
          itemid: string
        }
        Update: {
          finalinvoiceid?: string
          itemid?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_invoice_items_finalinvoiceid_fkey"
            columns: ["finalinvoiceid"]
            isOneToOne: false
            referencedRelation: "final_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_invoice_items_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      final_invoices: {
        Row: {
          clientid: string
          createdat: string | null
          duedate: string | null
          id: string
          issuedate: string
          notes: string | null
          number: string
          paymentdate: string | null
          paymentreference: string | null
          proformaid: string | null
          bc: string | null
          payment_type: string | null
          stamp_tax: number | null
          status: string
          subtotal: number
          taxtotal: number
          total: number
          updatedat: string | null
        }
        Insert: {
          clientid: string
          createdat?: string | null
          duedate: string | null
          id?: string
          issuedate: string
          notes?: string | null
          number: string
          paymentdate?: string | null
          paymentreference?: string | null
          proformaid?: string | null
          bc?: string | null
          payment_type?: string | null
          stamp_tax?: number | null
          status: string
          subtotal: number
          taxtotal: number
          total: number
          updatedat?: string | null
        }
        Update: {
          clientid?: string
          createdat?: string | null
          duedate?: string | null
          id?: string
          issuedate?: string
          notes?: string | null
          number?: string
          paymentdate?: string | null
          paymentreference?: string | null
          proformaid?: string | null
          status?: string
          bc?: string | null
          payment_type?: string | null
          stamp_tax?: number | null
          subtotal?: number
          taxtotal?: number
          total?: number
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "final_invoices_clientid_fkey"
            columns: ["clientid"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_invoices_proformaid_fkey"
            columns: ["proformaid"]
            isOneToOne: false
            referencedRelation: "proforma_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          discount: number
          id: string
          productid: string | null
          quantity: number
          taxrate: number
          total: number
          totalexcl: number
          totaltax: number
          unitprice: number
          unit: string | null
        }
        Insert: {
          discount?: number
          id?: string
          productid?: string | null
          quantity: number
          taxrate: number
          total: number
          totalexcl: number
          totaltax: number
          unitprice: number
          unit: string | null
        }
        Update: {
          discount?: number
          id?: string
          productid?: string | null
          quantity?: number
          taxrate?: number
          total?: number
          totalexcl?: number
          totaltax?: number
          unitprice?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_productid_fkey"
            columns: ["productid"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          createdat: string | null
          description: string
          id: string
          name: string
          stockquantity: number
          taxrate: number
          unitprice: number
          unit: string | null
          updatedat: string | null
        }
        Insert: {
          code: string
          createdat?: string | null
          description: string
          id?: string
          name: string
          stockquantity?: number
          taxrate: number
          unitprice: number
          unit: string | null
          updatedat?: string | null
        }
        Update: {
          code?: string
          createdat?: string | null
          description?: string
          id?: string
          name?: string
          stockquantity?: number
          taxrate?: number
          unitprice?: number
          unit: string | null
          updatedat?: string | null
        }
        Relationships: []
      }
      proforma_invoice_items: {
        Row: {
          itemid: string
          proformainvoiceid: string
        }
        Insert: {
          itemid: string
          proformainvoiceid: string
        }
        Update: {
          itemid?: string
          proformainvoiceid?: string
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoice_items_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_invoice_items_proformainvoiceid_fkey"
            columns: ["proformainvoiceid"]
            isOneToOne: false
            referencedRelation: "proforma_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_invoices: {
        Row: {
          clientid: string
          createdat: string | null
          duedate: string
          finalinvoiceid: string | null
          id: string
          issuedate: string
          notes: string | null
          number: string
          payment_type: string | null
          stamp_tax: number | null
          bc: string | null
          status: string
          subtotal: number
          taxtotal: number
          total: number
          updatedat: string | null
        }
        Insert: {
          clientid: string
          createdat?: string | null
          duedate: string
          finalinvoiceid?: string | null
          id?: string
          issuedate: string
          notes?: string | null
          number: string
          payment_type?: string | null
          stamp_tax?: number | null
          bc?: string | null
          status: string
          subtotal: number
          taxtotal: number
          total: number
          updatedat?: string | null
        }
        Update: {
          clientid?: string
          createdat?: string | null
          duedate?: string
          finalinvoiceid?: string | null
          id?: string
          issuedate?: string
          notes?: string | null
          number?: string
          payment_type?: string | null
          bc?: string | null
          stamp_tax?: number | null
          status?: string
          subtotal?: number
          taxtotal?: number
          total?: number
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoices_clientid_fkey"
            columns: ["clientid"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_delivery_note_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_proforma_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
