
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { fabric } from 'fabric';
import { n2w } from 'n2words';
import * as XLSX from 'xlsx';

// Define template storage interface
interface PDFTemplate {
  name: string;
  type: 'invoice' | 'proforma' | 'delivery' | 'report';
  data: any; // JSON representation of fabric.Canvas
}

interface TemplatesStore {
  [key: string]: PDFTemplate;
}

// Function to save a template to localStorage
export const saveTemplate = (
  templateId: string,
  name: string,
  type: 'invoice' | 'proforma' | 'delivery' | 'report',
  canvasData: any
): boolean => {
  try {
    // Get existing templates
    const existingTemplatesString = localStorage.getItem('pdfTemplates');
    let templates: TemplatesStore = {};
    
    if (existingTemplatesString) {
      templates = JSON.parse(existingTemplatesString);
    }
    
    // Update or add the new template
    templates[templateId] = {
      name,
      type,
      data: canvasData
    };
    
    // Save back to localStorage
    localStorage.setItem('pdfTemplates', JSON.stringify(templates));
    
    console.log('Template saved successfully:', templateId);
    return true;
  } catch (error) {
    console.error('Error saving template:', error);
    return false;
  }
};

// Function to get a template from localStorage
export const getTemplate = (templateId: string): PDFTemplate | null => {
  try {
    const templatesString = localStorage.getItem('pdfTemplates');
    if (!templatesString) return null;
    
    const templates: TemplatesStore = JSON.parse(templatesString);
    return templates[templateId] || null;
  } catch (error) {
    console.error('Error getting template:', error);
    return null;
  }
};

// Function to load a template into a fabric.Canvas
export const loadTemplateIntoCanvas = (
  canvas: fabric.Canvas,
  templateId: string
): boolean => {
  try {
    const template = getTemplate(templateId);
    if (!template) return false;
    
    canvas.loadFromJSON(template.data, canvas.renderAll.bind(canvas));
    return true;
  } catch (error) {
    console.error('Error loading template into canvas:', error);
    return false;
  }
};

