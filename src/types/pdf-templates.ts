
export interface PDFTemplate {
  id?: string;
  type: 'invoice' | 'proforma' | 'delivery_note';
  template_html: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  is_default?: boolean;
}

export interface TemplateVariable {
  name: string;
  description: string;
  example?: string;
  category: string;
}

export interface VariableCategory {
  name: string;
  description: string;
  variables: TemplateVariable[];
}

export interface TemplateDocument {
  id: string;
  number: string;
  clientName?: string;
}
