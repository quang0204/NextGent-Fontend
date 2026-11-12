import React from 'react';
import { VariantSchemaField } from '../../types/product';

export interface DynamicVariantData {
  sku: string;
  color: string;
  ramGb?: number;
  romGb?: number;
  connectionType?: string;
  attributes?: Record<string, any>;
  listPrice: number;
  salePrice: number;
  initialStock?: number;
}

interface DynamicVariantInputsProps {
  schema: VariantSchemaField[];
  variant: DynamicVariantData;
  onChange: (updated: DynamicVariantData) => void;
  disabled?: boolean;
}

export const DynamicVariantInputs: React.FC<DynamicVariantInputsProps> = ({
  schema,
  variant,
  onChange,
  disabled = false,
}) => {
  const getFieldValue = (field: VariantSchemaField) => {
    if (field.storage === 'COLUMN') {
      if (field.key === 'color') return variant.color || '';
      if (field.key === 'ramGb') return variant.ramGb ?? '';
      if (field.key === 'romGb') return variant.romGb ?? '';
      if (field.key === 'connectionType') return variant.connectionType || '';
      return (variant as any)[field.key] ?? '';
    } else {
      return variant.attributes?.[field.key] ?? '';
    }
  };

  const handleFieldChange = (field: VariantSchemaField, rawValue: string) => {
    const next = { ...variant };
    let parsedValue: any = rawValue;

    if (field.type === 'number') {
      parsedValue = rawValue === '' ? undefined : Number(rawValue);
    }

    if (field.storage === 'COLUMN') {
      if (field.key === 'color') next.color = rawValue;
      else if (field.key === 'ramGb') next.ramGb = parsedValue;
      else if (field.key === 'romGb') next.romGb = parsedValue;
      else if (field.key === 'connectionType') next.connectionType = rawValue;
      else (next as any)[field.key] = parsedValue;
    } else {
      next.attributes = {
        ...(next.attributes || {}),
        [field.key]: parsedValue
      };
    }

    onChange(next);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {schema.map((field) => {
        const value = getFieldValue(field);
        const inputId = `field-${field.key}`;

        return (
          <div key={field.key} className="space-y-1">
            <label htmlFor={inputId} className="text-[10px] font-bold text-slate-600 block">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
              {field.unit && <span className="text-slate-400 font-normal ml-0.5">({field.unit})</span>}
            </label>

            {field.type === 'select' && field.options && field.options.length > 0 ? (
              <select
                id={inputId}
                disabled={disabled}
                required={field.required}
                value={value}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- Chọn {field.label} --</option>
                {field.options.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {field.unit && typeof opt === 'number'
                      ? `${opt >= 1024 ? '1TB' : `${opt}${field.unit}`}`
                      : String(opt)}
                  </option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                id={inputId}
                type="number"
                disabled={disabled}
                required={field.required}
                value={value}
                placeholder={`Nhập ${field.label.toLowerCase()}...`}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            ) : (
              <input
                id={inputId}
                type="text"
                disabled={disabled}
                required={field.required}
                value={value}
                placeholder={`Nhập ${field.label.toLowerCase()}...`}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
