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
    const handleRefresh = () => {
        console.log("Refreshing REST list...");
        // In a real scenario, you could use a key to force re-mount or a ref to call internal refresh
        window.location.reload(); // Simple refresh for now to demonstrate it's called
    };

    const handleCreate = () => {
        console.log("Creating new REST item...");
        alert("Create button clicked!");
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>REST + Kendo ListView (Products)</h2>
            
            {/* Section: Centered List Container */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <AutoListView 
                    protocol="rest" 
                    resource="products" 
                    entityName="Product"
                    title="Product Catalog (REST)" 
                    onRefresh={handleRefresh}
                    onCreate={handleCreate}
                />
            </div>
        </div>
    );
};
