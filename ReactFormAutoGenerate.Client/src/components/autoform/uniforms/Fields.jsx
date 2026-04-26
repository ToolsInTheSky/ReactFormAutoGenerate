/**
 * @file Fields.jsx
 * @description Collection of custom KendoReact fields for Uniforms.
 * This file defines the visual mapping between Uniforms logical fields 
 * and KendoReact UI components, ensuring a professional look and feel.
 */

import React from 'react';
import { connectField } from 'uniforms';
import { Input, Checkbox, NumericTextBox, TextArea, Switch } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Label } from '@progress/kendo-react-labels';
import { Button } from '@progress/kendo-react-buttons';
import { DateTimePicker } from '@progress/kendo-react-dateinputs';

/**
 * Common layout styles for form rows.
 */
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

/**
 * TextInput Component
 * !!! IMPORTANT: Dynamic rendering between Input and TextArea based on name/length.
 */
const TextInput = ({ id, label, value, onChange, disabled, required, error, showInlineError, maxLength, name }) => {
  const isDescription = name.toLowerCase().includes("description") || (maxLength && maxLength >= 500);

  return (
    <div style={{ ...fieldStyle, alignItems: isDescription ? 'flex-start' : 'center' }}>
      <Label editorId={id} style={isDescription ? { ...labelStyle, marginTop: '8px' } : labelStyle}>
        {label}{required && <span className="k-required">*</span>}
      </Label>
      <div style={inputContainerStyle}>
        {isDescription ? (
          <TextArea
            id={id}
            value={value || ""}
            onChange={e => onChange(e.value)}
            disabled={disabled}
            autoSize={true}
            rows={3}
            style={{ width: '100%' }}
            maxLength={maxLength}
          />
        ) : (
          <Input
            id={id}
            value={value || ""}
            onChange={e => onChange(e.value)}
            disabled={disabled}
            style={{ width: '100%' }}
            maxLength={maxLength}
          />
        )}
        {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>}
      </div>
    </div>
  );
};

/**
 * NumberInput Component
 * Integration with Kendo NumericTextBox.
 */
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

/**
 * SelectInput Component
 * Integration with Kendo DropDownList.
 * !!! IMPORTANT: Implements ellipsis rendering for long lookup items.
 */
const SelectInput = ({ id, label, value, onChange, disabled, required, error, showInlineError, options }) => {
  const data = (options || []).map(opt => ({
    text: opt.label || opt.title || String(opt.const || opt.value || ""),
    value: opt.const !== undefined ? opt.const : opt.value
  }));
  
  const selectedValue = data.find(opt => opt.value === value);

  const itemRender = (li, itemProps) => {
    const itemChildren = (
      <span 
        title={itemProps.dataItem.text} 
        style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          display: 'block',
          width: '100%'
        }}
      >
        {itemProps.dataItem.text}
      </span>
    );
    return React.cloneElement(li, li.props, itemChildren);
  };
  
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
          itemRender={itemRender}
        />
        {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>}
      </div>
    </div>
  );
};

/**
 * BoolInput Component
 * Integration with Kendo Checkbox.
 */
const BoolInput = ({ id, label, value, onChange, disabled, required, error, showInlineError }) => (
  <div style={fieldStyle}>
    <Label editorId={id} style={labelStyle}>
      {label}{required && <span className="k-required">*</span>}
    </Label>
    <div style={{ ...inputContainerStyle, display: 'flex', alignItems: 'center' }}>
      <Switch
        id={id}
        checked={!!value}
        onChange={e => onChange(e.value)}
        disabled={disabled}
        onLabel="Yes"
        offLabel="No"
      />
      {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px', marginLeft: '10px' }}>{error.message}</div>}
    </div>
  </div>
);

/**
 * DateInput Component
 * Integration with Kendo DateTimePicker.
 */
const DateInput = ({ id, label, value, onChange, disabled, required, error, showInlineError }) => (
  <div style={fieldStyle}>
    <Label editorId={id} style={labelStyle}>
      {label}{required && <span className="k-required">*</span>}
    </Label>
    <div style={inputContainerStyle}>
      <DateTimePicker
        id={id}
        value={value ? new Date(value) : null}
        onChange={e => onChange(e.value?.toISOString())}
        disabled={disabled}
        style={{ width: '100%' }}
      />
      {showInlineError && error && <div className="k-form-error" style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>}
    </div>
  </div>
);

/**
 * !!! IMPORTANT: Uniforms Field Mapping !!!
 * Uses connectField to inject Uniforms logic into the Kendo components.
 */
export const TextField = connectField(TextInput);
export const NumberField = connectField(NumberInput);
export const SelectField = connectField(SelectInput);
export const BoolField = connectField(BoolInput);
export const DateField = connectField(DateInput);

/**
 * SubmitField Component
 * A stylized Kendo Button that triggers form submission.
 */
export const SubmitField = ({ value, ...props }) => (
  <Button themeColor="primary" type="submit" {...props}>
    {value || 'Submit'}
  </Button>
);

/**
 * ErrorsField Component
 * Displays schema validation summary at the bottom of the form.
 */
export const ErrorsField = ({ error, children }) => 
  error ? <div style={{ color: 'red', marginLeft: '110px', marginBottom: '10px', fontSize: '14px' }}>{children || error.message}</div> : null;
