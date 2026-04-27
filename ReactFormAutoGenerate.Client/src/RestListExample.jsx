/**
 * @file RestListExample.jsx
 * @description Example page showcasing the implementation of a paginated product list 
 * using the REST protocol and the KendoReact ListView component.
 */

import React from 'react';
import AutoListView from './components/autolist/AutoListView';

/**
 * RestListExample Component
 * @description Renders a centralized product list view integrated with a RESTful backend.
 */
export const RestListExample = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>REST + Kendo ListView (Products)</h2>
            
            {/* Section: Centered List Container */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <AutoListView 
                    protocol="rest" 
                    resource="products" 
                    title="Product Catalog (REST)" 
                />
            </div>
        </div>
    );
};
