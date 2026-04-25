import React from "react";
import { Input, Checkbox, NumericTextBox } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Label } from "@progress/kendo-react-labels";

export const TextWidget = (props) => {
  const { id, value, required, readonly, disabled, label, onChange, placeholder } = props;
  const isReadOnly = readonly || disabled;
  
  return (
    <div className="k-form-field" style={{ marginBottom: '15px' }}>
      <Label editorId={id} className="k-label" style={{ display: 'block', marginBottom: '5px' }}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      <Input
        id={id}
        value={value || ""}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        onChange={(e) => onChange(e.value)}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export const SelectWidget = (props) => {
  const { id, value, required, readonly, disabled, label, onChange, options } = props;
  const { enumOptions } = options;

  return (
    <div className="k-form-field" style={{ marginBottom: '15px' }}>
      <Label editorId={id} className="k-label" style={{ display: 'block', marginBottom: '5px' }}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      <DropDownList
        id={id}
        data={enumOptions}
        textField="label"
        dataItemKey="value"
        value={enumOptions.find(opt => opt.value === value)}
        onChange={(e) => onChange(e.value.value)}
        disabled={disabled || readonly}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export const CheckboxWidget = (props) => {
  const { id, value, required, readonly, disabled, label, onChange } = props;

  return (
    <div className="k-form-field" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
      <Checkbox
        id={id}
        checked={!!value}
        disabled={disabled || readonly}
        onChange={(e) => onChange(e.value)}
      />
      <Label editorId={id} className="k-label" style={{ marginLeft: '10px' }}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
    </div>
  );
};

export const NumberWidget = (props) => {
    const { id, value, required, readonly, disabled, label, onChange } = props;
    
    return (
      <div className="k-form-field" style={{ marginBottom: '15px' }}>
        <Label editorId={id} className="k-label" style={{ display: 'block', marginBottom: '5px' }}>
          {label}{required && <span className="k-required">*</span>}
        </Label>
        <NumericTextBox
          id={id}
          value={value === "" || value === undefined || value === null ? null : window.Number(value)}
          required={required}
          readOnly={readonly}
          disabled={disabled}
          onChange={(e) => onChange(e.value)}
          style={{ width: '100%' }}
        />
      </div>
    );
};

export const widgets = {
  TextWidget,
  SelectWidget,
  CheckboxWidget,
  range: NumberWidget,
  integer: NumberWidget,
  number: NumberWidget
};
