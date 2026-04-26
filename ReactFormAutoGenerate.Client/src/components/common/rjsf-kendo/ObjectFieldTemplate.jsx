import React from "react";

export const ObjectFieldTemplate = (props) => {
  const id = props.idSchema ? props.idSchema.$id : undefined;
  
  return (
    <fieldset id={id} style={{ border: 'none', padding: 0, margin: 0 }}>
      {props.title && <legend style={{ display: 'none' }}>{props.title}</legend>}
      {props.description && <p>{props.description}</p>}
      <div className="form-grid-container">
        {props.properties.map((element) => (
          <div 
            key={element.name} 
            className="form-grid-item"
          >
            {element.content}
          </div>
        ))}
      </div>
    </fieldset>
  );
};
