/**
 * @file ObjectFieldTemplate.jsx
 * @description Custom layout template for RJSF Object fields.
 * It overrides the default RJSF object rendering to provide a consistent 
 * grid-based layout using KendoReact-friendly CSS classes.
 */

import React from "react";

/**
 * ObjectFieldTemplate Component
 * @description Wraps RJSF object properties in a stylized fieldset and grid container.
 */
export const ObjectFieldTemplate = (props) => {
  const id = props.idSchema ? props.idSchema.$id : undefined;
  
  return (
    <fieldset id={id} style={{ border: 'none', padding: 0, margin: 0 }}>
      {/* Hide the default legend to use our custom header instead */}
      {props.title && <legend style={{ display: 'none' }}>{props.title}</legend>}
      
      {props.description && <p>{props.description}</p>}

      {/* !!! IMPORTANT: Grid Layout !!!
          Maps each property to a 'form-grid-item' div, which is styled as 100% width.
      */}
      <div className="form-grid-container">
        {props.properties.map((element) => (
          <div key={element.name} className="form-grid-item">
            {element.content}
          </div>
        ))}
      </div>
    </fieldset>
  );
};
