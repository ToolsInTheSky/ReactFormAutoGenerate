import React from 'react';
import { connectField } from 'uniforms';
import { Input, Checkbox, NumericTextBox } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Label } from '@progress/kendo-react-labels';
import { Button } from '@progress/kendo-react-buttons';

const fieldStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  marginBottom: '15px' 
};

const labelStyle = { 
  width: '150px', 
  flexShrink: 0, 
  textAlign: 'right', 
  marginRight: '20px', 
  fontWeight: 'bold' 
};

const inputContainerStyle = { 
  flexGrow: 1 
};

const TextInput = ({ id, label, value, onChange, disabled, required, error, showInlineError }) => (
  <div style={fieldStyle}>
    <Label editorId={id} style={labelStyle}>
      {label}{required && <span className="k-required">*</span>}
    </Label>
    <div style={inputContainerStyle}>
      <Input
        id={id}
        value={value || ""}
        onChange={e => onChange(e.value)}
        disabled={disabled}
        style={{ width: '100%' }}
      />
      {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>}
    </div>
  </div>
);

const NumberInput = ({ id, label, value, onChange, disabled, required, error, showInlineError }) => (
  <div style={fieldStyle}>
    <Label editorId={id} style={labelStyle}>
      {label}{required && <span className="k-required">*</span>}
    </Label>
    <div style={inputContainerStyle}>
      <NumericTextBox
        id={id}
        value={value === "" || value === undefined ? null : window.Number(value)}
        onChange={e => onChange(e.value)}
        disabled={disabled}
        style={{ width: '100%' }}
      />
      {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>}
    </div>
  </div>
);

const SelectInput = ({ id, label, value, onChange, disabled, required, error, showInlineError, options }) => {
  const data = (options || []).map(opt => ({
    text: opt.label || opt.title || String(opt.const || opt.value || ""),
    value: opt.const !== undefined ? opt.const : opt.value
  }));
  
  const selectedValue = data.find(opt => opt.value === value);
  
  return (
    <div style={fieldStyle}>
      <Label editorId={id} style={labelStyle}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      <div style={inputContainerStyle}>
        <DropDownList
          id={id}
          data={data}
          textField="text"
          dataItemKey="value"
          value={selectedValue}
          onChange={e => onChange(e.value.value)}
          disabled={disabled}
          style={{ width: '100%' }}
        />
        {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>}
      </div>
    </div>
  );
};

const BoolInput = ({ id, label, value, onChange, disabled, required, error, showInlineError }) => (
  <div style={fieldStyle}>
    <div style={labelStyle}></div>
    <div style={{ ...inputContainerStyle, display: 'flex', alignItems: 'center' }}>
      <Checkbox
        id={id}
        checked={!!value}
        onChange={e => onChange(e.value)}
        disabled={disabled}
      />
      <Label editorId={id} style={{ marginLeft: '10px' }}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px', marginLeft: '10px' }}>{error.message}</div>}
    </div>
  </div>
);

export const TextField = connectField(TextInput);
export const NumberField = connectField(NumberInput);
export const SelectField = connectField(SelectInput);
export const BoolField = connectField(BoolInput);

export const SubmitField = ({ value, ...props }) => (
  <Button themeColor="primary" type="submit" {...props}>
    {value || 'Submit'}
  </Button>
);

export const ErrorsField = ({ error, children }) => 
  error ? <div style={{ color: 'red', marginLeft: '170px', marginBottom: '10px', fontSize: '14px' }}>{children || error.message}</div> : null;
