export interface TemplateSlot {
  id: string;
  label: string;
  openHour: number;
  openMinute: number;
}

export interface TemplateItem {
  id: string;
  label: string;
  type: "OX";
  order: number;
  enabled: boolean;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  enabled: boolean;
  slots: TemplateSlot[];
  items: TemplateItem[];
}
