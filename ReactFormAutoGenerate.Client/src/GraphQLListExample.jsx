/**
 * @file GraphQLListExample.jsx
 * @description Example page showcasing the implementation of a paginated product list 
 * using the GraphQL protocol and the KendoReact ListView component.
 */

import React from 'react';
import AutoListView from './components/autolist/AutoListView';

/**
 * GraphQLListExample Component
 * @description Renders a centralized product list view integrated with a GraphQL backend.
 */
export const GraphQLListExample = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>GraphQL + Kendo ListView (Products)</h2>
            
            {/* Section: Centered List Container */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <AutoListView 
                    protocol="graphql" 
                    entityName="Product" 
                    title="Product Catalog (GraphQL)" 
                />
            </div>
        </div>
    );
};
