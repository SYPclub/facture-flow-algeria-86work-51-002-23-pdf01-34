
// Only updating the schema to include unit
const deliveryNoteSchema = z.object({
  clientid: z.string().min(1, 'Client is required'),
  issuedate: z.string().min(1, 'Issue date is required'),
  notes: z.string().optional(),
  drivername: z.string().min(1, 'Driver name is required'),
  truck_id: z.string().optional(),
  delivery_company: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string().min(1, 'Product is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      unit: z.string().optional(),
      product: z.object({
        name: z.string(),
        description: z.string(),
        code: z.string(),
        unitprice: z.number(),
        taxrate: z.number(),
        unit: z.string().optional(),
      }).optional()
    })
  ).min(1, 'At least one item is required')
});
