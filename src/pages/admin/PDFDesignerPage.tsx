import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  FileText,
  Save,
  Download,
  Layout,
  Image,
  Type,
  Square,
  Circle as CircleIcon,
  ArrowRight,
  Undo,
  Redo,
  Trash2,
  Copy,
  ArrowDown,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { fetchCompanyInfo } from '@/components/exports/CompanyInfoHeader';
import { useAuth } from '@/contexts/AuthContext';
import Building from '@/components/ui/building';
import { User } from 'lucide-react';
import { saveTemplate } from '@/utils/exportUtils';

interface TemplateType {
  id: string;
  name: string;
  type: 'invoice' | 'proforma' | 'delivery' | 'report';
}

const CANVAS_WIDTH = 794; // A4 width in pixels at 96 DPI
const CANVAS_HEIGHT = 1123; // A4 height in pixels at 96 DPI

const PDFDesignerPage: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateType[]>([
    { id: 'invoice-default', name: 'Default Invoice', type: 'invoice' },
    { id: 'proforma-default', name: 'Default Proforma', type: 'proforma' },
    { id: 'delivery-default', name: 'Default Delivery Note', type: 'delivery' },
    { id: 'report-default', name: 'Default Report', type: 'report' },
  ]);
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('invoice-default');
  const [templateType, setTemplateType] = useState<string>('invoice');
  const [templateName, setTemplateName] = useState<string>('Default Invoice');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [historyPosition, setHistoryPosition] = useState<number>(0);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  
  // Initialize the canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      preserveObjectStacking: true,
    });
    
    // Add grid background
    const gridSize = 20;
    for (let i = gridSize; i < CANVAS_WIDTH; i += gridSize) {
      fabricCanvas.add(new fabric.Line([i, 0, i, CANVAS_HEIGHT], {
        stroke: '#e0e0e0',
        selectable: false,
        evented: false,
      }));
    }
    
    for (let i = gridSize; i < CANVAS_HEIGHT; i += gridSize) {
      fabricCanvas.add(new fabric.Line([0, i, CANVAS_WIDTH, i], {
        stroke: '#e0e0e0',
        selectable: false,
        evented: false,
      }));
    }
    
    setCanvas(fabricCanvas);
    setCanvasHistory([JSON.stringify(fabricCanvas.toJSON())]);
    
    // Load saved templates from localStorage
    const savedTemplatesString = localStorage.getItem('pdfTemplates');
    if (savedTemplatesString) {
      try {
        const savedTemplates = JSON.parse(savedTemplatesString);
        const templatesList = Object.keys(savedTemplates).map(key => ({
          id: key,
          name: savedTemplates[key].name || 'Unnamed Template',
          type: savedTemplates[key].type as 'invoice' | 'proforma' | 'delivery' | 'report',
        }));
        setTemplates([...templates, ...templatesList]);
      } catch (error) {
        console.error('Error loading templates from localStorage', error);
      }
    }
    
    return () => {
      fabricCanvas.dispose();
    };
  }, []);
  
  // Handle template selection
  useEffect(() => {
    if (!canvas) return;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      setTemplateType(template.type);
      setTemplateName(template.name);
      
      // Try to load saved template from localStorage
      const savedTemplatesString = localStorage.getItem('pdfTemplates');
      if (savedTemplatesString) {
        try {
          const savedTemplates = JSON.parse(savedTemplatesString);
          if (savedTemplates[template.id] && savedTemplates[template.id].data) {
            // Load the template from local storage
            canvas.loadFromJSON(savedTemplates[template.id].data, canvas.renderAll.bind(canvas));
            recordHistory();
            return;
          }
        } catch (error) {
          console.error('Error loading template', error);
        }
      }
      
      // If no saved template found, load the default template
      loadDefaultTemplate(template.type);
    }
  }, [selectedTemplate, canvas]);
  
  // Add company info to canvas
  const addCompanyInfo = async () => {
    if (!canvas) return;
    
    try {
      const companyInfo = await fetchCompanyInfo();
      
      const companyText = new fabric.Text(companyInfo?.businessName || 'YOUR COMPANY NAME', {
        left: 50,
        top: 50,
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
      });
      
      const addressText = new fabric.Text([
        companyInfo?.address || 'Company Address',
        `NIF: ${companyInfo?.taxid || 'N/A'} | RC: ${companyInfo?.commerceRegNumber || 'N/A'}`,
        `Tel: ${companyInfo?.phone || 'N/A'} | Email: ${companyInfo?.email || 'info@company.com'}`
      ].join('\n'), {
        left: 50,
        top: 85,
        fontFamily: 'Arial',
        fontSize: 10,
      });
      
      canvas.add(companyText);
      canvas.add(addressText);
      
      recordHistory();
      canvas.renderAll();
      
      toast({
        title: "Company Info Added",
        description: "Company information has been added to the template"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add company info"
      });
    }
  };
  
  // Add client info placeholder
  const addClientInfo = () => {
    if (!canvas) return;
    
    const clientRect = new fabric.Rect({
      left: 50,
      top: 150,
      width: 200,
      height: 100,
      fill: '#f0f9ff',
      stroke: '#3b82f6',
      strokeWidth: 1,
      rx: 5,
      ry: 5,
    });
    
    const clientHeader = new fabric.Text('CLIENT INFORMATION', {
      left: 60,
      top: 160,
      fontFamily: 'Arial',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#1e40af',
    });
    
    const clientText = new fabric.Text('{{client.name}}\n{{client.address}}\n{{client.taxid}}\n{{client.phone}}', {
      left: 60,
      top: 180,
      fontFamily: 'Arial',
      fontSize: 10,
    });
    
    const clientGroup = new fabric.Group([clientRect, clientHeader, clientText], {
      left: 50,
      top: 150,
      hasControls: true,
      lockUniScaling: false,
    });
    
    canvas.add(clientGroup);
    recordHistory();
    canvas.renderAll();
  };
  
  // Add invoice details placeholder
  const addInvoiceDetails = () => {
    if (!canvas) return;
    
    const invoiceRect = new fabric.Rect({
      width: 200,
      height: 100,
      fill: '#f0f9ff',
      stroke: '#3b82f6',
      strokeWidth: 1,
      rx: 5,
      ry: 5,
    });
    
    const invoiceHeader = new fabric.Text('INVOICE DETAILS', {
      left: 10,
      top: 10,
      fontFamily: 'Arial',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#1e40af',
    });
    
    const invoiceText = new fabric.Text('Number: {{number}}\nDate: {{date}}\nDue: {{duedate}}', {
      left: 10,
      top: 30,
      fontFamily: 'Arial',
      fontSize: 10,
    });
    
    const invoiceGroup = new fabric.Group([invoiceRect, invoiceHeader, invoiceText], {
      left: CANVAS_WIDTH - 250,
      top: 150,
      hasControls: true,
      lockUniScaling: false,
    });
    
    canvas.add(invoiceGroup);
    recordHistory();
    canvas.renderAll();
  };
  
  // Add table placeholder
  const addTablePlaceholder = () => {
    if (!canvas) return;
    
    const tableHeaders = ['Item', 'Description', 'Quantity', 'Unit Price', 'Total'];
    const tableWidth = CANVAS_WIDTH - 100;
    const cellWidth = tableWidth / tableHeaders.length;
    const headerHeight = 30;
    const rowHeight = 25;
    
    // Create header background
    const headerBg = new fabric.Rect({
      width: tableWidth,
      height: headerHeight,
      fill: '#3b82f6',
      selectable: false,
    });
    
    // Create header texts
    const headerTexts = tableHeaders.map((header, i) => {
      return new fabric.Text(header, {
        left: i * cellWidth + cellWidth / 2,
        top: headerHeight / 2,
        fontFamily: 'Arial',
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        selectable: false,
      });
    });
    
    // Create data row background (3 sample rows)
    const rowBgs = Array.from({ length: 3 }).map((_, i) => {
      return new fabric.Rect({
        top: headerHeight + i * rowHeight,
        width: tableWidth,
        height: rowHeight,
        fill: i % 2 === 0 ? '#f9fafb' : '#ffffff',
        selectable: false,
      });
    });
    
    // Create table borders
    const borderLeft = new fabric.Line([0, 0, 0, headerHeight + 3 * rowHeight], {
      stroke: '#d1d5db',
      selectable: false,
    });
    
    const borderRight = new fabric.Line([tableWidth, 0, tableWidth, headerHeight + 3 * rowHeight], {
      stroke: '#d1d5db',
      selectable: false,
    });
    
    const horizontalLines = Array.from({ length: 4 }).map((_, i) => {
      const y = i * rowHeight + (i === 0 ? 0 : headerHeight);
      return new fabric.Line([0, y, tableWidth, y], {
        stroke: '#d1d5db',
        selectable: false,
      });
    });
    
    const verticalLines = Array.from({ length: tableHeaders.length - 1 }).map((_, i) => {
      const x = (i + 1) * cellWidth;
      return new fabric.Line([x, 0, x, headerHeight + 3 * rowHeight], {
        stroke: '#d1d5db',
        selectable: false,
      });
    });
    
    // Create table placeholder text
    const placeholderText = new fabric.Text('{{items_table}}', {
      left: tableWidth / 2,
      top: headerHeight + (3 * rowHeight) / 2,
      fontFamily: 'Arial',
      fontSize: 14,
      fill: '#9ca3af',
      originX: 'center',
      originY: 'center',
      selectable: false,
    });
    
    // Group all elements
    const tableElements = [
      headerBg,
      ...headerTexts,
      ...rowBgs,
      borderLeft,
      borderRight,
      ...horizontalLines,
      ...verticalLines,
      placeholderText
    ];
    
    const tableGroup = new fabric.Group(tableElements, {
      left: 50,
      top: 280,
      hasControls: true,
      lockUniScaling: false,
    });
    
    canvas.add(tableGroup);
    recordHistory();
    canvas.renderAll();
  };
  
  // Add totals section
  const addTotalsSection = () => {
    if (!canvas) return;
    
    const totalsRect = new fabric.Rect({
      width: 200,
      height: 120,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
      rx: 3,
      ry: 3,
    });
    
    const subtotalText = new fabric.Text('Subtotal:', {
      left: 10,
      top: 10,
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#374151',
    });
    
    const subtotalValueText = new fabric.Text('{{subtotal}}', {
      left: 180,
      top: 10,
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#374151',
      originX: 'right',
    });
    
    const taxText = new fabric.Text('Tax:', {
      left: 10,
      top: 30,
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#374151',
    });
    
    const taxValueText = new fabric.Text('{{taxTotal}}', {
      left: 180,
      top: 30,
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#374151',
      originX: 'right',
    });
    
    const separatorLine = new fabric.Line([10, 60, 190, 60], {
      stroke: '#374151',
      strokeWidth: 0.5,
    });
    
    const totalText = new fabric.Text('Total:', {
      left: 10,
      top: 70,
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#3b82f6',
    });
    
    const totalValueText = new fabric.Text('{{total}}', {
      left: 180,
      top: 70,
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#3b82f6',
      originX: 'right',
    });
    
    const totalInWordsText = new fabric.Text('Amount in words: {{total_in_words}}', {
      left: 10,
      top: 95,
      fontFamily: 'Arial',
      fontSize: 9,
      fontStyle: 'italic',
      fill: '#047857',
    });
    
    const totalsGroup = new fabric.Group([
      totalsRect,
      subtotalText,
      subtotalValueText,
      taxText,
      taxValueText,
      separatorLine,
      totalText,
      totalValueText,
      totalInWordsText
    ], {
      left: CANVAS_WIDTH - 250,
      top: 500,
      hasControls: true,
      lockUniScaling: false,
    });
    
    canvas.add(totalsGroup);
    recordHistory();
    canvas.renderAll();
  };
  
  // Add text field
  const addTextField = () => {
    if (!canvas) return;
    
    const text = new fabric.Textbox('Edit this text', {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fontSize: 14,
      width: 200,
      editable: true,
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    recordHistory();
    canvas.renderAll();
  };
  
  // Add shape
  const addShape = (shape: 'rect' | 'circle') => {
    if (!canvas) return;
    
    let obj;
    
    if (shape === 'rect') {
      obj = new fabric.Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        fill: '#e5e7eb',
        stroke: '#9ca3af',
        strokeWidth: 1,
        rx: 5,
        ry: 5,
      });
    } else {
      obj = new fabric.Circle({
        left: 100,
        top: 100,
        radius: 30,
        fill: '#e5e7eb',
        stroke: '#9ca3af',
        strokeWidth: 1,
      });
    }
    
    canvas.add(obj);
    canvas.setActiveObject(obj);
    recordHistory();
    canvas.renderAll();
  };
  
  // Add footer
  const addFooter = () => {
    if (!canvas) return;
    
    const footerText = new fabric.Text('Thank you for your business', {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT - 50,
      fontFamily: 'Arial',
      fontSize: 12,
      fill: '#f59e0b',
      fontWeight: 'bold',
      originX: 'center',
    });
    
    const footerLine = new fabric.Line([50, CANVAS_HEIGHT - 70, CANVAS_WIDTH - 50, CANVAS_HEIGHT - 70], {
      stroke: '#e5e7eb',
      strokeWidth: 1,
    });
    
    const footerGroup = new fabric.Group([footerLine, footerText], {
      left: 0,
      top: 0,
      hasControls: true,
    });
    
    canvas.add(footerGroup);
    recordHistory();
    canvas.renderAll();
  };
  
  // Save template
  const handleSaveTemplate = async () => {
    if (!canvas || !templateName) return;
    
    try {
      // Save canvas data
      const templateJSON = canvas.toJSON();
      console.log("Saving template data:", templateJSON);
      
      // Use the exportUtils saveTemplate function
      const result = saveTemplate(selectedTemplate, templateName, templateType as 'invoice' | 'proforma' | 'delivery' | 'report', templateJSON);
      
      if (result) {
        toast({
          title: "Template Saved",
          description: "Your template has been saved successfully"
        });
        
        // Update the template list if it's a new template
        const templateExists = templates.some(t => t.id === selectedTemplate);
        if (!templateExists) {
          setTemplates([...templates, {
            id: selectedTemplate,
            name: templateName,
            type: templateType as 'invoice' | 'proforma' | 'delivery' | 'report',
          }]);
        }
      } else {
        throw new Error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save template"
      });
    }
  };
  
  // Create new template
  const createNewTemplate = () => {
    if (!canvas) return;
    
    // Generate unique ID
    const newId = `template-${Date.now()}`;
    const newTemplate = {
      id: newId,
      name: 'New Template',
      type: 'invoice',
    };
    
    setTemplates([...templates, newTemplate]);
    setSelectedTemplate(newId);
    setTemplateName('New Template');
    setTemplateType('invoice');
    
    // Clear canvas
    canvas.clear();
    
    
    recordHistory();
    
    toast({
      title: "New Template Created",
      description: "Start designing your new template"
    });
  };
  
  // Load default template
  const loadDefaultTemplate = (type: string) => {
    if (!canvas) return;
    
    // Clear canvas
    canvas.clear();
    
    
    // Basic template setup based on type
    // In a real app, you'd load predefined templates from your database
    
    // For now, let's just add some basic elements
    // This would be replaced with actual template loading in a real app
    addCompanyInfo();
    
    // Default elements based on document type
    setTimeout(() => {
      addClientInfo();
      
      if (type === 'invoice' || type === 'proforma') {
        addInvoiceDetails();
        addTablePlaceholder();
        addTotalsSection();
      } else if (type === 'delivery') {
        const deliveryTitle = new fabric.Text('DELIVERY NOTE', {
          left: CANVAS_WIDTH - 250,
          top: 150,
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#3b82f6',
        });
        canvas.add(deliveryTitle);
        addTablePlaceholder();
      } else if (type === 'report') {
        const reportTitle = new fabric.Text('REPORT', {
          left: CANVAS_WIDTH / 2,
          top: 150,
          fontFamily: 'Arial',
          fontSize: 20,
          fontWeight: 'bold',
          fill: '#3b82f6',
          originX: 'center',
        });
        canvas.add(reportTitle);
      }
      
      addFooter();
      recordHistory();
      canvas.renderAll();
      
      toast({
        title: "Template Loaded",
        description: `Default ${type} template has been loaded`
      });
    }, 100);
  };
  
  // Delete selected object
  const deleteSelected = () => {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      recordHistory();
      canvas.renderAll();
    }
  };
  
  // Duplicate selected object
  const duplicateSelected = () => {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    activeObject.clone((cloned: any) => {
      canvas?.add(cloned.set({
        left: cloned.left ? cloned.left + 20 : 100,
        top: cloned.top ? cloned.top + 20 : 100,
      }));
      canvas?.setActiveObject(cloned);
      recordHistory();
      canvas?.renderAll();
    });
  };
  
  // Record history
  const recordHistory = () => {
    if (!canvas) return;
    
    // Remove any future history if we're not at the end
    const newHistory = canvasHistory.slice(0, historyPosition + 1);
    
    // Add current state to history
    newHistory.push(JSON.stringify(canvas.toJSON()));
    
    // Update history
    setCanvasHistory(newHistory);
    setHistoryPosition(newHistory.length - 1);
  };
  
  // Undo
  const handleUndo = () => {
    if (!canvas || historyPosition <= 0) return;
    
    const newPosition = historyPosition - 1;
    const canvasState = JSON.parse(canvasHistory[newPosition]);
    
    canvas.loadFromJSON(canvasState, canvas.renderAll.bind(canvas));
    setHistoryPosition(newPosition);
  };
  
  // Redo
  const handleRedo = () => {
    if (!canvas || historyPosition >= canvasHistory.length - 1) return;
    
    const newPosition = historyPosition + 1;
    const canvasState = JSON.parse(canvasHistory[newPosition]);
    
    canvas.loadFromJSON(canvasState, canvas.renderAll.bind(canvas));
    setHistoryPosition(newPosition);
  };
  
  // Export exportUtils.ts file
  const exportExportUtilsFile = () => {
    try {
      // Get the content of the exportUtils.ts file
      fetch('/src/utils/exportUtils.ts')
        .then(response => response.text())
        .then(fileContent => {
          // Create a blob with the file content
          const blob = new Blob([fileContent], { type: 'text/plain' });
          
          // Create an anchor element and trigger download
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = 'exportUtils.ts';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          toast({
            title: "File Exported",
            description: "exportUtils.ts has been downloaded successfully"
          });
        })
        .catch(error => {
          console.error("Error fetching exportUtils.ts:", error);
          throw new Error("Failed to fetch exportUtils.ts");
        });
    } catch (error) {
      console.error("Error exporting file:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export exportUtils.ts file"
      });
    }
  };
  
  // Export to PDF
  const exportToPDF = () => {
    if (!canvas) return;
    
    try {
      // Save the template first
      const templateJSON = canvas.toJSON();
      const saved = saveTemplate(selectedTemplate, templateName, templateType as 'invoice' | 'proforma' | 'delivery' | 'report', templateJSON);
      
      if (saved) {
        toast({
          title: "Template Exported",
          description: "Template is ready for PDF export use"
        });
      } else {
        throw new Error("Failed to export template");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export template"
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">PDF Template Designer</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleUndo} disabled={historyPosition <= 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleRedo} disabled={historyPosition >= canvasHistory.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 mr-2" /> Save Template
          </Button>
          <Button variant="secondary" onClick={exportExportUtilsFile}>
            <Download className="h-4 w-4 mr-2" /> Export Template
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-[250px_1fr] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Select or create a template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={createNewTemplate} className="w-full">
                <FileText className="h-4 w-4 mr-2" /> New Template
              </Button>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <label htmlFor="template-name" className="text-sm font-medium">
                  Template Name
                </label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="template-type" className="text-sm font-medium">
                  Template Type
                </label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger id="template-type">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="proforma">Proforma</SelectItem>
                    <SelectItem value="delivery">Delivery Note</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Elements</CardTitle>
              <CardDescription>Add elements to your template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={addCompanyInfo} className="w-full justify-start" variant="outline">
                <Building className="h-4 w-4 mr-2" /> Add Company Info
              </Button>
              <Button onClick={addClientInfo} className="w-full justify-start" variant="outline">
                <User className="h-4 w-4 mr-2" /> Add Client Info
              </Button>
              <Button onClick={addInvoiceDetails} className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" /> Add Document Details
              </Button>
              <Button onClick={addTablePlaceholder} className="w-full justify-start" variant="outline">
                <Layout className="h-4 w-4 mr-2" /> Add Items Table
              </Button>
              <Button onClick={addTotalsSection} className="w-full justify-start" variant="outline">
                <ArrowRight className="h-4 w-4 mr-2" /> Add Totals Section
              </Button>
              <Button onClick={addFooter} className="w-full justify-start" variant="outline">
                <ArrowDown className="h-4 w-4 mr-2" /> Add Footer
              </Button>
              
              <Separator />
              
              <Button onClick={addTextField} className="w-full justify-start" variant="outline">
                <Type className="h-4 w-4 mr-2" /> Add Text
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => addShape('rect')} className="flex-1 justify-center" variant="outline">
                  <Square className="h-4 w-4" />
                </Button>
                <Button onClick={() => addShape('circle')} className="flex-1 justify-center" variant="outline">
                  <CircleIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex gap-2">
                <Button onClick={deleteSelected} className="flex-1 justify-center" variant="destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button onClick={duplicateSelected} className="flex-1 justify-center" variant="secondary">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
            <CardDescription>Drag and position elements to design your template</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[800px] overflow-auto">
            <div className="border rounded shadow-sm inline-block">
              <canvas ref={canvasRef} className="border border-gray-200"></canvas>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFDesignerPage;
