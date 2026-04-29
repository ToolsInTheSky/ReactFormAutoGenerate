/**
 * @file Widgets.jsx
 * @description Collection of custom KendoReact widgets for RJSF.
 * These widgets replace the standard HTML inputs used by RJSF with
 * professional-grade KendoReact components, ensuring consistent styling
 * and advanced functionality (e.g., date pickers, numeric boxes).
 */

import { DateTimePicker } from "@progress/kendo-react-dateinputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import {
	Checkbox,
	Input,
	NumericTextBox,
	Switch,
	TextArea,
} from "@progress/kendo-react-inputs";
import { Label } from "@progress/kendo-react-labels";
import React from "react";

/**
 * Common layout styles for all widgets to ensure horizontal alignment.
 */
const fieldStyle = {
	display: "flex",
	alignItems: "center",
	marginBottom: "15px",
};

const labelStyle = {
	width: "100px",
	flexShrink: 0,
	textAlign: "left",
	marginRight: "10px",
	fontWeight: "bold",
};

const inputContainerStyle = {
	flexGrow: 1,
	width: "1px",
	minWidth: 0,
};

/**
 * TextWidget: Handles string inputs.
 * !!! IMPORTANT: Auto-switches between Input and TextArea based on field metadata.
 */
export const TextWidget = (props) => {
	const {
		id,
		value,
		required,
		readonly,
		disabled,
		label,
		onChange,
		placeholder,
		schema,
	} = props;
	const isDescription =
		id.toLowerCase().includes("description") ||
		(schema.maxLength && schema.maxLength >= 500);

	return (
		<div
			style={{
				...fieldStyle,
				alignItems: isDescription ? "flex-start" : "center",
			}}
		>
			<Label
				editorId={id}
				style={isDescription ? { ...labelStyle, marginTop: "8px" } : labelStyle}
			>
				{label}
				{required && <span className="k-required">*</span>}
			</Label>
			<div style={inputContainerStyle}>
				{isDescription ? (
					<TextArea
						id={id}
						value={value || ""}
						readOnly={readonly}
						disabled={disabled}
						onChange={(e) => onChange(e.value)}
						placeholder={placeholder}
						autoSize={true}
						rows={3}
						style={{ width: "100%" }}
						maxLength={schema.maxLength}
					/>
				) : (
					<Input
						id={id}
						value={value || ""}
						required={required}
						readOnly={readonly}
						disabled={disabled}
						onChange={(e) => onChange(e.value)}
						placeholder={placeholder}
						style={{ width: "100%" }}
						maxLength={schema.maxLength}
					/>
				)}
			</div>
		</div>
	);
};

/**
 * DateTimeWidget: Integration with Kendo DateTimePicker.
 */
export const DateTimeWidget = (props) => {
	const { id, value, required, readonly, disabled, label, onChange } = props;

	// Check for C# min date or empty values
	const isInvalidDate = !value || value.startsWith("0001-01-01");
	const dateValue = isInvalidDate ? null : new Date(value);

	return (
		<div style={fieldStyle}>
			<Label editorId={id} style={labelStyle}>
				{label}
				{required && <span className="k-required">*</span>}
			</Label>
			<div style={inputContainerStyle}>
				<DateTimePicker
					id={id}
					value={dateValue}
					disabled={disabled || readonly}
					onChange={(e) => onChange(e.value?.toISOString())}
					style={{ width: "100%" }}
					format="yyyy-MM-dd HH:mm:ss"
					formatPlaceholder={{
						year: "yyyy",
						month: "MM",
						day: "dd",
						hour: "HH",
						minute: "mm",
						second: "ss",
					}}
				/>
			</div>
		</div>
	);
};

/**
 * SelectWidget: Integration with Kendo DropDownList.
 * !!! IMPORTANT: Implements ellipsis rendering for long lookup items.
 */
export const SelectWidget = (props) => {
	const { id, value, required, readonly, disabled, label, onChange, options } =
		props;
	const { enumOptions } = options;

	const itemRender = (li, itemProps) => {
		const itemChildren = (
			<span
				title={itemProps.dataItem.label}
				style={{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					display: "block",
					width: "100%",
				}}
			>
				{itemProps.dataItem.label}
			</span>
		);
		return React.cloneElement(li, li.props, itemChildren);
	};

	return (
		<div style={fieldStyle}>
			<Label editorId={id} style={labelStyle}>
				{label}
				{required && <span className="k-required">*</span>}
			</Label>
			<div style={inputContainerStyle}>
				<DropDownList
					id={id}
					data={enumOptions}
					textField="label"
					dataItemKey="value"
					value={enumOptions.find((opt) => opt.value === value)}
					onChange={(e) => onChange(e.value.value)}
					disabled={disabled || readonly}
					style={{ width: "100%" }}
					itemRender={itemRender}
				/>
			</div>
		</div>
	);
};

/**
 * CheckboxWidget: Handles boolean inputs.
 */
export const CheckboxWidget = (props) => {
	const { id, value, required, readonly, disabled, label, onChange } = props;

	return (
		<div style={fieldStyle}>
			<div style={labelStyle}>
				<Label editorId={id}>
					{label}
					{required && <span className="k-required">*</span>}
				</Label>
			</div>
			<div
				style={{
					...inputContainerStyle,
					display: "flex",
					alignItems: "center",
				}}
			>
				<Switch
					id={id}
					checked={!!value}
					disabled={disabled || readonly}
					onChange={(e) => onChange(e.value)}
					onLabel="Yes"
					offLabel="No"
				/>
			</div>
		</div>
	);
};

/**
 * NumberWidget: Integration with Kendo NumericTextBox.
 * Ensures numerical types are preserved during data flow.
 */
export const NumberWidget = (props) => {
	const { id, value, required, readonly, disabled, label, onChange } = props;

	return (
		<div style={fieldStyle}>
			<Label editorId={id} style={labelStyle}>
				{label}
				{required && <span className="k-required">*</span>}
			</Label>
			<div style={inputContainerStyle}>
				<NumericTextBox
					id={id}
					value={
						value === "" || value === undefined || value === null
							? null
							: window.Number(value)
					}
					required={required}
					readOnly={readonly}
					disabled={disabled}
					onChange={(e) => onChange(e.value)}
					style={{ width: "100%" }}
				/>
			</div>
		</div>
	);
};

/**
 * !!! IMPORTANT: Widget Registry !!!
 * Maps JSON Schema types/formats to the corresponding Kendo widgets.
 */
export const widgets = {
	TextWidget,
	SelectWidget,
	CheckboxWidget,
	DateTimeWidget,
	"date-time": DateTimeWidget,
	range: NumberWidget,
	integer: NumberWidget,
	number: NumberWidget,
};
