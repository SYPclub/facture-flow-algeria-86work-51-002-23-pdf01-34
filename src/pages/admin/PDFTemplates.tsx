
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PDFTemplate } from "@/types/pdf-templates";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Eye, Copy, Check, Trash } from "lucide-react";
import { Link } from "react-router-dom";

export default function PDFTemplates() {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoice");

  useEffect(() => {
    fetchTemplates();
  }, [activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("type", activeTab);

      if (error) {
        throw error;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setDefaultTemplate = async (templateId: string) => {
    try {
      // First reset all templates of this type to non-default
      await supabase
        .from("pdf_templates")
        .update({ is_default: false })
        .eq("type", activeTab);

      // Then set this specific template as default
      const { error } = await supabase
        .from("pdf_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      if (error) throw error;

      // Update local state
      setTemplates(
        templates.map((template) => ({
          ...template,
          is_default: template.id === templateId,
        }))
      );

      toast({
        title: "Success",
        description: "Default template updated successfully",
      });
    } catch (error) {
      console.error("Error setting default template:", error);
      toast({
        title: "Error",
        description: "Failed to update default template",
        variant: "destructive",
      });
    }
  };

  const duplicateTemplate = async (template: PDFTemplate) => {
    try {
      const { data, error } = await supabase
        .from("pdf_templates")
        .insert({
          type: template.type,
          template_html: template.template_html,
          name: `${template.name} (Copy)`,
          is_default: false,
        })
        .select("*")
        .single();

      if (error) throw error;
      
      setTemplates([...templates, data]);
      
      toast({
        title: "Template duplicated",
        description: "The template has been duplicated successfully",
      });
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const templateToDelete = templates.find((t) => t.id === templateId);
      
      // Don't allow deletion of default templates
      if (templateToDelete?.is_default) {
        toast({
          title: "Cannot delete",
          description: "You cannot delete the default template. Set another template as default first.",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from("pdf_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      
      // Update local state
      setTemplates(templates.filter((template) => template.id !== templateId));
      
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const createNewTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("pdf_templates")
        .insert({
          type: activeTab,
          template_html: getDefaultTemplateHTML(activeTab),
          name: `New ${activeTab} template`,
          is_default: templates.length === 0, // Make default if first template
        })
        .select("*")
        .single();

      if (error) throw error;
      
      setTemplates([...templates, data]);
      
      toast({
        title: "Template created",
        description: "New template has been created successfully",
      });
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const getDefaultTemplateHTML = (type: string): string => {
    // Very simple default template
    return `
      <div class="invoice-container">
        <div class="company-header"></div>
        <h1>${type.toUpperCase()}</h1>
        <div>Invoice Number: {{invoice.number}}</div>
        <div>Date: {{invoice.issuedate}}</div>
        <div>Client: {{invoice.client.name}}</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each invoice.items}}
            <tr>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{unit_price}}</td>
              <td>{{total}}</td>
            </tr>
            {{/each}}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total:</td>
              <td>{{invoice.total}}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  };

  const previewTemplate = (templateId: string, type: string) => {
    // Fetches a sample invoice to preview
    const fetchInvoiceForPreview = async () => {
      try {
        const tableName = type === "invoice" ? "final_invoices" : type === "proforma" ? "proforma_invoices" : "delivery_notes";
        
        const { data, error } = await supabase
          .from(tableName)
          .select("id, number, client:clientid (name)")
          .limit(10);

        if (error) throw error;
        
        if (data && data.length > 0) {
          // Open in new tab
          window.open(`/print/v3/${type}/${data[0].id}?template=${templateId}`, "_blank");
        } else {
          toast({
            title: "No documents found",
            description: `There are no ${type} documents to preview the template with.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching invoice for preview:", error);
        toast({
          title: "Error",
          description: "Failed to fetch document for preview",
          variant: "destructive",
        });
      }
    };

    fetchInvoiceForPreview();
  };

  const goToTemplateDesigner = (templateId?: string) => {
    if (templateId) {
      window.location.href = `/admin/pdf-template/design/${templateId}`;
    } else {
      window.location.href = `/admin/pdf-template/new?type=${activeTab}`;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">PDF Templates</h1>
        <Button onClick={() => goToTemplateDesigner()}>Create New Template</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="invoice">Invoices</TabsTrigger>
          <TabsTrigger value="proforma">Proforma Invoices</TabsTrigger>
          <TabsTrigger value="delivery_note">Delivery Notes</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <p>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center p-8 border rounded-lg">
              <p className="mb-4">No templates found for this document type.</p>
              <Button onClick={() => goToTemplateDesigner()}>Create First Template</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{template.name}</h3>
                    {template.is_default && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Last updated: {new Date(template.updated_at || "").toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => previewTemplate(template.id!, activeTab)}>
                      <Eye size={16} className="mr-1" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateTemplate(template)}>
                      <Copy size={16} className="mr-1" /> Duplicate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => goToTemplateDesigner(template.id)}>
                      <Pencil size={16} className="mr-1" /> Edit
                    </Button>
                    {!template.is_default && (
                      <Button variant="outline" size="sm" onClick={() => setDefaultTemplate(template.id!)}>
                        <Check size={16} className="mr-1" /> Set Default
                      </Button>
                    )}
                    {!template.is_default && (
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteTemplate(template.id!)}>
                        <Trash size={16} className="mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