// Generate PDF from template and data
export const generatePDFFromTemplate = async (
  templateId: string,
  data: any
): Promise<jsPDF | null> => {
  try {
    const template = getTemplate(templateId);
    if (!template) {
      console.error('Template not found:', templateId);
      return null;
    }
    
    console.log('Generating PDF with data:', data);
    console.log('Using template:', template);

    // Create a new PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Create a temporary canvas to render the template
    const tempCanvas = new fabric.Canvas(null, {
      width: 794,
      height: 1123
    });
    
    // Load the template into the canvas
    await new Promise<void>((resolve) => {
      tempCanvas.loadFromJSON(template.data, () => {
        resolve();
      });
    });
    
    // Process the canvas objects
    const objects = tempCanvas.getObjects();
    console.log('Template objects:', objects);

    // First, process text placeholders by finding objects with special data-field attributes
    for (const obj of objects) {
      if (obj.dataField) {
        console.log('Processing field:', obj.dataField);
        
        // Handle specific components based on data-field
        switch (obj.dataField) {
          case 'client-info':
            replaceClientInfo(obj, data.client);
            break;
            
          case 'invoice-details':
            replaceInvoiceDetails(obj, data);
            break;
            
          case 'items-table':
            // The actual table will be rendered separately by jsPDF
            tempCanvas.remove(obj);
            break;
            
          case 'totals-section':
            replaceTotalsSection(obj, data);
            break;
        }
      } else if (obj.type === 'text' || obj.type === 'textbox') {
        // For regular text objects, replace text placeholders
        replacePlaceholders(obj, data);
      }
    }
    
    // Render the canvas to the PDF
    const canvasDataUrl = tempCanvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    doc.addImage(canvasDataUrl, 'PNG', 0, 0, 210, 297);
    
    // If there was an items table that we removed, add it now using jsPDF-autotable
    if (data.items && data.items.length > 0) {
      renderItemsTable(doc, data.items);
    }
    
    // Cleanup
    tempCanvas.dispose();
    
    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

// Helper functions to replace placeholders with real data

const replaceClientInfo = (obj: fabric.Object, clientData: any) => {
  if (!clientData) return;
  
  // Find the text object within the group
  if (obj.type === 'group') {
    const group = obj as fabric.Group;
    const objects = group.getObjects();
    
    for (const groupObj of objects) {
      if (groupObj.type === 'text') {
        const textObj = groupObj as fabric.Text;
        const text = textObj.text || '';
        
        // Replace placeholders
        let newText = text
          .replace(/\{\{client\.name\}\}/g, clientData.name || '')
          .replace(/\{\{client\.address\}\}/g, clientData.address || '')
          .replace(/\{\{client\.taxid\}\}/g, clientData.taxid || '')
          .replace(/\{\{client\.phone\}\}/g, clientData.phone || '');
        
        textObj.set({ text: newText });
      }
    }
  }
};

const replaceInvoiceDetails = (obj: fabric.Object, data: any) => {
  if (!data) return;
  
  // Find the text object within the group
  if (obj.type === 'group') {
    const group = obj as fabric.Group;
    const objects = group.getObjects();
    
    for (const groupObj of objects) {
      if (groupObj.type === 'text') {
        const textObj = groupObj as fabric.Text;
        const text = textObj.text || '';
        
        // Format date
        const issueDate = data.issuedate ? new Date(data.issuedate).toLocaleDateString() : '';
        const dueDate = data.duedate ? new Date(data.duedate).toLocaleDateString() : '';
        
        // Replace placeholders
        let newText = text
          .replace(/\{\{number\}\}/g, data.number || '')
          .replace(/\{\{date\}\}/g, issueDate)
          .replace(/\{\{duedate\}\}/g, dueDate);
        
        textObj.set({ text: newText });
      }
    }
  }
};

const replaceTotalsSection = (obj: fabric.Object, data: any) => {
  if (!data) return;
  
  // Find the text objects within the group
  if (obj.type === 'group') {
    const group = obj as fabric.Group;
    const objects = group.getObjects();
    
    for (const groupObj of objects) {
      if (groupObj.type === 'text') {
        const textObj = groupObj as fabric.Text;
        const text = textObj.text || '';
        
        // Calculate totals if needed
        const subtotal = data.subtotal || calculateSubtotal(data.items || []);
        const taxTotal = data.taxTotal || calculateTaxTotal(data.items || []);
        const total = data.total || (subtotal + taxTotal);
        
        // Try to get total in words
        let totalInWords = '';
        try {
          totalInWords = n2w(total, { lang: 'en' });
        } catch (error) {
          console.error('Error converting total to words:', error);
          totalInWords = '';
        }
        
        // Replace placeholders
        let newText = text
          .replace(/\{\{subtotal\}\}/g, formatCurrency(subtotal))
          .replace(/\{\{taxTotal\}\}/g, formatCurrency(taxTotal))
          .replace(/\{\{total\}\}/g, formatCurrency(total))
          .replace(/\{\{total_in_words\}\}/g, totalInWords);
        
        textObj.set({ text: newText });
      }
    }
  }
};

const replacePlaceholders = (obj: fabric.Object, data: any) => {
  if (!data || obj.type !== 'text' && obj.type !== 'textbox') return;
  
  const textObj = obj as fabric.Text;
  let text = textObj.text || '';
  
  // Regular expression to find {{placeholder}} patterns
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  
  // Replace all placeholders
  text = text.replace(placeholderRegex, (match, placeholder) => {
    // Navigate through nested properties
    const props = placeholder.split('.');
    let value = data;
    
    for (const prop of props) {
      if (value && value[prop] !== undefined) {
        value = value[prop];
      } else {
        return match; // Keep original if not found
      }
    }
    
    return value;
  });
  
  textObj.set({ text });
};

// Render items table using jsPDF-autotable
const renderItemsTable = (doc: jsPDF, items: any[]) => {
  // @ts-ignore - jsPDF-autotable extends jsPDF
  doc.autoTable({
    startY: 280 / 3.7795, // Convert pixels to mm (assuming 96 DPI)
    head: [['Item', 'Description', 'Quantity', 'Unit Price', 'Total']],
    body: items.map(item => [
      item.product?.code || '',
      item.product?.name || '',
      item.quantity?.toString() || '',
      formatCurrency(item.product?.unitprice || 0),
      formatCurrency((item.quantity || 0) * (item.product?.unitprice || 0))
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: [255, 255, 255], // White
      fontStyle: 'bold'
    },
    margin: { left: 50 / 3.7795, right: 50 / 3.7795 }, // Convert pixels to mm
    tableWidth: 'auto'
  });
};

// Helper functions for calculations
const calculateSubtotal = (items: any[]): number => {
  return items.reduce((total, item) => {
    const quantity = item.quantity || 0;
    const price = (item.product?.unitprice || 0);
    return total + (quantity * price);
  }, 0);
};

const calculateTaxTotal = (items: any[]): number => {
  return items.reduce((total, item) => {
    const quantity = item.quantity || 0;
    const price = (item.product?.unitprice || 0);
    const taxRate = (item.product?.taxrate || 0) / 100;
    return total + (quantity * price * taxRate);
  }, 0);
};

// Format currency helper
const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Function to export data to Excel
export const exportToExcel = (data: any[], fileName: string): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Additional utility functions for invoice data processing

export const addInvoicePaymentFunctions = {
  // Add functionality to handle invoice payments here
};

export default {
  saveTemplate,
  getTemplate,
  loadTemplateIntoCanvas,
  generatePDFFromTemplate,
  exportToExcel
};
