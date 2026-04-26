import React from "react";
import { Input, Checkbox, NumericTextBox } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Label } from "@progress/kendo-react-labels";

const fieldStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  marginBottom: '15px' 
};

const labelStyle = { 
  width: '100px', 
  flexShrink: 0, 
  textAlign: 'left', 
  marginRight: '10px', 
  fontWeight: 'bold' 
};

const inputContainerStyle = { 
  flexGrow: 1 
};

export const TextWidget = (props) => {
  const { id, value, required, readonly, disabled, label, onChange, placeholder, schema } = props;
  
  return (
    <div style={fieldStyle}>
      <Label editorId={id} style={labelStyle}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      <div style={inputContainerStyle}>
        <Input
          id={id}
          value={value || ""}
          required={required}
          readOnly={readonly}
          disabled={disabled}
          onChange={(e) => onChange(e.value)}
          placeholder={placeholder}
          style={{ width: '100%' }}
          maxLength={schema.maxLength} // 스키마의 maxLength 전달
        />
      </div>
    </div>
  );
};

export const SelectWidget = (props) => {
  const { id, value, required, readonly, disabled, label, onChange, options } = props;
  const { enumOptions } = options;

  return (
    <div style={fieldStyle}>
      <Label editorId={id} style={labelStyle}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      <div style={inputContainerStyle}>
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
    </div>
  );
};

export const CheckboxWidget = (props) => {
  const { id, value, required, readonly, disabled, label, onChange } = props;

  return (
    <div style={fieldStyle}>
      <div style={labelStyle}></div>
      <div style={{ ...inputContainerStyle, display: 'flex', alignItems: 'center' }}>
        <Checkbox
          id={id}
          checked={!!value}
          disabled={disabled || readonly}
          onChange={(e) => onChange(e.value)}
        />
        <Label editorId={id} style={{ marginLeft: '10px' }}>
          {label}{required && <span className="k-required">*</span>}
        </Label>
      </div>
    </div>
  );
};

export const NumberWidget = (props) => {
    const { id, value, required, readonly, disabled, label, onChange } = props;
    
    return (
      <div style={fieldStyle}>
        <Label editorId={id} style={labelStyle}>
          {label}{required && <span className="k-required">*</span>}
        </Label>
        <div style={inputContainerStyle}>
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
